import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import type { Room, Difficulty, ChatMessage, GameMode } from '../../shared/types';
import Lobby from './components/Lobby';
import Board from './components/Board';
import PlayerList from './components/PlayerList';
import Chat from './components/Chat';
import NumberPad from './components/NumberPad';
import { useTheme } from './context/ThemeContext';
import { MoonIcon, SunIcon, LogOutIcon, LightbulbIcon, Share2Icon, TrophyIcon, Undo2Icon, ClockIcon, ExternalLinkIcon, UsersIcon, SwordsIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

function App() {
  const socket = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [wrongMoveToast, setWrongMoveToast] = useState<number | null>(null);
  const [gameWonData, setGameWonData] = useState<{ name: string; score: number }[] | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerCursors, setPlayerCursors] = useState<Record<string, { row: number; col: number }>>({});
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomUpdated', (updatedRoom) => {
      setRoom(updatedRoom);
      setError(null);
    });

    socket.on('messageReceived', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('wrongMove', (points) => {
      setWrongMoveToast(points);
      setTimeout(() => setWrongMoveToast(null), 2000);
    });

    socket.on('gameWon', (winnerScores) => {
      setGameWonData(winnerScores);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });
    });

    socket.on('cursorUpdated', (playerId, cursor) => {
      setPlayerCursors(prev => {
        if (cursor) {
          return { ...prev, [playerId]: { row: cursor.x, col: cursor.y } };
        } else {
          const { [playerId]: _, ...rest } = prev;
          return rest;
        }
      });
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('messageReceived');
      socket.off('error');
      socket.off('wrongMove');
      socket.off('gameWon');
      socket.off('cursorUpdated');
    };
  }, [socket]);

  // Update elapsed time
  useEffect(() => {
    if (!room || room.gameState.isComplete) return;
    
    const updateTime = () => {
      setElapsedTime(Math.floor((Date.now() - room.gameState.startTime) / 1000));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [room]);

  // Emit cursor position when selected cell changes (only in coop mode)
  useEffect(() => {
    if (!socket || !room) return;
    if (room.mode === 'versus') return; // No cursor sharing in versus
    if (selectedCell) {
      socket.emit('updateCursor', { x: selectedCell.row, y: selectedCell.col });
    } else {
      socket.emit('updateCursor', undefined);
    }
  }, [socket, room, selectedCell]);

  const handleCreateRoom = (name: string, difficulty: Difficulty, mode: GameMode) => {
    socket?.emit('createRoom', name, difficulty, mode);
  };

  const handleJoinRoom = (roomId: string, name: string) => {
    socket?.emit('joinRoom', roomId, name);
  };

  const handleMove = (row: number, col: number, value: number | null) => {
    socket?.emit('makeMove', row, col, value);
  };

  const handleToggleNote = (row: number, col: number, note: number) => {
    socket?.emit('toggleNote', row, col, note);
  };

  const handleUndo = () => {
    if (room?.mode === 'versus') return; // No undo in versus
    socket?.emit('undo');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHint = () => {
    if (!room || room.mode === 'versus') return; // No hints in versus
    const emptyCells: {r: number, c: number}[] = [];
    room.gameState.board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.value === null || cell.isCorrect === false) {
          emptyCells.push({r, c});
        }
      });
    });

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      socket?.emit('useHint', randomCell.r, randomCell.c);
    }
  };

  const handleCopyRoomLink = () => {
    if (room) {
      const url = `${window.location.origin}?room=${room.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitialRoomCode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  };

  // Get selected cell value for highlighting in number pad
  const selectedCellValue = room && selectedCell 
    ? room.gameState.board[selectedCell.row][selectedCell.col]?.value ?? null 
    : null;

  // Handle number pad clicks
  const handleNumberClick = (num: number) => {
    if (!selectedCell) return;
    if (isNoteMode) {
      handleToggleNote(selectedCell.row, selectedCell.col, num);
    } else {
      handleMove(selectedCell.row, selectedCell.col, num);
    }
  };

  const handleClear = () => {
    if (!selectedCell || room?.mode === 'versus') return; // No clearing in versus
    handleMove(selectedCell.row, selectedCell.col, null);
  };

  // Keyboard handler for numbers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Z for undo (only in coop)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (room?.mode !== 'versus') {
        handleUndo();
      }
      return;
    }

    if (!selectedCell) return;

    if (e.key >= '1' && e.key <= '9') {
      const val = parseInt(e.key);
      if (isNoteMode) {
        handleToggleNote(selectedCell.row, selectedCell.col, val);
      } else {
        handleMove(selectedCell.row, selectedCell.col, val);
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      if (room?.mode !== 'versus') {
        handleMove(selectedCell.row, selectedCell.col, null);
      }
    } else if (e.key.toLowerCase() === 'n') {
      setIsNoteMode(prev => !prev);
    }
  }, [selectedCell, isNoteMode, room?.mode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Check if current player has finished (versus mode)
  const currentPlayer = room?.players.find(p => p.id === socket?.id);
  const playerFinished = room?.mode === 'versus' && currentPlayer?.finished;

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:scale-110 transition-all"
          >
            {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
        </div>
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} initialRoomCode={getInitialRoomCode()} />
        {error && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce">
            {error}
          </div>
        )}
      </div>
    );
  }

  const isVersus = room.mode === 'versus';

  return (
    <div className="min-h-screen pb-32 sm:pb-16 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-wrap min-w-0">
            <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent hidden md:block">
              Coop Sudoku
            </h1>
            {/* Mode Badge */}
            <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase ${
              isVersus 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            }`}>
              {isVersus ? <SwordsIcon size={12} className="sm:w-3.5 sm:h-3.5" /> : <UsersIcon size={12} className="sm:w-3.5 sm:h-3.5" />}
              <span className="hidden xs:inline">{isVersus ? 'Versus' : 'Coop'}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase hidden md:inline">Room</span>
              <span className="font-mono font-bold tracking-wider text-xs sm:text-sm">{room.id}</span>
              <button 
                onClick={handleCopyRoomLink}
                className={`p-0.5 sm:p-1 transition-colors ${copied ? 'text-green-500' : 'hover:text-blue-500'}`}
                title="Copy invite link"
              >
                {copied ? '✓' : <Share2Icon size={12} className="sm:w-3.5 sm:h-3.5" />}
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 capitalize text-sm font-bold text-slate-600 dark:text-slate-400">
              {room.gameState.difficulty}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
              <ClockIcon size={12} className="sm:w-3.5 sm:h-3.5" />
              {formatTime(elapsedTime)}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isVersus && (
              <>
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg sm:rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm border border-slate-200 dark:border-slate-700"
                  title="Undo last move (Ctrl+Z)"
                >
                  <Undo2Icon size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  onClick={handleHint}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold rounded-lg sm:rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all text-xs sm:text-sm border border-amber-200 dark:border-amber-800"
                >
                  <LightbulbIcon size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Hint (-15)</span>
                </button>
              </>
            )}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {theme === 'dark' ? <SunIcon size={18} className="sm:w-5 sm:h-5" /> : <MoonIcon size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 sm:p-2 text-red-500 rounded-lg sm:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Leave Room"
            >
              <LogOutIcon size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 items-start justify-center">
          {/* Left Sidebar - Players & Chat */}
          <div className="w-full xl:w-72 space-y-4 sm:space-y-6 order-2 xl:order-1 hidden sm:block">
            <PlayerList players={room.players} currentPlayerId={socket?.id || ''} />
            <div className="hidden md:block">
              <Chat messages={messages} onSendMessage={(text) => socket?.emit('sendMessage', text)} currentPlayerId={socket?.id || ''} />
            </div>
          </div>

          {/* Center - Board */}
          <div className="flex-shrink-0 order-1 xl:order-2 relative w-full flex justify-center">
            <Board 
              room={room} 
              onMove={handleMove} 
              onToggleNote={handleToggleNote}
              playerId={socket?.id || ''} 
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              playerCursors={isVersus ? {} : playerCursors}
            />
            
            {/* Waiting overlay for finished player in versus */}
            {playerFinished && !room.gameState.isComplete && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-sm flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                    <TrophyIcon size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">You finished!</h3>
                  <p className="text-slate-500 dark:text-slate-400">Waiting for other players...</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Objective & Number Pad */}
          <div className="w-full xl:w-72 space-y-6 order-3">
            {/* Objective Card */}
            <div className={`p-6 rounded-2xl text-white shadow-xl hidden xl:block ${
              isVersus 
                ? 'bg-gradient-to-br from-orange-600 to-orange-800'
                : 'bg-gradient-to-br from-red-600 to-red-800'
            }`}>
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <TrophyIcon size={18} /> {isVersus ? 'Versus Rules' : 'Objective'}
              </h3>
              {isVersus ? (
                <>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Race to fill cells on your own board! First to claim a cell gets bonus points.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">First</p>
                      <p className="font-bold text-green-300">+100</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Claimed</p>
                      <p className="font-bold">+50</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Wrong</p>
                      <p className="font-bold text-red-300">-250</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Collaborate with your team to fill the 9x9 grid. 
                    Each row, column, and 3x3 subgrid must contain numbers 1-9.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Correct</p>
                      <p className="font-bold">+10 pts</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Mistake</p>
                      <p className="font-bold">-5 pts</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Number Pad - Desktop */}
            <div className="hidden sm:block">
              <NumberPad
                selectedValue={selectedCellValue}
                isNoteMode={isNoteMode}
                onNumberClick={handleNumberClick}
                onClear={handleClear}
                onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
                hideClear={isVersus}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Number Pad - Mobile (fixed bottom) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <NumberPad
          selectedValue={selectedCellValue}
          isNoteMode={isNoteMode}
          onNumberClick={handleNumberClick}
          onClear={handleClear}
          onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
          onHint={handleHint}
          hideClear={isVersus}
          hideHint={isVersus}
        />
      </div>

      {/* Wrong Move Toast */}
      {wrongMoveToast !== null && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold animate-bounce">
          Wrong number! -{wrongMoveToast} pts
        </div>
      )}

      {gameWonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center border border-slate-200 dark:border-slate-800 transform animate-in zoom-in-95 duration-300">
            <div className={`inline-flex p-4 rounded-full mb-6 ${
              isVersus 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              <TrophyIcon size={48} />
            </div>
            {isVersus ? (
              <>
                <h2 className="text-3xl font-black mb-2">
                  {gameWonData.sort((a, b) => b.score - a.score)[0]?.name} Wins!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Final standings</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black mb-2">Victory!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">The puzzle has been solved!</p>
              </>
            )}
            
            <div className="space-y-3 mb-8">
              {gameWonData.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.name} className={`flex items-center justify-between p-3 rounded-xl border ${
                  i === 0 && isVersus
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-black ${i === 0 && isVersus ? 'text-orange-500' : 'text-slate-300'}`}>
                      #{i + 1}
                    </span>
                    <span className="font-bold">{p.name}</span>
                    {i === 0 && isVersus && <span className="text-lg">👑</span>}
                  </div>
                  <span className={`font-black ${
                    i === 0 && isVersus ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                  }`}>{p.score}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.location.reload()}
              className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 ${
                isVersus
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
              }`}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-bottom-8">
          {error}
        </div>
      )}

      {/* Footer with LMF attribution */}
      <footer className="hidden sm:block fixed bottom-0 left-0 right-0 z-20 bg-slate-900 text-white py-3 border-t-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-400">Created by</span>
          <a 
            href="https://lmf.logge.top" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            LMF <ExternalLinkIcon size={12} />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
