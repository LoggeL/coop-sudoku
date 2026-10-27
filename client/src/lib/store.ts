import { create } from 'zustand';
import confetti from 'canvas-confetti';
import type { ChatMessage, Difficulty, GameMode, Position, RoomView } from '@coop-sudoku/shared';
import { socket } from './socket.ts';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export interface Toast {
  id: number;
  tone: 'error' | 'penalty' | 'info';
  text: string;
}

interface GameState {
  status: ConnectionStatus;
  /** False until the first resume attempt finished, so we don't flash the lobby on reload */
  ready: boolean;
  busy: boolean;
  room: RoomView | null;
  chat: ChatMessage[];
  chatOpen: boolean;
  unread: number;
  selected: Position | null;
  noteMode: boolean;
  /** Bumps on every wrong move so the board can replay its shake animation */
  shake: { pos: Position; key: number } | null;
  /** Round whose results dialog the player closed */
  dismissedRound: number | null;
  toasts: Toast[];
}

export const useGame = create<GameState>(() => ({
  status: 'connecting',
  ready: false,
  busy: false,
  room: null,
  chat: [],
  chatOpen: false,
  unread: 0,
  selected: null,
  noteMode: false,
  shake: null,
  dismissedRound: null,
  toasts: [],
}));

const { getState: get, setState: set } = useGame;

// ── URL sync ──────────────────────────────────────────────────────────────

export const roomCodeFromUrl = () => new URLSearchParams(location.search).get('room') ?? '';

function syncUrl(code: string | null) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  if (url.href !== location.href) history.replaceState(null, '', url);
}

export const inviteLink = (code: string) => `${location.origin}/?room=${code}`;

// ── Toasts ────────────────────────────────────────────────────────────────

let toastId = 0;
export function toast(tone: Toast['tone'], text: string, ms = 2600) {
  const id = ++toastId;
  set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, text }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
}

// ── Connection ────────────────────────────────────────────────────────────

function resetRoom() {
  set({ room: null, chat: [], unread: 0, selected: null, noteMode: false, shake: null, dismissedRound: null });
  syncUrl(null);
}

function celebrate() {
  const colors = ['#f43f5e', '#fb923c', '#fbbf24', '#a3e635', '#38bdf8'];
  const fire = (x: number, angle: number) =>
    confetti({ particleCount: 80, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.75 }, colors });
  fire(0.15, 60);
  fire(0.85, 120);
}

export function connect() {
  socket.on('connect', () => {
    set({ status: 'online' });
    socket.emit('resume', (res) => {
      if (res.ok && !res.data && get().room) {
        resetRoom();
        toast('error', 'Your seat expired — the room is gone');
      }
      set({ ready: true });
    });
  });

  socket.on('disconnect', () => set({ status: 'offline' }));
  socket.on('connect_error', () => set({ status: 'offline', ready: true }));

  socket.on('state', (room) => {
    const prev = get().room;
    const newRound = prev?.code !== room.code || prev.round !== room.round;
    set({
      room,
      ...(newRound ? { selected: null, shake: null, dismissedRound: null } : {}),
    });
    syncUrl(room.code);
  });

  socket.on('chatHistory', (chat) => set({ chat, unread: 0 }));

  socket.on('chat', (message) =>
    set((s) => ({
      chat: [...s.chat.slice(-199), message],
      unread: s.chatOpen || message.playerId === s.room?.you ? s.unread : s.unread + 1,
    })),
  );

  socket.on('cursor', (playerId, cursor) =>
    set((s) =>
      s.room
        ? { room: { ...s.room, players: s.room.players.map((p) => (p.id === playerId ? { ...p, cursor } : p)) } }
        : {},
    ),
  );

  socket.on('wrongMove', (pos, penalty) => {
    set((s) => ({ shake: { pos, key: (s.shake?.key ?? 0) + 1 } }));
    toast('penalty', `Wrong digit · ${penalty} pts`, 1600);
    navigator.vibrate?.(60);
  });

  socket.on('gameOver', celebrate);

  socket.connect();
}

// ── Lobby actions ─────────────────────────────────────────────────────────

export function createRoom(name: string, difficulty: Difficulty, mode: GameMode) {
  set({ busy: true });
  socket.emit('createRoom', { name, difficulty, mode }, (res) => {
    set({ busy: false });
    if (!res.ok) toast('error', res.error);
  });
}

export function joinRoom(code: string, name: string) {
  set({ busy: true });
  socket.emit('joinRoom', { code, name }, (res) => {
    set({ busy: false });
    if (!res.ok) toast('error', res.error);
  });
}

export function leaveRoom() {
  socket.emit('leaveRoom');
  resetRoom();
}

export function newGame(difficulty: Difficulty) {
  socket.emit('newGame', difficulty);
}

// ── Board actions ─────────────────────────────────────────────────────────

const isCoop = () => get().room?.mode === 'coop';

export function select(pos: Position | null) {
  const { selected } = get();
  if (pos?.row === selected?.row && pos?.col === selected?.col) return;
  set({ selected: pos });
  if (isCoop()) socket.emit('cursor', pos);
}

export function moveSelection(dRow: number, dCol: number) {
  const current = get().selected ?? { row: 4, col: 4 };
  select({ row: (current.row + dRow + 9) % 9, col: (current.col + dCol + 9) % 9 });
}

export function input(digit: number) {
  const { room, selected, noteMode } = get();
  if (!room || !selected || room.finishedAt) return;
  const cell = room.board[selected.row][selected.col];
  if (cell.given || cell.value !== null) return;
  if (noteMode) socket.emit('toggleNote', selected, digit);
  else socket.emit('setValue', selected, digit);
}

export function erase() {
  const { selected } = get();
  if (selected) socket.emit('erase', selected);
}

export function hint() {
  if (isCoop()) socket.emit('hint', get().selected);
}

export function undo() {
  socket.emit('undo');
}

export const toggleNoteMode = () => set((s) => ({ noteMode: !s.noteMode }));

// ── UI actions ────────────────────────────────────────────────────────────

export function sendChat(text: string) {
  socket.emit('chat', text);
}

export const setChatOpen = (chatOpen: boolean) => set({ chatOpen, ...(chatOpen ? { unread: 0 } : {}) });

export const dismissResults = () => set((s) => ({ dismissedRound: s.room?.round ?? null }));
