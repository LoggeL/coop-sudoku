import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, HandshakeAuth, ServerToClientEvents } from '@coop-sudoku/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** crypto.randomUUID only exists in secure contexts (https/localhost), not on plain-http LAN hosts */
function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Per-tab session token: survives reloads (so you keep your seat and score)
 * while separate tabs still count as separate players.
 */
function sessionToken(): string {
  const key = 'coop-sudoku:session';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const token = randomToken();
    sessionStorage.setItem(key, token);
    return token;
  } catch {
    return randomToken();
  }
}

const auth: HandshakeAuth = { session: sessionToken() };

export const socket: GameSocket = io({ autoConnect: false, auth });
