import { useEffect } from 'react';
import { erase, hint, input, moveSelection, select, toggleNoteMode, undo } from '../lib/store.ts';

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Global game shortcuts; ignored while typing in an input */
export function useKeyboard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.altKey) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey || e.metaKey) return;

      const arrow = ARROWS[e.key];
      if (arrow) {
        e.preventDefault();
        moveSelection(...arrow);
        return;
      }

      // e.code keeps digits working with Shift held or on AZERTY layouts
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1] ?? (/^[1-9]$/.test(e.key) ? e.key : null);
      if (digit) {
        input(Number(digit));
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'backspace':
        case 'delete':
        case '0':
          erase();
          break;
        case 'n':
        case 'p':
          toggleNoteMode();
          break;
        case 'h':
          hint();
          break;
        case 'escape':
          select(null);
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
