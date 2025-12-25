"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const roomManager_1 = require("./rooms/roomManager");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const roomManager = new roomManager_1.RoomManager();
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('createRoom', (playerName, difficulty) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = roomManager.createRoom(roomId, playerName, difficulty, socket.id);
        socket.join(roomId);
        io.to(roomId).emit('roomUpdated', room);
    });
    socket.on('joinRoom', (roomId, playerName) => {
        const room = roomManager.joinRoom(roomId, playerName, socket.id);
        if (room) {
            socket.join(roomId);
            io.to(roomId).emit('roomUpdated', room);
        }
        else {
            socket.emit('error', 'Room not found or full');
        }
    });
    socket.on('makeMove', (row, col, value) => {
        const room = roomManager.makeMove(socket.id, row, col, value);
        if (room) {
            io.to(room.id).emit('roomUpdated', room);
            if (room.gameState.isComplete) {
                const winnerScores = room.players.map(p => ({ name: p.name, score: p.score }));
                io.to(room.id).emit('gameWon', winnerScores);
            }
        }
    });
    socket.on('toggleNote', (row, col, note) => {
        const room = roomManager.toggleNote(socket.id, row, col, note);
        if (room) {
            io.to(room.id).emit('roomUpdated', room);
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
        if (room) {
            socket.to(room.id).emit('cursorUpdated', socket.id, cursor);
        }
    });
    socket.on('disconnect', () => {
        const result = roomManager.leaveRoom(socket.id);
        if (result) {
            const { roomId, room } = result;
            if (room) {
                io.to(roomId).emit('roomUpdated', room);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
