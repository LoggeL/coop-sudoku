import React from 'react';
import { PencilIcon, EraserIcon, Undo2Icon, LightbulbIcon } from 'lucide-react';

interface NumberPadProps {
  selectedValue: number | null;
  isNoteMode: boolean;
  /** counts[n] = how many n's are correctly placed on the board */
  digitCounts: number[];
  isVersus: boolean;
  onNumberClick: (num: number) => void;
  onClear: () => void;
  onToggleNoteMode: () => void;
  onUndo: () => void;
  onHint: () => void;
}

const toolClass =
  'flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-semibold transition-all active:scale-95 ' +
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' +
  'text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400';

const NumberPad: React.FC<NumberPadProps> = ({
  selectedValue,
  isNoteMode,
  digitCounts,
  isVersus,
  onNumberClick,
  onClear,
  onToggleNoteMode,
  onUndo,
  onHint
}) => {
  return (
    <div className="board-width space-y-1.5">
      {/* Tool row */}
      <div className={`grid gap-1.5 ${isVersus ? 'grid-cols-1' : 'grid-cols-4'}`}>
        {!isVersus && (
          <button onClick={onUndo} className={toolClass} title="Undo last move (Ctrl+Z)">
            <Undo2Icon size={15} /> Undo
          </button>
        )}
        {!isVersus && (
          <button onClick={onClear} className={toolClass} title="Clear cell (Backspace)">
            <EraserIcon size={15} /> Erase
          </button>
        )}
        <button
          onClick={onToggleNoteMode}
          title="Toggle notes mode (N)"
          aria-label="Toggle notes mode"
          aria-pressed={isNoteMode}
          className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-semibold transition-all active:scale-95 border ${
            isNoteMode
              ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-500/30'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400'
          }`}
        >
          <PencilIcon size={15} /> Notes{isNoteMode ? ' on' : ''}
        </button>
        {!isVersus && (
          <button onClick={onHint} className={`${toolClass} hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400`} title="Reveal a random cell (-15 points)">
            <LightbulbIcon size={15} /> Hint
          </button>
        )}
      </div>

      {/* Number row */}
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const remaining = 9 - (digitCounts[num] ?? 0);
          const done = remaining <= 0;
          return (
            <button
              key={num}
              onClick={() => onNumberClick(num)}
              aria-label={`Enter ${num} (${remaining} remaining)`}
              className={`flex flex-col items-center justify-center h-12 sm:h-14 rounded-lg border font-bold text-lg sm:text-xl leading-none transition-all active:scale-95 ${
                selectedValue === num
                  ? 'bg-sky-100 dark:bg-sky-500/25 border-sky-500 text-sky-700 dark:text-sky-300'
                  : done
                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400'
              }`}
            >
              {num}
              <span className={`mt-0.5 text-[9px] font-medium ${done ? 'opacity-0' : 'text-slate-400 dark:text-slate-500'}`}>
                {remaining}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NumberPad;
