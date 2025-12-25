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
  const getCellClasses = () => {
    let classes = 'sudoku-cell transition-all duration-150 ';
    
    // Base text color
    if (cell.initial) {
      classes += 'text-slate-900 dark:text-slate-100 font-bold ';
    } else if (cell.isCorrect === false) {
      classes += 'text-red-600 dark:text-red-400 ';
    } else {
      classes += 'text-blue-600 dark:text-blue-400 ';
    }

    // Background based on state (priority order matters)
    if (isError) {
      classes += 'bg-red-200 dark:bg-red-900/50 !text-red-600 dark:!text-red-400 ';
    } else if (isSelected) {
      classes += 'bg-red-200 dark:bg-red-800/60 ring-2 ring-red-500 ring-inset z-10 ';
    } else if (isSameNumber && cell.value !== null) {
      classes += 'bg-red-100 dark:bg-red-900/40 ';
    } else if (hasMatchingNote) {
      classes += 'bg-amber-100 dark:bg-amber-900/30 ';
    } else if (isInHighlightedArea) {
      classes += 'bg-slate-100 dark:bg-slate-800/60 ';
    } else if (cell.initial) {
      classes += 'bg-slate-50 dark:bg-slate-800/30 ';
    } else {
      classes += 'bg-white dark:bg-slate-900 ';
    }

    return classes;
  };

  return (
    <div className={getCellClasses()} onClick={onClick}>
      {cell.value !== null ? (
        <span className={isSameNumber && !isSelected ? 'font-black scale-110' : ''}>{cell.value}</span>
      ) : (
        <div className="grid grid-cols-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const isHighlightedNote = highlightedNumber === n && cell.notes.includes(n);
            return (
              <div
                key={n}
                className={`flex items-center justify-center text-[10px] leading-none transition-all ${
                  cell.notes.includes(n) 
                    ? isHighlightedNote
                      ? 'text-amber-600 dark:text-amber-400 font-bold scale-125'
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
      
      {/* Claimed by other player indicator (versus mode) */}
      {claimedByOther && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500 opacity-70" title="Claimed by opponent" />
      )}
      
      {/* Other players' cursor indicators */}
      {cursorPlayers.length > 0 && !isSelected && (
        <div 
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{ 
            boxShadow: `inset 0 0 0 3px ${cursorPlayers[0].color}`,
            borderRadius: '2px'
          }}
        >
          <div 
            className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap z-20"
            style={{ backgroundColor: cursorPlayers[0].color }}
          >
            {cursorPlayers.map(p => p.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cell;
