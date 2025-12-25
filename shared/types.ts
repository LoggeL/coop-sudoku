export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'coop' | 'versus';

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  cursor?: { x: number; y: number };
  finished?: boolean; // For versus mode: player completed their board
}

export interface Cell {
  value: number | null;
  initial: boolean;
  notes: number[];
  lastModifiedBy?: string;
  isCorrect?: boolean;
}

export interface GameState {
  board: Cell[][];
  solution: number[][];
  difficulty: Difficulty;
  isComplete: boolean;
  startTime: number;
}

export interface Room {
  id: string;
  mode: GameMode;
  players: Player[];
  gameState: GameState;
  // Versus mode specific
  playerBoards?: Record<string, Cell[][]>;  // playerId -> their board
  claimedCells?: Record<string, string>;     // "row-col" -> playerId who claimed first
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

export interface ServerToClientEvents {
  roomUpdated: (room: Room) => void;
  messageReceived: (message: ChatMessage) => void;
  gameWon: (winnerScores: { name: string; score: number }[]) => void;
  error: (message: string) => void;
  cursorUpdated: (playerId: string, cursor: { x: number; y: number } | undefined) => void;
  wrongMove: (points: number) => void; // Notify player of wrong move penalty
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, difficulty: Difficulty, mode: GameMode) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  makeMove: (row: number, col: number, value: number | null) => void;
  toggleNote: (row: number, col: number, note: number) => void;
  useHint: (row: number, col: number) => void;
  sendMessage: (text: string) => void;
  updateCursor: (cursor: { x: number; y: number } | undefined) => void;
  undo: () => void;
}
