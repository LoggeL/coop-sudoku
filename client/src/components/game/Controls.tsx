import type { ReactNode } from 'react';
import { EraserIcon, LightbulbIcon, PencilIcon, Undo2Icon } from 'lucide-react';
import { SCORING } from '@coop-sudoku/shared';
import { erase, hint, input, toggleNoteMode, undo, useGame } from '../../lib/store.ts';
import { cn } from '../../lib/cn.ts';

export function Controls() {
  const room = useGame((s) => s.room)!;
  const selected = useGame((s) => s.selected);
  const noteMode = useGame((s) => s.noteMode);

  const selectedCell = selected ? room.board[selected.row][selected.col] : null;
  const editable = !!selectedCell && !selectedCell.given && selectedCell.value === null && !room.finishedAt;
  const isCoop = room.mode === 'coop';

  const placed = new Array(10).fill(0);
  for (const row of room.board) for (const cell of row) if (cell.value) placed[cell.value]++;

  return (
    <div className="w-(--board) space-y-2.5">
      <div className={cn('grid gap-2', isCoop ? 'grid-cols-4' : 'grid-cols-3')}>
        <Tool label="Undo" shortcut="Ctrl Z" onClick={undo} disabled={!room.canUndo}>
          <Undo2Icon size={18} />
        </Tool>
        <Tool label="Erase" shortcut="⌫" onClick={erase} disabled={!editable || !selectedCell?.notes.length}>
          <EraserIcon size={18} />
        </Tool>
        <Tool label="Notes" shortcut="N" onClick={toggleNoteMode} active={noteMode}>
          <PencilIcon size={18} />
          <span
            className={cn(
              'absolute top-1.5 right-1.5 rounded-full px-1.5 text-[9px] leading-4 font-bold',
              noteMode ? 'bg-white/25 text-white' : 'bg-surface-3 text-subtle',
            )}
          >
            {noteMode ? 'ON' : 'OFF'}
          </span>
        </Tool>
        {isCoop && (
          <Tool label={`Hint ${SCORING.coop.hint}`} shortcut="H" onClick={hint} disabled={!!room.finishedAt}>
            <LightbulbIcon size={18} />
          </Tool>
        )}
      </div>

      <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const left = 9 - placed[n];
          const done = left <= 0;
          const inNotes = noteMode && selectedCell?.notes.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => input(n)}
              disabled={done}
              aria-label={`${noteMode ? 'Note' : 'Enter'} ${n}, ${left} left`}
              className={cn(
                'group relative flex h-14 flex-col items-center justify-center rounded-xl border font-display transition active:scale-90',
                done
                  ? 'border-transparent bg-surface-2/40 text-subtle/50'
                  : inNotes
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface shadow-sm hover:-translate-y-0.5 hover:border-line-strong',
                !editable && !done && 'opacity-70',
              )}
            >
              <span className={cn('leading-none font-medium', noteMode ? 'text-base text-muted sm:text-lg' : 'text-xl sm:text-2xl')}>
                {n}
              </span>
              <span className={cn('mt-1 font-sans text-[10px] leading-none text-subtle', done && 'invisible')}>{left}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ToolProps {
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}

function Tool({ label, shortcut, onClick, disabled, active, children }: ToolProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={`${label} (${shortcut})`}
      className={cn(
        'relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition active:scale-95 disabled:opacity-35 disabled:active:scale-100',
        active
          ? 'bg-gradient-accent border-transparent text-white shadow-lg shadow-rose-500/20'
          : 'border-line bg-surface text-muted hover:text-fg enabled:hover:border-line-strong',
      )}
    >
      {children}
      {label}
    </button>
  );
}
