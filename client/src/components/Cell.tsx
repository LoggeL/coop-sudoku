import React from 'react';
import type { Cell as CellType } from '../../../shared/types';

interface CellProps {
  cell: CellType;
  isSelected: boolean;
  isInHighlightedArea: boolean;
  isSameNumber: boolean;
  hasMatchingNote: boolean;
  highlightedNumber: number | null;
  onClick: () => void;
  isError: boolean;
  cursorPlayers: { id: string; color: string; name: string }[];
  claimedByOther?: boolean;
}

const Cell: React.FC<CellProps> = ({
  cell,
  isSelected,
  isInHighlightedArea,
  isSameNumber,
  hasMatchingNote,
  highlightedNumber,
  onClick,
  isError,
  cursorPlayers,
  claimedByOther = false
}) => {
  // Text color: givens are neutral, player entries blue, mistakes red
  const textClass = isError
    ? 'text-rose-600 dark:text-rose-400'
    : cell.initial
      ? 'text-slate-800 dark:text-slate-100'
      : 'text-sky-600 dark:text-sky-400';

  // Background priority: error > selected > same number > matching note > peers > default
  const bgClass = isError
    ? 'bg-rose-100 dark:bg-rose-500/20'
    : isSelected
      ? 'bg-sky-200/80 dark:bg-sky-500/30 ring-2 ring-sky-500 dark:ring-sky-400 ring-inset z-10'
      : isSameNumber && cell.value !== null
        ? 'bg-sky-100 dark:bg-sky-500/15'
        : hasMatchingNote
          ? 'bg-amber-100 dark:bg-amber-500/15'
          : isInHighlightedArea
            ? 'bg-slate-100 dark:bg-slate-800/70'
            : 'bg-white dark:bg-slate-900';

  return (
    <div
      className={`sudoku-cell transition-colors duration-100 ${textClass} ${bgClass}`}
      onClick={onClick}
      role="gridcell"
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
    >
      {cell.value !== null ? (
        <span className={isSameNumber && !isSelected ? 'font-extrabold' : ''}>{cell.value}</span>
      ) : (
        <div className="grid grid-cols-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const isHighlightedNote = highlightedNumber === n && cell.notes.includes(n);
            return (
              <div
                key={n}
                className={`flex items-center justify-center text-[max(9px,calc(var(--board-size)/52))] leading-none ${
                  cell.notes.includes(n)
                    ? isHighlightedNote
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                    : 'opacity-0'
                }`}
              >
                {n}
              </div>
            );
          })}
        </div>
      )}

      {claimedByOther && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500 opacity-70" title="Claimed by opponent" />
      )}

      {cursorPlayers.length > 0 && !isSelected && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{ boxShadow: `inset 0 0 0 3px ${cursorPlayers[0].color}`, borderRadius: '2px' }}
        >
          <div
            className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap z-20"
            style={{ backgroundColor: cursorPlayers[0].color }}
          >
            {cursorPlayers.map((p) => p.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cell;
