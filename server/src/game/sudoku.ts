import type { Difficulty } from '@coop-sudoku/shared';

/** Flat 81-cell grid, row-major, 0 = empty */
export type Grid = number[];
export type Rng = () => number;

const ALL_DIGITS = 0b11_1111_1110; // bits 1..9

/** Number of cells to clear per difficulty. Hard may end up with fewer if uniqueness forbids more. */
const HOLES: Record<Difficulty, number> = { easy: 40, medium: 48, hard: 56 };

const rowOf = (i: number) => Math.floor(i / 9);
const colOf = (i: number) => i % 9;
const boxOfIndex = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

function bitCount(n: number): number {
  let count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Backtracking solver with bitmasks and most-constrained-cell ordering.
 * Stops after `limit` solutions. Pass `rng` to explore digits in random order.
 */
export function solve(grid: Grid, limit = 2, rng?: Rng): { count: number; solution: Grid | null } {
  const g = grid.slice();
  const rows = new Array<number>(9).fill(0);
  const cols = new Array<number>(9).fill(0);
  const boxes = new Array<number>(9).fill(0);

  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v;
    const r = rowOf(i), c = colOf(i), b = boxOfIndex(i);
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return { count: 0, solution: null };
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  let count = 0;
  let solution: Grid | null = null;

  const search = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL_DIGITS & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOfIndex(i)]);
      const n = bitCount(mask);
      if (n === 0) return false;
      if (n < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = n;
        if (n === 1) break;
      }
    }

    if (best === -1) {
      count++;
      solution ??= g.slice();
      return count >= limit;
    }

    let digits: number[] = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rng) digits = shuffle(digits, rng);

    const r = rowOf(best), c = colOf(best), b = boxOfIndex(best);
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (search()) return true;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }
    g[best] = 0;
    return false;
  };

  search();
  return { count, solution };
}

export function isValidSolution(grid: Grid): boolean {
  return grid.length === 81 && grid.every((v) => v >= 1 && v <= 9) && solve(grid, 1).count === 1;
}

/** Generates a puzzle with exactly one solution */
export function generatePuzzle(difficulty: Difficulty, rng: Rng = Math.random): { puzzle: Grid; solution: Grid } {
  const { solution } = solve(new Array(81).fill(0), 1, rng);
  if (!solution) throw new Error('Failed to generate a solved grid');

  const puzzle = solution.slice();
  const target = HOLES[difficulty];
  let removed = 0;

  for (const i of shuffle([...Array(81).keys()], rng)) {
    if (removed >= target) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (solve(puzzle, 2).count === 1) removed++;
    else puzzle[i] = backup;
  }

  return { puzzle, solution };
}
