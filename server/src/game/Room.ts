import { randomUUID } from 'node:crypto';
import {
  MAX_PLAYERS,
  PLAYER_COLORS,
  SCORING,
  type ChatMessage,
  type Difficulty,
  type GameMode,
  type Position,
  type RoomView,
  type Standing,
} from '@coop-sudoku/shared';
import { generatePuzzle, type Grid, type Rng } from './sudoku.ts';

interface Cell {
  value: number | null;
  given: boolean;
  notes: number[];
  by?: string;
}

export interface Player {
  id: string;
  session: string;
  name: string;
  color: string;
  score: number;
  connected: boolean;
  disconnectedAt: number | null;
  finished: boolean;
  cursor: Position | null;
}

/** Note state of a cell before one of the player's note edits */
interface NoteEdit {
  index: number;
  notes: number[];
}

export type MoveOutcome =
  | { kind: 'ignored' }
  | { kind: 'wrong'; penalty: number }
  | { kind: 'placed'; index: number; gameOver: boolean };

const CHAT_HISTORY = 100;
const UNDO_HISTORY = 100;

const indexOf = ({ row, col }: Position) => row * 9 + col;

/** Indices of all cells sharing a row, column or box with `index` (including itself) */
const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  const br = r - (r % 3), bc = c - (c % 3);
  const peers = new Set<number>();
  for (let k = 0; k < 9; k++) {
    peers.add(r * 9 + k);
    peers.add(k * 9 + c);
    peers.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  }
  return [...peers];
});

export class Room {
  readonly code: string;
  readonly mode: GameMode;
  difficulty: Difficulty;
  round = 0;
  startedAt = 0;
  finishedAt: number | null = null;
  lastActivity = Date.now();
  readonly chat: ChatMessage[] = [];

  private readonly players = new Map<string, Player>();
  private readonly rng: Rng;
  private solution: Grid = [];
  private puzzle: Grid = [];
  private holes = 0;
  /** Coop: the one shared board. Versus: one board per player. */
  private shared: Cell[] = [];
  private readonly boards = new Map<string, Cell[]>();
  /** Versus: cell index → id of the player who solved it first */
  private readonly firstSolver = new Map<number, string>();
  /** Coop: cells that already paid out points (prevents farming via hints) */
  private readonly scored = new Set<number>();
  private readonly undoStacks = new Map<string, NoteEdit[]>();

  constructor(code: string, mode: GameMode, difficulty: Difficulty, rng: Rng = Math.random) {
    this.code = code;
    this.mode = mode;
    this.difficulty = difficulty;
    this.rng = rng;
    this.startRound(difficulty);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  startRound(difficulty: Difficulty) {
    const { puzzle, solution } = generatePuzzle(difficulty, this.rng);
    this.difficulty = difficulty;
    this.puzzle = puzzle;
    this.solution = solution;
    this.holes = puzzle.filter((v) => v === 0).length;
    this.round++;
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.firstSolver.clear();
    this.scored.clear();
    this.undoStacks.clear();
    this.boards.clear();
    this.shared = this.freshBoard();

    for (const player of this.players.values()) {
      player.score = 0;
      player.finished = false;
      player.cursor = null;
      if (this.mode === 'versus') this.boards.set(player.id, this.freshBoard());
    }
    this.touch();
  }

  get isOver() {
    return this.finishedAt !== null;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // ── Players ───────────────────────────────────────────────────────────────

  get playerList(): Player[] {
    return [...this.players.values()];
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  addPlayer(session: string, name: string): Player | { error: string } {
    if (this.players.size >= MAX_PLAYERS) return { error: 'This room is full' };

    const used = new Set(this.playerList.map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
    const player: Player = {
      id: randomUUID().slice(0, 8),
      session,
      name,
      color,
      score: 0,
      connected: true,
      disconnectedAt: null,
      finished: false,
      cursor: null,
    };
    this.players.set(player.id, player);
    if (this.mode === 'versus') this.boards.set(player.id, this.freshBoard());
    this.touch();
    return player;
  }

  /** Returns true if removing the player ended a versus round */
  removePlayer(id: string): boolean {
    this.players.delete(id);
    this.boards.delete(id);
    this.undoStacks.delete(id);
    this.touch();
    return this.checkVersusOver();
  }

  /** Returns true if the change ended a versus round */
  setConnected(id: string, connected: boolean): boolean {
    const player = this.players.get(id);
    if (!player) return false;
    player.connected = connected;
    player.disconnectedAt = connected ? null : Date.now();
    if (!connected) player.cursor = null;
    return connected ? false : this.checkVersusOver();
  }

  setCursor(id: string, cursor: Position | null) {
    const player = this.players.get(id);
    if (player) player.cursor = cursor;
  }

  // ── Moves ─────────────────────────────────────────────────────────────────

  setValue(playerId: string, pos: Position, value: number): MoveOutcome {
    const player = this.players.get(playerId);
    const board = this.boardFor(playerId);
    if (!player || !board || this.isOver || player.finished) return { kind: 'ignored' };

    const index = indexOf(pos);
    const cell = board[index];
    // Placed digits are always correct, so a filled cell is final
    if (cell.given || cell.value !== null) return { kind: 'ignored' };

    this.touch();
    if (this.solution[index] !== value) {
      const penalty = this.mode === 'coop' ? SCORING.coop.wrong : SCORING.versus.wrong;
      player.score = Math.max(0, player.score + penalty);
      return { kind: 'wrong', penalty };
    }

    this.fill(board, index, playerId);
    if (this.mode === 'coop') {
      if (!this.scored.has(index)) {
        this.scored.add(index);
        player.score += SCORING.coop.correct;
      }
    } else if (this.firstSolver.has(index)) {
      player.score += SCORING.versus.second;
    } else {
      this.firstSolver.set(index, playerId);
      player.score += SCORING.versus.first;
    }

    return { kind: 'placed', index, gameOver: this.checkComplete(playerId) };
  }

  /** Coop only: reveals `pos` if it's empty, otherwise a random empty cell */
  hint(playerId: string, pos: Position | null): MoveOutcome {
    const player = this.players.get(playerId);
    if (this.mode !== 'coop' || !player || this.isOver) return { kind: 'ignored' };

    let index = pos ? indexOf(pos) : -1;
    if (index < 0 || this.shared[index].value !== null) {
      const empty = this.shared.flatMap((cell, i) => (cell.value === null ? [i] : []));
      if (empty.length === 0) return { kind: 'ignored' };
      index = empty[Math.floor(this.rng() * empty.length)];
    }

    this.fill(this.shared, index, playerId);
    this.scored.add(index);
    player.score = Math.max(0, player.score + SCORING.coop.hint);
    this.touch();
    return { kind: 'placed', index, gameOver: this.checkComplete(playerId) };
  }

  toggleNote(playerId: string, pos: Position, digit: number): boolean {
    const cell = this.editableCell(playerId, pos);
    if (!cell) return false;
    this.pushUndo(playerId, indexOf(pos), cell.notes);
    cell.notes = cell.notes.includes(digit)
      ? cell.notes.filter((n) => n !== digit)
      : [...cell.notes, digit].sort((a, b) => a - b);
    this.touch();
    return true;
  }

  erase(playerId: string, pos: Position): boolean {
    const cell = this.editableCell(playerId, pos);
    if (!cell || cell.notes.length === 0) return false;
    this.pushUndo(playerId, indexOf(pos), cell.notes);
    cell.notes = [];
    this.touch();
    return true;
  }

  /** Reverts the player's most recent note edit on a cell that is still empty */
  undo(playerId: string): boolean {
    const stack = this.undoStacks.get(playerId);
    const board = this.boardFor(playerId);
    if (!stack || !board || this.isOver) return false;

    while (stack.length > 0) {
      const edit = stack.pop()!;
      const cell = board[edit.index];
      if (cell.value === null) {
        cell.notes = edit.notes;
        this.touch();
        return true;
      }
    }
    return false;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  addChat(player: Player | null, text: string): ChatMessage {
    const message: ChatMessage = {
      id: randomUUID(),
      playerId: player?.id ?? null,
      name: player?.name ?? '',
      color: player?.color ?? '',
      text,
      at: Date.now(),
      ...(player ? {} : { system: true }),
    };
    this.chat.push(message);
    if (this.chat.length > CHAT_HISTORY) this.chat.shift();
    this.touch();
    return message;
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  view(forPlayerId: string): RoomView {
    const board = this.boardFor(forPlayerId) ?? this.shared;
    const rows: RoomView['board'] = [];
    for (let r = 0; r < 9; r++) {
      rows.push(
        board.slice(r * 9, r * 9 + 9).map((cell, c) => {
          const index = r * 9 + c;
          const solver = this.firstSolver.get(index);
          return {
            value: cell.value,
            given: cell.given,
            notes: cell.notes,
            ...(cell.by ? { by: cell.by } : {}),
            ...(this.mode === 'versus' && solver && solver !== forPlayerId ? { claimed: true } : {}),
          };
        }),
      );
    }

    return {
      code: this.code,
      mode: this.mode,
      difficulty: this.difficulty,
      round: this.round,
      board: rows,
      you: forPlayerId,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      canUndo: this.canUndo(forPlayerId),
      players: this.playerList.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: p.score,
        connected: p.connected,
        finished: p.finished,
        progress: this.progressOf(p.id),
        cursor: this.mode === 'coop' ? p.cursor : null,
      })),
    };
  }

  standings(): Standing[] {
    return this.playerList
      .map(({ id, name, color, score }) => ({ playerId: id, name, color, score }))
      .sort((a, b) => b.score - a.score);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private freshBoard(): Cell[] {
    return this.puzzle.map((v) => ({ value: v || null, given: v !== 0, notes: [] }));
  }

  private boardFor(playerId: string): Cell[] | undefined {
    if (this.mode === 'coop') return this.players.has(playerId) ? this.shared : undefined;
    return this.boards.get(playerId);
  }

  private editableCell(playerId: string, pos: Position): Cell | null {
    const board = this.boardFor(playerId);
    if (!board || this.isOver) return null;
    const cell = board[indexOf(pos)];
    return cell.given || cell.value !== null ? null : cell;
  }

  private fill(board: Cell[], index: number, playerId: string) {
    const value = this.solution[index];
    board[index] = { value, given: false, notes: [], by: playerId };
    for (const peer of PEERS[index]) {
      const notes = board[peer].notes;
      if (notes.includes(value)) board[peer].notes = notes.filter((n) => n !== value);
    }
  }

  private pushUndo(playerId: string, index: number, notes: number[]) {
    let stack = this.undoStacks.get(playerId);
    if (!stack) this.undoStacks.set(playerId, (stack = []));
    stack.push({ index, notes });
    if (stack.length > UNDO_HISTORY) stack.shift();
  }

  private canUndo(playerId: string): boolean {
    const board = this.boardFor(playerId);
    const stack = this.undoStacks.get(playerId);
    return !this.isOver && !!board && !!stack && stack.some((e) => board[e.index].value === null);
  }

  private progressOf(playerId: string): number {
    if (this.holes === 0) return 1;
    const board = this.boardFor(playerId) ?? this.shared;
    let filled = 0;
    for (const cell of board) if (cell.by === playerId) filled++;
    return filled / this.holes;
  }

  /** Returns true if this move ended the round */
  private checkComplete(playerId: string): boolean {
    const board = this.boardFor(playerId);
    if (!board || board.some((c) => c.value === null)) return false;

    if (this.mode === 'coop') {
      this.finishedAt = Date.now();
      return true;
    }
    this.players.get(playerId)!.finished = true;
    return this.checkVersusOver();
  }

  /** Versus ends once every connected player has finished their board */
  private checkVersusOver(): boolean {
    if (this.mode !== 'versus' || this.isOver) return false;
    const active = this.playerList.filter((p) => p.connected);
    if (active.length === 0 || !active.every((p) => p.finished)) return false;
    this.finishedAt = Date.now();
    return true;
  }
}
