import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents, Difficulty, GameMode, Room } from '../../shared/types';
import { RoomManager } from './rooms/roomManager';

const app = express();

// Serve static files from the React build
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

// Helper to create player-specific room view for versus mode
function getRoomForPlayer(room: Room, playerId: string): Room {
  if (room.mode === 'versus' && room.playerBoards) {
    // Send the player their own board in gameState.board
    const playerBoard = room.playerBoards[playerId];
    if (playerBoard) {
      return {
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
  return room;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (playerName, difficulty, mode) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = roomManager.createRoom(roomId, playerName, difficulty, mode, socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdated', getRoomForPlayer(room, socket.id));
  });

  socket.on('joinRoom', (roomId, playerName) => {
    const room = roomManager.joinRoom(roomId, playerName, socket.id);
    if (room) {
      socket.join(roomId);
      // Send each player their own view of the room
      room.players.forEach(player => {
        io.to(player.id).emit('roomUpdated', getRoomForPlayer(room, player.id));
      });
    } else {
      socket.emit('error', 'Room not found or full');
    }
  });

  socket.on('makeMove', (row, col, value) => {
    const result = roomManager.makeMove(socket.id, row, col, value);
    if (result) {
      const { room, wrongMove } = result;
      
      // Notify player of wrong move
      if (wrongMove !== undefined) {
        socket.emit('wrongMove', wrongMove);
      }
      
      // Send each player their own view
      room.players.forEach(player => {
        io.to(player.id).emit('roomUpdated', getRoomForPlayer(room, player.id));
      });
      
      if (room.gameState.isComplete) {
        const winnerScores = room.players.map(p => ({ name: p.name, score: p.score }));
        io.to(room.id).emit('gameWon', winnerScores);
      }
    }
  });

  socket.on('toggleNote', (row, col, note) => {
    const room = roomManager.toggleNote(socket.id, row, col, note);
    if (room) {
      // In versus, only update the player who made the change
      if (room.mode === 'versus') {
        socket.emit('roomUpdated', getRoomForPlayer(room, socket.id));
      } else {
        io.to(room.id).emit('roomUpdated', room);
      }
    }
  });

  socket.on('useHint', (row, col) => {
    const room = roomManager.useHint(socket.id, row, col);
    if (room) {
      io.to(room.id).emit('roomUpdated', room);
    }
  });

  socket.on('sendMessage', (text) => {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const message = {
          id: Math.random().toString(36).substring(7),
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          text,
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
      io.to(room.id).emit('roomUpdated', room);
    }
  });

  socket.on('disconnect', () => {
    const result = roomManager.leaveRoom(socket.id);
    if (result) {
      const { roomId, room } = result;
      if (room) {
        room.players.forEach(player => {
          io.to(player.id).emit('roomUpdated', getRoomForPlayer(room, player.id));
        });
      }
    }
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
