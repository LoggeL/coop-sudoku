import { Room, Player, GameState, Difficulty, Cell } from '../../../shared/types';
import { SudokuEngine } from '../game/sudoku';

interface MoveHistory {
  playerId: string;
  row: number;
  col: number;
  previousValue: number | null;
  previousIsCorrect: boolean | undefined;
  previousNotes: number[];
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
  } // roomId -> history stack

  createRoom(roomId: string, playerName: string, difficulty: Difficulty, playerId: string): Room {
    const { board: initialBoard, solution } = SudokuEngine.generate(difficulty);
    
    const board: Cell[][] = initialBoard.map((row, r) =>
      row.map((val, c) => ({
        value: val === 0 ? null : val,
        initial: val !== 0,
        notes: [],
        isCorrect: val !== 0 ? true : undefined
      }))
    );

    const player: Player = {
      id: playerId,
      name: playerName,
      color: this.getRandomColor(),
      score: 0
    };

    const room: Room = {
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
      score: 0
    };

    room.players.push(player);
    this.playerRoomMap.set(playerId, roomId);
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

    if (room.players.length === 0) {
      // In a real app, we might wait 5 mins, but here we'll just delete
      this.rooms.delete(roomId);
      return { roomId, room: null };
    }

    return { roomId, room };
  }

  getRoomByPlayerId(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  makeMove(playerId: string, row: number, col: number, value: number | null): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    const cell = room.gameState.board[row][col];
    if (cell.initial) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

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
      // Keep max 50 moves in history
      if (history.length > 50) history.shift();
    }

    if (value === null) {
      cell.value = null;
      cell.isCorrect = undefined;
      cell.lastModifiedBy = playerId;
    } else {
      const isCorrect = room.gameState.solution[row][col] === value;
      cell.value = value;
      cell.isCorrect = isCorrect;
      cell.lastModifiedBy = playerId;

      if (isCorrect) {
        player.score += 10;
      } else {
        player.score = Math.max(0, player.score - 5);
      }
    }

    room.gameState.isComplete = this.checkWin(room.gameState);
    this.updateRoomActivity(room.id);
    return room;
  }

  toggleNote(playerId: string, row: number, col: number, note: number): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

    const cell = room.gameState.board[row][col];
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

    room.gameState.isComplete = this.checkWin(room.gameState);
    return room;
  }

  undo(playerId: string): Room | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || room.gameState.isComplete) return null;

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

  private checkWin(gameState: GameState): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (gameState.board[r][c].value !== gameState.solution[r][c]) {
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
}
