import React, { useEffect, useCallback } from 'react';
import type { Room } from '../../../shared/types';
import Cell from './Cell';

interface BoardProps {
  room: Room;
  onMove: (row: number, col: number, value: number | null) => void;
  onToggleNote: (row: number, col: number, note: number) => void;
  playerId: string;
  selectedCell: { row: number; col: number } | null;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  playerCursors: Record<string, { row: number; col: number }>;
}

const Board: React.FC<BoardProps> = ({ room, playerId, selectedCell, setSelectedCell, playerCursors }) => {
  const selectedCellData = selectedCell ? room.gameState.board[selectedCell.row][selectedCell.col] : null;
  const selectedCellValue = selectedCellData?.value ?? null;

  const getBoxIndex = (row: number, col: number) => {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  };

  const selectedBoxIndex = selectedCell ? getBoxIndex(selectedCell.row, selectedCell.col) : null;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell) return;

    if (e.key === 'ArrowUp') {
      setSelectedCell({ row: Math.max(0, selectedCell.row - 1), col: selectedCell.col });
    } else if (e.key === 'ArrowDown') {
      setSelectedCell({ row: Math.min(8, selectedCell.row + 1), col: selectedCell.col });
    } else if (e.key === 'ArrowLeft') {
      setSelectedCell({ row: selectedCell.row, col: Math.max(0, selectedCell.col - 1) });
    } else if (e.key === 'ArrowRight') {
      setSelectedCell({ row: selectedCell.row, col: Math.min(8, selectedCell.col + 1) });
    }
  }, [selectedCell, setSelectedCell]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="sudoku-grid bg-white dark:bg-slate-900 shadow-2xl rounded-sm overflow-hidden">
      {room.gameState.board.map((row, rIndex) =>
        row.map((cell, cIndex) => {
          const isSelected = selectedCell?.row === rIndex && selectedCell?.col === cIndex;
          const isSameRow = selectedCell?.row === rIndex;
          const isSameCol = selectedCell?.col === cIndex;
          const isSameBox = selectedBoxIndex !== null && getBoxIndex(rIndex, cIndex) === selectedBoxIndex;
          const isInHighlightedArea = !isSelected && (isSameRow || isSameCol || isSameBox);
          const isSameNumber = selectedCellValue !== null && cell.value === selectedCellValue;
          const hasMatchingNote = selectedCellValue !== null && cell.value === null && cell.notes.includes(selectedCellValue);
          const isError = cell.value !== null && !cell.initial && cell.isCorrect === false;
          
          // Find other players' cursors on this cell
          const cursorPlayers = Object.entries(playerCursors)
            .filter(([id, pos]) => id !== playerId && pos.row === rIndex && pos.col === cIndex)
            .map(([id]) => room.players.find(p => p.id === id))
            .filter(Boolean);
          
          return (
            <Cell
              key={`${rIndex}-${cIndex}`}
              cell={cell}
              isSelected={isSelected}
              isInHighlightedArea={isInHighlightedArea}
              isSameNumber={isSameNumber}
              hasMatchingNote={hasMatchingNote}
              highlightedNumber={selectedCellValue}
              isError={isError}
              onClick={() => setSelectedCell({ row: rIndex, col: cIndex })}
              cursorPlayers={cursorPlayers as { id: string; color: string; name: string }[]}
            />
          );
        })
      )}
    </div>
  );
};

export default Board;
