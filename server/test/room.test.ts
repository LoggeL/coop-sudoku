import { describe, expect, it } from 'vitest';
import { SCORING, type Position } from '@coop-sudoku/shared';
import { Room, type Player } from '../src/game/Room.ts';
import { RoomStore, RECONNECT_GRACE_MS } from '../src/game/RoomStore.ts';

function join(room: Room, name: string): Player {
  const player = room.addPlayer(`session-${name}-0000000000`, name);
  if ('error' in player) throw new Error(player.error);
  return player;
}

function emptyCells(room: Room, playerId: string): Position[] {
  const cells: Position[] = [];
  room.view(playerId).board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.value === null) cells.push({ row: r, col: c });
    }),
  );
  return cells;
}

const solutionAt = (room: Room, { row, col }: Position): number =>
  (room as unknown as { solution: number[] }).solution[row * 9 + col];

const wrongAt = (room: Room, pos: Position) => (solutionAt(room, pos) % 9) + 1;

function solveCell(room: Room, playerId: string, pos: Position) {
  return room.setValue(playerId, pos, solutionAt(room, pos));
}

describe('coop room', () => {
  it('rejects wrong digits with a penalty and never places them', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const pos = emptyCells(room, a.id)[0];

    // Earn some points first so the penalty is visible
    solveCell(room, a.id, emptyCells(room, a.id)[1]);
    const before = a.score;

    expect(room.setValue(a.id, pos, wrongAt(room, pos))).toEqual({ kind: 'wrong', penalty: SCORING.coop.wrong });
    expect(a.score).toBe(before + SCORING.coop.wrong);
    expect(room.view(a.id).board[pos.row][pos.col].value).toBeNull();
  });

  it('does not penalize typing into an already solved cell', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const b = join(room, 'b');
    const pos = emptyCells(room, a.id)[0];
    solveCell(room, a.id, pos);

    for (let d = 1; d <= 9; d++) expect(room.setValue(b.id, pos, d).kind).toBe('ignored');
    expect(b.score).toBe(0);
  });

  it('shares the board, assigns distinct colors and tracks contribution', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const b = join(room, 'b');
    expect(a.color).not.toBe(b.color);

    const pos = emptyCells(room, a.id)[0];
    solveCell(room, a.id, pos);
    const seenByB = room.view(b.id);
    expect(seenByB.board[pos.row][pos.col].by).toBe(a.id);
    expect(seenByB.players.find((p) => p.id === a.id)!.progress).toBeGreaterThan(0);
  });

  it('removes matching notes from peers when a digit is placed', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const [first, ...rest] = emptyCells(room, a.id);
    const peer = rest.find((p) => p.row === first.row)!;

    for (let d = 1; d <= 9; d++) room.toggleNote(a.id, peer, d);
    expect(solveCell(room, a.id, first).kind).toBe('placed');

    const digit = solutionAt(room, first);
    const notes = room.view(a.id).board[peer.row][peer.col].notes;
    expect(notes).toHaveLength(8);
    expect(notes).not.toContain(digit);
  });

  it('undoes note edits only', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const pos = emptyCells(room, a.id)[0];

    room.toggleNote(a.id, pos, 3);
    room.toggleNote(a.id, pos, 5);
    expect(room.view(a.id).canUndo).toBe(true);
    expect(room.undo(a.id)).toBe(true);
    expect(room.view(a.id).board[pos.row][pos.col].notes).toEqual([3]);

    solveCell(room, a.id, pos);
    expect(room.view(a.id).canUndo).toBe(false);
    expect(room.undo(a.id)).toBe(false);
  });

  it('hints the selected cell, costs points and never scores later', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const pos = emptyCells(room, a.id)[0];

    const outcome = room.hint(a.id, pos);
    expect(outcome).toMatchObject({ kind: 'placed', index: pos.row * 9 + pos.col });
    expect(a.score).toBe(0);
  });

  it('finishes when the board is full', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    const cells = emptyCells(room, a.id);
    let last;
    for (const pos of cells) last = solveCell(room, a.id, pos);
    expect(last).toMatchObject({ kind: 'placed', gameOver: true });
    expect(room.isOver).toBe(true);
    expect(a.score).toBe(cells.length * SCORING.coop.correct);
  });

  it('starts a fresh round with reset scores', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    const a = join(room, 'a');
    solveCell(room, a.id, emptyCells(room, a.id)[0]);
    room.startRound('hard');
    expect(room.round).toBe(2);
    expect(room.difficulty).toBe('hard');
    expect(a.score).toBe(0);
  });

  it('caps the room at four players', () => {
    const room = new Room('ABCDEF', 'coop', 'easy');
    ['a', 'b', 'c', 'd'].forEach((n) => join(room, n));
    expect(room.addPlayer('session-e-0000000000', 'e')).toEqual({ error: 'This room is full' });
  });
});

describe('versus room', () => {
  it('keeps boards private and rewards the first solver', () => {
    const room = new Room('ABCDEF', 'versus', 'easy');
    const a = join(room, 'a');
    const b = join(room, 'b');
    const pos = emptyCells(room, a.id)[0];

    solveCell(room, a.id, pos);
    expect(a.score).toBe(SCORING.versus.first);
    expect(room.view(b.id).board[pos.row][pos.col]).toMatchObject({ value: null, claimed: true });

    solveCell(room, b.id, pos);
    expect(b.score).toBe(SCORING.versus.second);
  });

  it('has no hints and ends once every connected player finished', () => {
    const room = new Room('ABCDEF', 'versus', 'easy');
    const a = join(room, 'a');
    const b = join(room, 'b');
    expect(room.hint(a.id, null).kind).toBe('ignored');

    for (const pos of emptyCells(room, a.id)) solveCell(room, a.id, pos);
    expect(a.finished).toBe(true);
    expect(room.isOver).toBe(false);

    // b drops out → only finished players remain
    expect(room.setConnected(b.id, false)).toBe(true);
    expect(room.isOver).toBe(true);
  });
});

describe('room store', () => {
  it('keeps a seat through a reconnect and frees it after the grace period', () => {
    const store = new RoomStore();
    const room = store.create('coop', 'easy');
    const player = room.addPlayer('session-a-0000000000', 'a') as Player;
    store.seat('session-a-0000000000', room, player);

    room.setConnected(player.id, false);
    expect(store.sweep(Date.now())).toEqual([]);
    expect(store.locate('session-a-0000000000')?.player.id).toBe(player.id);

    store.sweep(Date.now() + RECONNECT_GRACE_MS + 1);
    expect(store.locate('session-a-0000000000')).toBeNull();
    expect(store.get(room.code)).toBeUndefined();
  });

  it('drops empty rooms when the last player leaves', () => {
    const store = new RoomStore();
    const room = store.create('versus', 'easy');
    const player = room.addPlayer('session-a-0000000000', 'a') as Player;
    store.seat('session-a-0000000000', room, player);
    store.leave('session-a-0000000000');
    expect(store.size).toBe(0);
  });
});
