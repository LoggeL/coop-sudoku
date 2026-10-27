import type { Difficulty, GameMode } from './types.ts';

export const MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
export const NAME_MAX_LENGTH = 20;
export const CHAT_MAX_LENGTH = 300;

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const MODES: GameMode[] = ['coop', 'versus'];

export const SCORING = {
  coop: { correct: 10, wrong: -5, hint: -15 },
  versus: { first: 100, second: 50, wrong: -250 },
} as const;

export const PLAYER_COLORS = ['#f43f5e', '#38bdf8', '#a3e635', '#fbbf24', '#c084fc', '#2dd4bf'];

export const boxOf = (row: number, col: number) => Math.floor(row / 3) * 3 + Math.floor(col / 3);

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}
