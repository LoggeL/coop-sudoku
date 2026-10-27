import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { Ack, AckResult, ClientToServerEvents, ServerToClientEvents } from '@coop-sudoku/shared';
import type { MoveOutcome, Player, Room } from './game/Room.ts';
import type { RoomStore } from './game/RoomStore.ts';
import { asChatText, asName, asPosition, asRoomCode, isDifficulty, isDigit, isMode } from './validate.ts';

interface SocketData {
  session: string;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const roomChannel = (room: Room) => `room:${room.code}`;
const playerChannel = (player: Player) => `player:${player.id}`;

/** Wraps an optional client callback so a missing or bogus ack never crashes a handler */
function reply<T>(ack: unknown, result: AckResult<T>) {
  if (typeof ack === 'function') (ack as Ack<T>)(result);
}

/** Simple sliding-window limiter, one per socket and action */
function rateLimiter(limit: number, windowMs: number) {
  let stamps: number[] = [];
  return () => {
    const now = Date.now();
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= limit) return false;
    stamps.push(now);
    return true;
  };
}

export function registerSocketHandlers(io: GameServer, store: RoomStore) {
  /** Every player gets their own view (versus boards are private) */
  const broadcast = (room: Room) => {
    for (const player of room.playerList) {
      io.to(playerChannel(player)).emit('state', room.view(player.id));
    }
  };

  const sendTo = (room: Room, player: Player) => {
    io.to(playerChannel(player)).emit('state', room.view(player.id));
  };

  const announce = (room: Room, text: string) => {
    io.to(roomChannel(room)).emit('chat', room.addChat(null, text));
  };

  const endRound = (room: Room) => {
    io.to(roomChannel(room)).emit('gameOver', room.standings());
  };

  io.use((socket, next) => {
    const session = (socket.handshake.auth as { session?: unknown })?.session;
    socket.data.session =
      typeof session === 'string' && /^[\w-]{16,64}$/.test(session) ? session : randomUUID();
    next();
  });

  io.on('connection', (socket: GameSocket) => {
    const { session } = socket.data;
    const canChat = rateLimiter(6, 5_000);
    const canMove = rateLimiter(30, 1_000);

    const attach = (room: Room, player: Player) => {
      socket.join([roomChannel(room), playerChannel(player)]);
      room.setConnected(player.id, true);
      socket.emit('chatHistory', room.chat);
      broadcast(room);
    };

    const leave = () => {
      const left = store.leave(session);
      if (!left) return;
      const { room, player, gameOver } = left;
      socket.leave(roomChannel(room));
      socket.leave(playerChannel(player));
      if (room.playerList.length === 0) return;
      announce(room, `${player.name} left`);
      broadcast(room);
      if (gameOver) endRound(room);
    };

    /** Resolves the caller's seat for in-game actions */
    const seat = () => (canMove() ? store.locate(session) : null);

    /** Values and scores are visible to everyone (claimed cells and progress in versus) */
    const afterMove = (room: Room, outcome: MoveOutcome) => {
      if (outcome.kind === 'ignored') return;
      broadcast(room);
      if (outcome.kind === 'placed' && outcome.gameOver) endRound(room);
    };

    /** Note edits are private in versus, shared in coop */
    const afterNoteEdit = (room: Room, player: Player) => {
      if (room.mode === 'versus') sendTo(room, player);
      else broadcast(room);
    };

    socket.on('resume', (ack) => {
      const found = store.locate(session);
      if (found) attach(found.room, found.player);
      reply(ack, { ok: true, data: found ? { code: found.room.code } : null });
    });

    socket.on('createRoom', (request, ack) => {
      const name = asName(request?.name);
      if (!name) return reply(ack, { ok: false, error: 'Please pick a nickname' });
      if (!isDifficulty(request?.difficulty) || !isMode(request?.mode)) {
        return reply(ack, { ok: false, error: 'Invalid game settings' });
      }

      leave();
      const room = store.create(request.mode, request.difficulty);
      const player = room.addPlayer(session, name);
      if ('error' in player) return reply(ack, { ok: false, error: player.error });

      store.seat(session, room, player);
      room.addChat(null, `${name} created the room`);
      attach(room, player);
      reply(ack, { ok: true, data: { code: room.code } });
    });

    socket.on('joinRoom', (request, ack) => {
      const name = asName(request?.name);
      const code = asRoomCode(request?.code);
      if (!name) return reply(ack, { ok: false, error: 'Please pick a nickname' });
      if (!code) return reply(ack, { ok: false, error: 'Room codes have 6 characters' });

      const room = store.get(code);
      if (!room) return reply(ack, { ok: false, error: `Room ${code} doesn't exist (anymore)` });

      const current = store.locate(session);
      if (current?.room === room) {
        attach(room, current.player);
        return reply(ack, { ok: true, data: { code } });
      }

      const player = room.addPlayer(session, name);
      if ('error' in player) return reply(ack, { ok: false, error: player.error });

      leave();
      store.seat(session, room, player);
      announce(room, `${name} joined`);
      attach(room, player);
      reply(ack, { ok: true, data: { code } });
    });

    socket.on('leaveRoom', leave);

    socket.on('newGame', (difficulty) => {
      const found = seat();
      if (!found || !isDifficulty(difficulty) || !found.room.isOver) return;
      found.room.startRound(difficulty);
      announce(found.room, `${found.player.name} started a new ${difficulty} round`);
      broadcast(found.room);
    });

    socket.on('setValue', (position, value) => {
      const pos = asPosition(position);
      const found = seat();
      if (!found || !pos || !isDigit(value)) return;
      const outcome = found.room.setValue(found.player.id, pos, value);
      if (outcome.kind === 'wrong') socket.emit('wrongMove', pos, outcome.penalty);
      afterMove(found.room, outcome);
    });

    socket.on('hint', (position) => {
      const found = seat();
      if (!found) return;
      afterMove(found.room, found.room.hint(found.player.id, asPosition(position)));
    });

    socket.on('toggleNote', (position, digit) => {
      const pos = asPosition(position);
      const found = seat();
      if (!found || !pos || !isDigit(digit)) return;
      if (found.room.toggleNote(found.player.id, pos, digit)) afterNoteEdit(found.room, found.player);
    });

    socket.on('erase', (position) => {
      const pos = asPosition(position);
      const found = seat();
      if (!found || !pos) return;
      if (found.room.erase(found.player.id, pos)) afterNoteEdit(found.room, found.player);
    });

    socket.on('undo', () => {
      const found = seat();
      if (!found) return;
      if (found.room.undo(found.player.id)) afterNoteEdit(found.room, found.player);
    });

    socket.on('chat', (input) => {
      const text = asChatText(input);
      const found = store.locate(session);
      if (!text || !found || !canChat()) return;
      io.to(roomChannel(found.room)).emit('chat', found.room.addChat(found.player, text));
    });

    socket.on('cursor', (position) => {
      const found = store.locate(session);
      if (!found || found.room.mode !== 'coop') return;
      const pos = position === null ? null : asPosition(position);
      found.room.setCursor(found.player.id, pos);
      socket.to(roomChannel(found.room)).emit('cursor', found.player.id, pos);
    });

    socket.on('disconnect', () => {
      const found = store.locate(session);
      if (!found) return;
      // Another tab/socket of the same session may still be connected
      if (io.sockets.adapter.rooms.get(playerChannel(found.player))?.size) return;

      const gameOver = found.room.setConnected(found.player.id, false);
      socket.to(roomChannel(found.room)).emit('cursor', found.player.id, null);
      broadcast(found.room);
      if (gameOver) endRound(found.room);
    });
  });

  /** Periodically frees seats of players who never came back */
  return function sweep() {
    for (const { room, removed, gameOver } of store.sweep()) {
      for (const player of removed) announce(room, `${player.name} left`);
      broadcast(room);
      if (gameOver) endRound(room);
    }
  };
}
