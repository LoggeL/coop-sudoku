import { memo } from 'react';
import { motion } from 'motion/react';
import { boxOf, type CellView, type PlayerView } from '@coop-sudoku/shared';
import { select, useGame } from '../../lib/store.ts';
import { cn } from '../../lib/cn.ts';

export function Board() {
  const room = useGame((s) => s.room)!;
  const selected = useGame((s) => s.selected);
  const shake = useGame((s) => s.shake);

  const selectedValue = selected ? room.board[selected.row][selected.col].value : null;
  const playersById = new Map(room.players.map((p) => [p.id, p]));
  const peersAt = new Map<number, PlayerView[]>();
  for (const p of room.players) {
    if (p.id === room.you || !p.cursor || !p.connected) continue;
    const key = p.cursor.row * 9 + p.cursor.col;
    peersAt.set(key, [...(peersAt.get(key) ?? []), p]);
  }

  return (
    <div role="grid" aria-label="Sudoku board" className="board" onContextMenu={(e) => e.preventDefault()}>
      {room.board.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = selected?.row === r && selected.col === c;
          const inZone =
            !!selected && (selected.row === r || selected.col === c || boxOf(selected.row, selected.col) === boxOf(r, c));
          const shaking = shake && shake.pos.row === r && shake.pos.col === c ? shake.key : 0;
          return (
            <Cell
              key={`${room.round}-${r}-${c}`}
              row={r}
              col={c}
              cell={cell}
              selected={isSelected}
              zone={inZone}
              sameValue={selectedValue !== null && cell.value === selectedValue}
              highlightNote={selectedValue !== null && cell.value === null ? selectedValue : null}
              filledBy={cell.by && room.mode === 'coop' ? playersById.get(cell.by)?.color : undefined}
              peers={peersAt.get(r * 9 + c)}
              shakeKey={shaking}
            />
          );
        }),
      )}
    </div>
  );
}

interface CellProps {
  row: number;
  col: number;
  cell: CellView;
  selected: boolean;
  zone: boolean;
  sameValue: boolean;
  highlightNote: number | null;
  filledBy?: string;
  peers?: PlayerView[];
  shakeKey: number;
}

const Cell = memo(function Cell({ row, col, cell, selected, zone, sameValue, highlightNote, filledBy, peers, shakeKey }: CellProps) {
  const background = selected
    ? 'var(--cell-selected)'
    : shakeKey
      ? 'rgb(244 63 94 / 0.18)'
      : sameValue
        ? 'var(--cell-same)'
        : zone
          ? 'var(--cell-zone)'
          : undefined;

  return (
    <div
      role="gridcell"
      aria-selected={selected}
      aria-label={`Row ${row + 1}, column ${col + 1}${cell.value ? `, ${cell.value}` : ', empty'}`}
      data-row={row}
      data-col={col}
      onPointerDown={() => select({ row, col })}
      className="cell cursor-pointer"
      style={{ background }}
    >
      {selected && <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--accent)]" />}

      <span key={shakeKey} className={cn('relative grid size-full place-items-center', shakeKey > 0 && 'animate-shake')}>
        {cell.value !== null ? (
          <motion.span
            initial={cell.given ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className={cn(cell.given ? 'font-semibold' : 'font-medium text-accent', sameValue && !selected && 'font-bold')}
            style={cell.given ? { color: 'var(--cell-given)' } : undefined}
          >
            {cell.value}
          </motion.span>
        ) : (
          cell.notes.length > 0 && (
            <span className="notes">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span
                  key={n}
                  className={cn(
                    'grid place-items-center rounded-[3px]',
                    !cell.notes.includes(n) && 'invisible',
                    highlightNote === n && 'bg-accent text-on-accent',
                  )}
                >
                  {n}
                </span>
              ))}
            </span>
          )
        )}
      </span>

      {filledBy && (
        <span className="absolute bottom-[8%] left-1/2 h-[3px] w-[28%] -translate-x-1/2 rounded-full" style={{ background: filledBy }} />
      )}

      {cell.claimed && (
        <span className="absolute top-[9%] right-[9%] size-1.5 rounded-full bg-amber-400" title="An opponent solved this first" />
      )}

      {peers && peers.length > 0 && (
        <>
          <span
            className="animate-cursor pointer-events-none absolute inset-[2px] rounded-[4px]"
            style={{ boxShadow: `inset 0 0 0 2px ${peers[0].color}` }}
          />
          <span className="pointer-events-none absolute top-[3px] left-[3px] flex gap-px">
            {peers.map((p) => (
              <span
                key={p.id}
                title={p.name}
                className="grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 font-sans text-[8px] font-bold text-black/80"
                style={{ background: p.color }}
              >
                {p.name[0]?.toUpperCase()}
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
});
