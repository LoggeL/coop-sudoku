import { randomBytes } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type Difficulty, type GameMode } from '@coop-sudoku/shared';
import { Room, type Player } from './Room.ts';

/** How long a disconnected player keeps their seat (reload, flaky mobile network, …) */
export const RECONNECT_GRACE_MS = 2 * 60 * 1000;
/** Rooms nobody interacted with for this long are dropped, connected or not */
export const ROOM_IDLE_MS = 6 * 60 * 60 * 1000;

export interface SweepResult {
  room: Room;
  removed: Player[];
  gameOver: boolean;
}

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  /** session token → seat */
  private readonly seats = new Map<string, { code: string; playerId: string }>();

  get size() {
    return this.rooms.size;
  }

  create(mode: GameMode, difficulty: Difficulty): Room {
    let code: string;
    do {
      // Alphabet has 32 symbols, so `byte % 32` is unbiased
      code = Array.from(randomBytes(ROOM_CODE_LENGTH), (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
    } while (this.rooms.has(code));

    const room = new Room(code, mode, difficulty);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  seat(session: string, room: Room, player: Player) {
    this.seats.set(session, { code: room.code, playerId: player.id });
  }

  /** Finds the room and player a session currently occupies */
  locate(session: string): { room: Room; player: Player } | null {
    const seat = this.seats.get(session);
    if (!seat) return null;
    const room = this.rooms.get(seat.code);
    const player = room?.getPlayer(seat.playerId);
    if (!room || !player) {
      this.seats.delete(session);
      return null;
    }
    return { room, player };
  }

  /** Removes the player; drops the room once it's empty. Returns true if a versus round ended. */
  leave(session: string): { room: Room; player: Player; gameOver: boolean } | null {
    const found = this.locate(session);
    if (!found) return null;
    this.seats.delete(session);
    const gameOver = found.room.removePlayer(found.player.id);
    if (found.room.playerList.length === 0) this.rooms.delete(found.room.code);
    return { ...found, gameOver };
  }

  /** Expires players whose grace period ran out and drops empty or abandoned rooms */
  sweep(now = Date.now()): SweepResult[] {
    const results: SweepResult[] = [];

    for (const room of this.rooms.values()) {
      if (now - room.lastActivity > ROOM_IDLE_MS) {
        this.drop(room);
        continue;
      }

      const expired = room.playerList.filter(
        (p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt > RECONNECT_GRACE_MS,
      );
      if (expired.length === 0) continue;

      let gameOver = false;
      for (const player of expired) {
        this.seats.delete(player.session);
        gameOver = room.removePlayer(player.id) || gameOver;
      }

      if (room.playerList.length === 0) this.drop(room);
      else results.push({ room, removed: expired, gameOver });
    }

    return results;
  }

  private drop(room: Room) {
    for (const player of room.playerList) this.seats.delete(player.session);
    this.rooms.delete(room.code);
  }
}
