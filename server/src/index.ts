import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import crypto from 'crypto';
import { ClientToServerEvents, ServerToClientEvents, Room } from '../../shared/types';
import { RoomManager } from './rooms/roomManager';

const app = express();

// Serve static files from the React build
const publicPath = process.env.PUBLIC_DIR || path.join(__dirname, '../public');
app.use(express.static(publicPath));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Helper to create player-specific room view for versus mode.
// Always strips the solution so clients can never read it.
function getRoomForPlayer(room: Room, playerId: string): Room {
  let view = room;
  if (room.mode === 'versus' && room.playerBoards) {
    // Send the player their own board in gameState.board
    const playerBoard = room.playerBoards[playerId];
    if (playerBoard) {
      view = {
        ...room,
        gameState: {
          ...room.gameState,
          board: playerBoard
        },
        // Don't send other players' boards
        playerBoards: undefined
      };
    }
  }
  // Never leak the solution to clients
  return {
    ...view,
    gameState: { ...view.gameState, solution: [] }
  };
}

// Send each player their own sanitized view of the room
function broadcastRoom(room: Room) {
  room.players.forEach(player => {
    io.to(player.id).emit('roomUpdated', getRoomForPlayer(room, player.id));
  });
}

// Input validation helpers
function isValidIndex(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < 9;
}

function isValidValue(v: unknown): v is number | null {
  return v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 9);
}

function isValidNote(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;
}

function sanitizeName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 24);
}

const ROOM_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRoomId(): string {
  let roomId: string;
  do {
    const bytes = crypto.randomBytes(6);
    roomId = Array.from(bytes, b => ROOM_ID_ALPHABET[b % ROOM_ID_ALPHABET.length]).join('');
  } while (roomManager.hasRoom(roomId));
  return roomId;
}

// Remove the socket from its current room (if any) and notify the remaining players
function leaveCurrentRoom(socket: GameSocket) {
  const result = roomManager.leaveRoom(socket.id);
  if (!result) return;

  socket.leave(result.roomId);
  if (result.room) {
    broadcastRoom(result.room);
    if (result.gameWon) {
      const winnerScores = result.room.players.map(p => ({ name: p.name, score: p.score }));
      io.to(result.room.id).emit('gameWon', winnerScores);
    }
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (playerName, difficulty, mode) => {
    const name = sanitizeName(playerName);
    if (!name) {
      socket.emit('error', 'Invalid player name');
      return;
    }
    if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
      socket.emit('error', 'Invalid difficulty');
      return;
    }
    if (mode !== 'coop' && mode !== 'versus') {
      socket.emit('error', 'Invalid game mode');
      return;
    }

    leaveCurrentRoom(socket);

    const roomId = generateRoomId();
    const room = roomManager.createRoom(roomId, name, difficulty, mode, socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdated', getRoomForPlayer(room, socket.id));
  });

  socket.on('joinRoom', (roomId, playerName) => {
    const name = sanitizeName(playerName);
    if (!name) {
      socket.emit('error', 'Invalid player name');
      return;
    }
    if (typeof roomId !== 'string') {
      socket.emit('error', 'Room not found or full');
      return;
    }

    const currentRoom = roomManager.getRoomByPlayerId(socket.id);
    if (currentRoom && currentRoom.id === roomId) {
      socket.emit('error', 'Already in this room');
      return;
    }

    leaveCurrentRoom(socket);

    const room = roomManager.joinRoom(roomId, name, socket.id);
    if (room) {
      socket.join(roomId);
      // Send each player their own view of the room
      broadcastRoom(room);
    } else {
      socket.emit('error', 'Room not found or full');
    }
  });

  socket.on('makeMove', (row, col, value) => {
    if (!isValidIndex(row) || !isValidIndex(col) || !isValidValue(value)) return;

    const result = roomManager.makeMove(socket.id, row, col, value);
    if (result) {
      const { room, wrongMove } = result;

      // Notify player of wrong move
      if (wrongMove !== undefined) {
        socket.emit('wrongMove', wrongMove);
      }

      // Send each player their own view
      broadcastRoom(room);

      if (room.gameState.isComplete) {
        const winnerScores = room.players.map(p => ({ name: p.name, score: p.score }));
        io.to(room.id).emit('gameWon', winnerScores);
      }
    }
  });

  socket.on('toggleNote', (row, col, note) => {
    if (!isValidIndex(row) || !isValidIndex(col) || !isValidNote(note)) return;

    const room = roomManager.toggleNote(socket.id, row, col, note);
    if (room) {
      // In versus, only update the player who made the change
      if (room.mode === 'versus') {
        socket.emit('roomUpdated', getRoomForPlayer(room, socket.id));
      } else {
        broadcastRoom(room);
      }
    }
  });

  socket.on('useHint', (row, col) => {
    if (!isValidIndex(row) || !isValidIndex(col)) return;

    const room = roomManager.useHint(socket.id, row, col);
    if (room) {
      broadcastRoom(room);
    }
  });

  socket.on('sendMessage', (text) => {
    if (typeof text !== 'string') return;
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;

    const room = roomManager.getRoomByPlayerId(socket.id);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const message = {
          id: Math.random().toString(36).substring(7),
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          text: trimmed,
          timestamp: Date.now()
        };
        io.to(room.id).emit('messageReceived', message);
      }
    }
  });

  socket.on('updateCursor', (cursor) => {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (room && room.mode === 'coop') {
      // Only share cursors in coop mode
      socket.to(room.id).emit('cursorUpdated', socket.id, cursor);
    }
  });

  socket.on('undo', () => {
    const room = roomManager.undo(socket.id);
    if (room) {
      broadcastRoom(room);
    }
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// SPA catch-all: serve index.html for all non-API routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
