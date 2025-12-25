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
  const buttonBase = "flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xl hover:border-red-500 hover:text-red-500 transition-all active:scale-95 shadow-sm";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
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
            className={`col-span-2 h-14 ${buttonBase} hover:border-red-500 hover:text-red-500 gap-2`}
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
