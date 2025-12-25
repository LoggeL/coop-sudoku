import { Room, Player, GameState, Difficulty, Cell, GameMode } from '../../../shared/types';
import { SudokuEngine } from '../game/sudoku';

interface MoveHistory {
  playerId: string;
  row: number;
  col: number;
  previousValue: number | null;
  previousIsCorrect: boolean | undefined;
  previousNotes: number[];
}

export interface MoveResult {
  room: Room;
  wrongMove?: number; // penalty points if wrong move
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  private moveHistory: Map<string, MoveHistory[]> = new Map();
  private roomLastActivity: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Check for inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupInactiveRooms(), 5 * 60 * 1000);
  }

  private cleanupInactiveRooms() {
    const now = Date.now();
    const maxInactivity = 30 * 60 * 1000; // 30 minutes
    
    for (const [roomId, lastActivity] of this.roomLastActivity) {
      if (now - lastActivity > maxInactivity) {
        const room = this.rooms.get(roomId);
        if (room) {
          // Remove all players from the room
          for (const player of room.players) {
            this.playerRoomMap.delete(player.id);
          }
        }
        this.rooms.delete(roomId);
        this.moveHistory.delete(roomId);
        this.roomLastActivity.delete(roomId);
        console.log(`Cleaned up inactive room: ${roomId}`);
      }
    }
  }

  private updateRoomActivity(roomId: string) {
    this.roomLastActivity.set(roomId, Date.now());
  }

  private createEmptyBoard(initialBoard: number[][]): Cell[][] {
    return initialBoard.map((row) =>
      row.map((val) => ({
        value: val === 0 ? null : val,
        initial: val !== 0,
        notes: [],
        isCorrect: val !== 0 ? true : undefined
      }))
    );
  }

  createRoom(roomId: string, playerName: string, difficulty: Difficulty, mode: GameMode, playerId: string): Room {
    const { board: initialBoard, solution } = SudokuEngine.generate(difficulty);
    
    const board: Cell[][] = this.createEmptyBoard(initialBoard);

    const player: Player = {
      id: playerId,
      name: playerName,
      color: this.getRandomColor(),
      score: 0,
      finished: false
    };

    const room: Room = {
      id: roomId,
      mode,
      players: [player],
      gameState: {
        board,
        solution,
        difficulty,
        isComplete: false,
        startTime: Date.now()
      }
    };

    // For versus mode, initialize per-player boards and claimed cells
    if (mode === 'versus') {
      room.playerBoards = {
        [playerId]: this.createEmptyBoard(initialBoard)
      };
      room.claimedCells = {};
    }

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(playerId, roomId);
    this.moveHistory.set(roomId, []);
    this.updateRoomActivity(roomId);
    return room;
  }

  joinRoom(roomId: string, playerName: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= 4) return null;

    const player: Player = {
      id: playerId,
      name: playerName,
      color: this.getRandomColor(),
      score: 0,
      finished: false
    };

    room.players.push(player);
    this.playerRoomMap.set(playerId, roomId);

    // For versus mode, create a board copy for the new player
    if (room.mode === 'versus' && room.playerBoards) {
      const { board: initialBoard } = SudokuEngine.generate(room.gameState.difficulty);
      // Use the same puzzle (solution) - recreate from the stored solution
      room.playerBoards[playerId] = room.gameState.board.map((row, r) =>
        row.map((cell, c) => ({
          value: cell.initial ? cell.value : null,
          initial: cell.initial,
          notes: [],
          isCorrect: cell.initial ? true : undefined
        }))
      );
    }

    this.updateRoomActivity(roomId);
    return room;
  }

  leaveRoom(playerId: string): { roomId: string; room: Room | null } | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);

    // Clean up player's board in versus mode
    if (room.mode === 'versus' && room.playerBoards) {
      delete room.playerBoards[playerId];
    }

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { roomId, room: null };
    }

    return { roomId, room };
  }

  getRoomByPlayerId(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  makeMove(playerId: string, row: number, col: number, value: number | null): MoveResult | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    // Player already finished in versus mode
    if (room.mode === 'versus' && player.finished) return null;

    if (room.mode === 'versus') {
      return this.makeMoveVersus(room, player, playerId, row, col, value);
    } else {
      return this.makeMoveCoop(room, player, playerId, row, col, value);
    }
  }

  private makeMoveCoop(room: Room, player: Player, playerId: string, row: number, col: number, value: number | null): MoveResult | null {
    const cell = room.gameState.board[row][col];
    if (cell.initial) return null;

    // Record history before making changes
    const history = this.moveHistory.get(room.id);
    if (history) {
      history.push({
        playerId,
        row,
        col,
        previousValue: cell.value,
        previousIsCorrect: cell.isCorrect,
        previousNotes: [...cell.notes]
      });
      if (history.length > 50) history.shift();
    }

    if (value === null) {
      cell.value = null;
      cell.isCorrect = undefined;
      cell.lastModifiedBy = playerId;
      cell.notes = [];
      room.gameState.isComplete = this.checkWin(room.gameState.board, room.gameState.solution);
      this.updateRoomActivity(room.id);
      return { room };
    }

    const isCorrect = room.gameState.solution[row][col] === value;
    
    if (!isCorrect) {
      // Wrong move - don't place, just penalize
      player.score = Math.max(0, player.score - 5);
      this.updateRoomActivity(room.id);
      return { room, wrongMove: 5 };
    }

    // Correct move
    cell.value = value;
    cell.isCorrect = true;
    cell.lastModifiedBy = playerId;
    cell.notes = [];
    player.score += 10;
    this.clearNotesForNumber(room.gameState.board, row, col, value);

    room.gameState.isComplete = this.checkWin(room.gameState.board, room.gameState.solution);
    this.updateRoomActivity(room.id);
    return { room };
  }

  private makeMoveVersus(room: Room, player: Player, playerId: string, row: number, col: number, value: number | null): MoveResult | null {
    if (!room.playerBoards || !room.claimedCells) return null;

    const playerBoard = room.playerBoards[playerId];
    if (!playerBoard) return null;

    const cell = playerBoard[row][col];
    if (cell.initial) return null;
    if (cell.value !== null) return null; // Cell already filled in versus

    if (value === null) {
      // No clearing in versus mode - cells stay once filled correctly
      return { room };
    }

    const isCorrect = room.gameState.solution[row][col] === value;
    
    if (!isCorrect) {
      // Wrong move - don't place, just penalize
      player.score = Math.max(0, player.score - 250);
      this.updateRoomActivity(room.id);
      return { room, wrongMove: 250 };
    }

    // Correct move - place it
    cell.value = value;
    cell.isCorrect = true;
    cell.lastModifiedBy = playerId;
    cell.notes = [];
    this.clearNotesForNumber(playerBoard, row, col, value);

    // Check if this cell was already claimed
    const cellKey = `${row}-${col}`;
    if (room.claimedCells[cellKey]) {
      // Someone else claimed it first
      player.score += 50;
    } else {
      // First to claim!
      player.score += 100;
      room.claimedCells[cellKey] = playerId;
    }

    // Check if this player finished their board
    if (this.checkWin(playerBoard, room.gameState.solution)) {
      player.finished = true;
    }

    // Check if all players finished
    const allFinished = room.players.every(p => p.finished);
    if (allFinished) {
      room.gameState.isComplete = true;
    }

    this.updateRoomActivity(room.id);
    return { room };
  }

  toggleNote(playerId: string, row: number, col: number, note: number): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    // Get the appropriate board based on mode
    let board: Cell[][];
    if (room.mode === 'versus') {
      if (!room.playerBoards || !room.playerBoards[playerId]) return null;
      board = room.playerBoards[playerId];
    } else {
      board = room.gameState.board;
    }

    const cell = board[row][col];
    if (cell.initial || cell.value !== null) return null;

    const index = cell.notes.indexOf(note);
    if (index === -1) {
      cell.notes.push(note);
    } else {
      cell.notes.splice(index, 1);
    }

    return room;
  }

  useHint(playerId: string, row: number, col: number): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    // No hints in versus mode
    if (room.mode === 'versus') return null;

    const cell = room.gameState.board[row][col];
    if (cell.initial || cell.value === room.gameState.solution[row][col]) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    // Record history before hint
    const history = this.moveHistory.get(room.id);
    if (history) {
      history.push({
        playerId,
        row,
        col,
        previousValue: cell.value,
        previousIsCorrect: cell.isCorrect,
        previousNotes: [...cell.notes]
      });
    }

    cell.value = room.gameState.solution[row][col];
    cell.isCorrect = true;
    cell.lastModifiedBy = playerId;
    cell.notes = [];

    player.score = Math.max(0, player.score - 15);

    // Clear notes for this number
    this.clearNotesForNumber(room.gameState.board, row, col, cell.value!);

    room.gameState.isComplete = this.checkWin(room.gameState.board, room.gameState.solution);
    return room;
  }

  undo(playerId: string): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    // No undo in versus mode
    if (room.mode === 'versus') return null;

    const history = this.moveHistory.get(room.id);
    if (!history || history.length === 0) return null;

    // Only allow undoing your own moves
    const lastMove = [...history].reverse().find(m => m.playerId === playerId);
    if (!lastMove) return null;

    // Remove from history
    const index = history.lastIndexOf(lastMove);
    if (index > -1) history.splice(index, 1);

    const cell = room.gameState.board[lastMove.row][lastMove.col];
    if (cell.initial) return null;

    // Restore previous state
    cell.value = lastMove.previousValue;
    cell.isCorrect = lastMove.previousIsCorrect;
    cell.notes = lastMove.previousNotes;
    cell.lastModifiedBy = playerId;

    return room;
  }

  private clearNotesForNumber(board: Cell[][], row: number, col: number, value: number): void {
    // Clear from same row
    for (let c = 0; c < 9; c++) {
      const idx = board[row][c].notes.indexOf(value);
      if (idx !== -1) board[row][c].notes.splice(idx, 1);
    }
    // Clear from same column
    for (let r = 0; r < 9; r++) {
      const idx = board[r][col].notes.indexOf(value);
      if (idx !== -1) board[r][col].notes.splice(idx, 1);
    }
    // Clear from same 3x3 block
    const blockRowStart = Math.floor(row / 3) * 3;
    const blockColStart = Math.floor(col / 3) * 3;
    for (let r = blockRowStart; r < blockRowStart + 3; r++) {
      for (let c = blockColStart; c < blockColStart + 3; c++) {
        const idx = board[r][c].notes.indexOf(value);
        if (idx !== -1) board[r][c].notes.splice(idx, 1);
      }
    }
  }

  private checkWin(board: Cell[][], solution: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c].value !== solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  private getRandomColor(): string {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Helper to get the board for a specific player (for sending to client)
  getPlayerBoard(playerId: string): Cell[][] | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;

    if (room.mode === 'versus' && room.playerBoards) {
      return room.playerBoards[playerId] || null;
    }
    return room.gameState.board;
  }
}
