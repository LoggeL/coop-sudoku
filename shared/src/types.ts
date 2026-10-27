export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'coop' | 'versus';

export interface Position {
  row: number;
  col: number;
}

/** A cell as the client sees it. Wrong digits are never placed, so every value is correct. */
export interface CellView {
  value: number | null;
  given: boolean;
  notes: number[];
  /** Player id that filled this cell (coop) */
  by?: string;
  /** Versus: an opponent filled this cell before you */
  claimed?: boolean;
}

export interface PlayerView {
  id: string;
  name: string;
  color: string;
  score: number;
  connected: boolean;
  /** Versus: player completed their own board */
  finished: boolean;
  /** Share of the puzzle's empty cells this player filled, 0..1 (own board in versus, contribution in coop) */
  progress: number;
  /** Coop: the cell this player has selected */
  cursor: Position | null;
}

export interface RoomView {
  code: string;
  mode: GameMode;
  difficulty: Difficulty;
  /** Increments with every new puzzle in the same room */
  round: number;
  board: CellView[][];
  players: PlayerView[];
  /** The id of the player receiving this view */
  you: string;
  startedAt: number;
  finishedAt: number | null;
  /** Whether you have something to undo */
  canUndo: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  name: string;
  color: string;
  text: string;
  at: number;
  /** System messages (joins, leaves, new rounds) */
  system?: boolean;
}

export interface Standing {
  playerId: string;
  name: string;
  color: string;
  score: number;
}
