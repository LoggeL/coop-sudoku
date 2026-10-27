import { describe, expect, it } from 'vitest';
import { generatePuzzle, isValidSolution, solve } from '../src/game/sudoku.ts';

describe('sudoku engine', () => {
  it.each(['easy', 'medium', 'hard'] as const)('generates a unique %s puzzle', (difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty);

    expect(isValidSolution(solution)).toBe(true);
    puzzle.forEach((v, i) => {
      if (v !== 0) expect(v).toBe(solution[i]);
    });

    const result = solve(puzzle, 2);
    expect(result.count).toBe(1);
    expect(result.solution).toEqual(solution);
  });

  it('gets harder with difficulty', () => {
    const holes = (d: 'easy' | 'hard') => generatePuzzle(d).puzzle.filter((v) => v === 0).length;
    expect(holes('hard')).toBeGreaterThan(holes('easy'));
  });

  it('detects contradictory grids', () => {
    const grid = new Array(81).fill(0);
    grid[0] = 5;
    grid[1] = 5;
    expect(solve(grid).count).toBe(0);
  });
});
