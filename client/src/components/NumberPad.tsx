import React from 'react';
import { PencilIcon, EraserIcon } from 'lucide-react';

interface NumberPadProps {
  selectedValue: number | null;
  isNoteMode: boolean;
  onNumberClick: (num: number) => void;
  onClear: () => void;
  onToggleNoteMode: () => void;
  hideClear?: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ 
  selectedValue, 
  isNoteMode, 
  onNumberClick, 
  onClear, 
  onToggleNoteMode,
  hideClear = false
}) => {
  const buttonBase = "flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl font-bold text-lg sm:text-xl hover:border-red-500 hover:text-red-500 transition-all active:scale-95 shadow-sm";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="grid grid-cols-5 sm:grid-cols-3 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className={`h-11 sm:h-14 ${buttonBase} ${
              selectedValue === num ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600' : ''
            }`}
          >
            {num}
          </button>
        ))}
        
        {/* Clear button - hidden in versus mode, shown as single button on mobile */}
        {!hideClear && (
          <button
            onClick={onClear}
            className={`h-11 sm:h-14 sm:col-span-2 ${buttonBase} hover:border-red-500 hover:text-red-500 gap-1 sm:gap-2`}
            title="Clear cell"
          >
            <EraserIcon size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
        
        {/* Notes button */}
        <button
          onClick={onToggleNoteMode}
          title="Toggle Notes Mode (N)"
          className={`h-11 sm:h-14 ${hideClear ? 'sm:col-span-3' : ''} flex items-center justify-center rounded-lg sm:rounded-xl font-bold transition-all active:scale-95 shadow-sm border gap-1 sm:gap-2 ${
            isNoteMode 
              ? 'bg-red-600 border-red-600 text-white' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500'
          }`}
        >
          <PencilIcon size={18} className="sm:w-[22px] sm:h-[22px]" />
          {hideClear && <span className="text-xs sm:text-sm hidden sm:inline">Notes</span>}
        </button>
      </div>
    </div>
  );
};

export default NumberPad;
