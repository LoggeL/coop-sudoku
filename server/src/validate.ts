import {
  CHAT_MAX_LENGTH,
  DIFFICULTIES,
  MODES,
  NAME_MAX_LENGTH,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  type Difficulty,
  type GameMode,
  type Position,
} from '@coop-sudoku/shared';

const isIndex = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 9;

export const isDigit = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;

export function asPosition(input: unknown): Position | null {
  if (typeof input !== 'object' || input === null) return null;
  const { row, col } = input as Record<string, unknown>;
  return isIndex(row) && isIndex(col) ? { row, col } : null;
}

export const isDifficulty = (d: unknown): d is Difficulty => DIFFICULTIES.includes(d as Difficulty);
export const isMode = (m: unknown): m is GameMode => MODES.includes(m as GameMode);

/** Collapses whitespace and strips control characters */
function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const text = input.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return text || null;
}

export const asName = (input: unknown) => cleanText(input, NAME_MAX_LENGTH);
export const asChatText = (input: unknown) => cleanText(input, CHAT_MAX_LENGTH);

export function asRoomCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = normalizeRoomCode(input);
  return code.length === ROOM_CODE_LENGTH ? code : null;
}
