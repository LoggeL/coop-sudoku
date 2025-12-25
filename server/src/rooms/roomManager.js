"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const sudoku_1 = require("../game/sudoku");
class RoomManager {
    rooms = new Map();
    playerRoomMap = new Map();
    createRoom(roomId, playerName, difficulty, playerId) {
        const { board: initialBoard, solution } = sudoku_1.SudokuEngine.generate(difficulty);
        const board = initialBoard.map((row, r) => row.map((val, c) => ({
            value: val === 0 ? null : val,
            initial: val !== 0,
            notes: [],
            isCorrect: val !== 0 ? true : undefined
        })));
        const player = {
            id: playerId,
            name: playerName,
            color: this.getRandomColor(),
            score: 0
        };
        const room = {
            id: roomId,
            players: [player],
            gameState: {
                board,
                solution,
                difficulty,
                isComplete: false,
                startTime: Date.now()
            }
        };
        this.rooms.set(roomId, room);
        this.playerRoomMap.set(playerId, roomId);
        return room;
    }
    joinRoom(roomId, playerName, playerId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length >= 4)
            return null;
        const player = {
            id: playerId,
            name: playerName,
            color: this.getRandomColor(),
            score: 0
        };
        room.players.push(player);
        this.playerRoomMap.set(playerId, roomId);
        return room;
    }
    leaveRoom(playerId) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId)
            return null;
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        room.players = room.players.filter(p => p.id !== playerId);
        this.playerRoomMap.delete(playerId);
        if (room.players.length === 0) {
            // In a real app, we might wait 5 mins, but here we'll just delete
            this.rooms.delete(roomId);
            return { roomId, room: null };
        }
        return { roomId, room };
    }
    getRoomByPlayerId(playerId) {
        const roomId = this.playerRoomMap.get(playerId);
        return roomId ? this.rooms.get(roomId) || null : null;
    }
    makeMove(playerId, row, col, value) {
        const room = this.getRoomByPlayerId(playerId);
        if (!room || room.gameState.isComplete)
            return null;
        const cell = room.gameState.board[row][col];
        if (cell.initial)
            return null;
        const player = room.players.find(p => p.id === playerId);
        if (!player)
            return null;
        if (value === null) {
            cell.value = null;
            cell.isCorrect = undefined;
            cell.lastModifiedBy = playerId;
        }
        else {
            const isCorrect = room.gameState.solution[row][col] === value;
            cell.value = value;
            cell.isCorrect = isCorrect;
            cell.lastModifiedBy = playerId;
            if (isCorrect) {
                player.score += 10;
            }
            else {
                player.score = Math.max(0, player.score - 5);
            }
        }
        room.gameState.isComplete = this.checkWin(room.gameState);
        return room;
    }
    toggleNote(playerId, row, col, note) {
        const room = this.getRoomByPlayerId(playerId);
        if (!room || room.gameState.isComplete)
            return null;
        const cell = room.gameState.board[row][col];
        if (cell.initial || cell.value !== null)
            return null;
        const index = cell.notes.indexOf(note);
        if (index === -1) {
            cell.notes.push(note);
        }
        else {
            cell.notes.splice(index, 1);
        }
        return room;
    }
    useHint(playerId, row, col) {
        const room = this.getRoomByPlayerId(playerId);
        if (!room || room.gameState.isComplete)
            return null;
        const cell = room.gameState.board[row][col];
        if (cell.initial || cell.value === room.gameState.solution[row][col])
            return null;
        const player = room.players.find(p => p.id === playerId);
        if (!player)
            return null;
        cell.value = room.gameState.solution[row][col];
        cell.isCorrect = true;
        cell.lastModifiedBy = playerId;
        cell.notes = [];
        player.score = Math.max(0, player.score - 15);
        room.gameState.isComplete = this.checkWin(room.gameState);
        return room;
    }
    checkWin(gameState) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (gameState.board[r][c].value !== gameState.solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }
    getRandomColor() {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
exports.RoomManager = RoomManager;
