import type { ChatMessage, Difficulty, GameMode, Position, RoomView, Standing } from './types.ts';

export type AckResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export type Ack<T = undefined> = (result: AckResult<T>) => void;

export interface CreateRoomRequest {
  name: string;
  difficulty: Difficulty;
  mode: GameMode;
}

export interface JoinRoomRequest {
  code: string;
  name: string;
}

export interface ServerToClientEvents {
  state: (room: RoomView) => void;
  chatHistory: (messages: ChatMessage[]) => void;
  chat: (message: ChatMessage) => void;
  cursor: (playerId: string, position: Position | null) => void;
  wrongMove: (position: Position, penalty: number) => void;
  gameOver: (standings: Standing[]) => void;
}

export interface ClientToServerEvents {
  /** Re-attach to the room this session was in before a reload or reconnect */
  resume: (ack: Ack<{ code: string } | null>) => void;
  createRoom: (request: CreateRoomRequest, ack: Ack<{ code: string }>) => void;
  joinRoom: (request: JoinRoomRequest, ack: Ack<{ code: string }>) => void;
  leaveRoom: () => void;
  newGame: (difficulty: Difficulty) => void;

  setValue: (position: Position, value: number) => void;
  toggleNote: (position: Position, digit: number) => void;
  erase: (position: Position) => void;
  hint: (position: Position | null) => void;
  undo: () => void;

  chat: (text: string) => void;
  cursor: (position: Position | null) => void;
}

/** Data the client hands over in the socket.io handshake */
export interface HandshakeAuth {
  session: string;
}
