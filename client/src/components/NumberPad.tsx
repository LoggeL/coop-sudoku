import React from 'react';
import { PencilIcon, EraserIcon, LightbulbIcon } from 'lucide-react';

interface NumberPadProps {
  selectedValue: number | null;
  isNoteMode: boolean;
  onNumberClick: (num: number) => void;
  onClear: () => void;
  onToggleNoteMode: () => void;
  onHint?: () => void;
  hideClear?: boolean;
  hideHint?: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ 
  selectedValue, 
  isNoteMode, 
  onNumberClick, 
  onClear, 
  onToggleNoteMode,
  onHint,
  hideClear = false,
  hideHint = false
}) => {
  const buttonBase = "flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl font-bold text-lg sm:text-xl hover:border-red-500 hover:text-red-500 transition-all active:scale-95 shadow-sm";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Mobile layout: 4 columns - 3 for numbers, 1 for tools (hint, notes, clear) */}
      <div className="grid grid-cols-4 gap-1.5 sm:hidden">
        {/* Row 1: Numbers 1-3 + Hint */}
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className={`h-12 ${buttonBase} ${
              selectedValue === num ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' : ''
            }`}
          >
            {num}
          </button>
        ))}
        {!hideHint ? (
          <button
            onClick={onHint}
            className={`h-12 ${buttonBase} bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-500 hover:text-amber-500`}
            title="Get a hint"
          >
            <LightbulbIcon size={22} />
          </button>
        ) : (
          <div />
        )}
        
        {/* Row 2: Numbers 4-6 + Notes */}
        {[4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className={`h-12 ${buttonBase} ${
              selectedValue === num ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' : ''
            }`}
          >
            {num}
          </button>
        ))}
        <button
          onClick={onToggleNoteMode}
          title="Toggle Notes Mode (N)"
          className={`h-12 flex items-center justify-center rounded-lg font-bold transition-all active:scale-95 shadow-sm border ${
            isNoteMode 
              ? 'bg-red-600 border-red-600 text-white' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500'
          }`}
        >
          <PencilIcon size={22} />
        </button>
        
        {/* Row 3: Numbers 7-9 + Clear */}
        {[7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className={`h-12 ${buttonBase} ${
              selectedValue === num ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' : ''
            }`}
          >
            {num}
          </button>
        ))}
        {!hideClear ? (
          <button
            onClick={onClear}
            className={`h-12 ${buttonBase} hover:border-red-500 hover:text-red-500`}
            title="Clear cell"
          >
            <EraserIcon size={22} />
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Desktop layout: 3 columns */}
      <div className="hidden sm:grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className={`h-14 ${buttonBase} ${
              selectedValue === num ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' : ''
            }`}
          >
            {num}
          </button>
        ))}
        
        {/* Clear button - spans 2 columns (hidden in versus mode) */}
        {!hideClear && (
          <button
            onClick={onClear}
            className={`h-14 col-span-2 ${buttonBase} hover:border-red-500 hover:text-red-500 gap-2`}
            title="Clear cell"
          >
            <EraserIcon size={20} />
            Clear
          </button>
        )}
        
        {/* Notes button */}
        <button
          onClick={onToggleNoteMode}
          title="Toggle Notes Mode (N)"
          className={`h-14 ${hideClear ? 'col-span-3' : ''} flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 shadow-sm border gap-2 ${
            isNoteMode 
              ? 'bg-red-600 border-red-600 text-white' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500'
          }`}
        >
          <PencilIcon size={22} />
          {hideClear && <span className="text-sm">Notes</span>}
        </button>
      </div>
    </div>
  );
};

export default NumberPad;
