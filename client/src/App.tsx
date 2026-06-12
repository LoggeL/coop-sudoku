import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import type { Room, Difficulty, ChatMessage, GameMode } from '../../shared/types';
import Lobby from './components/Lobby';
import Board from './components/Board';
import PlayerList from './components/PlayerList';
import Chat from './components/Chat';
import NumberPad from './components/NumberPad';
import { useTheme } from './context/ThemeContext';
import { MoonIcon, SunIcon, LogOutIcon, Share2Icon, TrophyIcon, ClockIcon, CheckIcon, UsersIcon, SwordsIcon, Grid3x3Icon } from 'lucide-react';
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
  const [disconnected, setDisconnected] = useState(false);

  // Refs for reconnect handling
  const playerNameRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const rejoiningRef = useRef(false);

  // Toast timer refs (so rapid events don't hide later toasts early)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last emitted cursor position (to skip redundant emits)
  const lastEmittedCursorRef = useRef<{ row: number; col: number } | null>(null);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (wrongMoveTimerRef.current) clearTimeout(wrongMoveTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomUpdated', (updatedRoom) => {
      rejoiningRef.current = false;
      roomIdRef.current = updatedRoom.id;
      setRoom(updatedRoom);
      setError(null);
    });

    socket.on('messageReceived', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('error', (msg) => {
      if (rejoiningRef.current) {
        // Rejoin after reconnect failed (room gone) - reset to lobby
        rejoiningRef.current = false;
        roomIdRef.current = null;
        setRoom(null);
        setMessages([]);
        setSelectedCell(null);
        setPlayerCursors({});
        showError('Could not rejoin room: ' + msg);
        return;
      }
      showError(msg);
    });

    socket.on('wrongMove', (points) => {
      if (wrongMoveTimerRef.current) clearTimeout(wrongMoveTimerRef.current);
      setWrongMoveToast(points);
      wrongMoveTimerRef.current = setTimeout(() => setWrongMoveToast(null), 2000);
    });

    socket.on('gameWon', (winnerScores) => {
      setGameWonData(winnerScores);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0ea5e9', '#10b981', '#f59e0b', '#dc2626']
      });
    });

    socket.on('cursorUpdated', (playerId, cursor) => {
      setPlayerCursors(prev => {
        if (cursor) {
          return { ...prev, [playerId]: { row: cursor.x, col: cursor.y } };
        } else {
          const rest = { ...prev };
          delete rest[playerId];
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
  }, [socket, showError]);

  // Reconnect handling: show overlay on disconnect, rejoin room on reconnect
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      setDisconnected(true);
    };

    const handleConnect = () => {
      setDisconnected(false);
      // If we were in a room before the disconnect, rejoin it.
      // The server removed us on disconnect and we reconnect with a new
      // socket id, so we re-emit joinRoom with the stored room id and name.
      if (roomIdRef.current && playerNameRef.current) {
        rejoiningRef.current = true;
        lastEmittedCursorRef.current = null;
        setPlayerCursors({});
        socket.emit('joinRoom', roomIdRef.current, playerNameRef.current);
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
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
  const roomMode = room?.mode;
  useEffect(() => {
    if (!socket || !roomMode) return;
    if (roomMode === 'versus') return; // No cursor sharing in versus

    // Skip emit when the position hasn't changed since the last emit
    const last = lastEmittedCursorRef.current;
    if (selectedCell && last && last.row === selectedCell.row && last.col === selectedCell.col) return;
    if (!selectedCell && !last) return;

    lastEmittedCursorRef.current = selectedCell;
    if (selectedCell) {
      socket.emit('updateCursor', { x: selectedCell.row, y: selectedCell.col });
    } else {
      socket.emit('updateCursor', undefined);
    }
  }, [socket, selectedCell, roomMode]);

  const handleCreateRoom = (name: string, difficulty: Difficulty, mode: GameMode) => {
    playerNameRef.current = name;
    socket?.emit('createRoom', name, difficulty, mode);
  };

  const handleJoinRoom = (roomId: string, name: string) => {
    playerNameRef.current = name;
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
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
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

  // How many of each digit are placed (and not marked wrong)
  const digitCounts = useMemo(() => {
    const counts = Array(10).fill(0);
    room?.gameState.board.forEach((row) =>
      row.forEach((cell) => {
        if (cell.value !== null && cell.isCorrect !== false) counts[cell.value]++;
      })
    );
    return counts;
  }, [room]);

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
  useEffect(() => {
    if (!socket) return;
    const isVersusMode = roomMode === 'versus';

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore key presses while typing in an input (e.g. the chat box)
      if ((e.target as HTMLElement).closest?.('input, textarea, [contenteditable="true"]')) return;

      // Ctrl+Z for undo (only in coop)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (!isVersusMode) socket.emit('undo');
        return;
      }

      if (!selectedCell) return;

      if (e.key >= '1' && e.key <= '9') {
        const val = parseInt(e.key);
        if (isNoteMode) {
          socket.emit('toggleNote', selectedCell.row, selectedCell.col, val);
        } else {
          socket.emit('makeMove', selectedCell.row, selectedCell.col, val);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (!isVersusMode) socket.emit('makeMove', selectedCell.row, selectedCell.col, null);
      } else if (e.key.toLowerCase() === 'n') {
        setIsNoteMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [socket, selectedCell, isNoteMode, roomMode]);

  // Check if current player has finished (versus mode)
  const currentPlayer = room?.players.find(p => p.id === socket?.id);
  const playerFinished = room?.mode === 'versus' && currentPlayer?.finished;

  const disconnectedBanner = disconnected && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-amber-500 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full bg-white animate-pulse" />
      Connection lost — reconnecting…
    </div>
  );

  if (!room) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:scale-105 transition-all"
          >
            {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
        </div>
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} initialRoomCode={getInitialRoomCode()} />
        {disconnectedBanner}
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold anim-toast">
            {error}
          </div>
        )}
      </div>
    );
  }

  const isVersus = room.mode === 'versus';

  const chipClass = 'flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-sm font-semibold text-slate-600 dark:text-slate-300';

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 text-white">
                <Grid3x3Icon size={16} />
              </span>
              <span className="font-extrabold tracking-tight">Coop Sudoku</span>
            </div>

            <div className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold uppercase ${
              isVersus
                ? 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400'
                : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            }`}>
              {isVersus ? <SwordsIcon size={14} /> : <UsersIcon size={14} />}
              <span className="hidden sm:inline">{isVersus ? 'Versus' : 'Coop'}</span>
            </div>

            <button
              onClick={handleCopyRoomLink}
              className={`${chipClass} hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
              title="Copy invite link"
            >
              <span className="font-mono font-bold tracking-widest">{room.id}</span>
              {copied ? <CheckIcon size={14} className="text-emerald-500" /> : <Share2Icon size={14} className="text-slate-400" />}
            </button>

            <div className={`${chipClass} hidden sm:flex capitalize`}>{room.gameState.difficulty}</div>

            <div className={`${chipClass} font-mono tabular-nums`}>
              <ClockIcon size={14} className="text-slate-400" />
              {formatTime(elapsedTime)}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Leave room"
              aria-label="Leave room"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start justify-center">
          {/* Board + controls */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-2.5">
            <div className="relative">
              <Board
                room={room}
                onMove={handleMove}
                onToggleNote={handleToggleNote}
                playerId={socket?.id || ''}
                selectedCell={selectedCell}
                setSelectedCell={setSelectedCell}
                playerCursors={isVersus ? {} : playerCursors}
              />
              {playerFinished && !room.gameState.isComplete && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-md flex items-center justify-center anim-fade">
                  <div className="text-center p-8">
                    <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-4">
                      <TrophyIcon size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">You finished!</h3>
                    <p className="text-slate-500 dark:text-slate-400">Waiting for other players...</p>
                  </div>
                </div>
              )}
            </div>

            <NumberPad
              selectedValue={selectedCellValue}
              isNoteMode={isNoteMode}
              digitCounts={digitCounts}
              isVersus={isVersus}
              onNumberClick={handleNumberClick}
              onClear={handleClear}
              onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
              onUndo={handleUndo}
              onHint={handleHint}
            />
          </div>

          {/* Players + chat */}
          <div className="order-2 lg:order-1 w-full lg:w-64 space-y-4 shrink-0">
            <PlayerList players={room.players} currentPlayerId={socket?.id || ''} />
            <Chat messages={messages} onSendMessage={(text) => socket?.emit('sendMessage', text)} currentPlayerId={socket?.id || ''} />
          </div>

          {/* Rules card (desktop only) */}
          <aside className="order-3 hidden xl:block w-64 shrink-0">
            <div className={`p-5 rounded-xl text-white shadow-lg ${
              isVersus
                ? 'bg-gradient-to-br from-orange-500 to-orange-700'
                : 'bg-gradient-to-br from-red-600 to-rose-800'
            }`}>
              <h3 className="font-bold flex items-center gap-2 mb-2 text-sm">
                <TrophyIcon size={16} /> {isVersus ? 'Versus Rules' : 'Objective'}
              </h3>
              {isVersus ? (
                <>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Race to fill cells on your own board! First to claim a cell gets bonus points.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">First</p>
                      <p className="font-bold text-emerald-300">+100</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Claimed</p>
                      <p className="font-bold">+50</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Wrong</p>
                      <p className="font-bold text-rose-300">-250</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Fill the grid together. Each row, column, and 3x3 box must contain the numbers 1-9.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Correct</p>
                      <p className="font-bold text-emerald-300">+10</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Mistake</p>
                      <p className="font-bold text-rose-300">-5</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-70 font-bold tracking-wider">Hint</p>
                      <p className="font-bold">-15</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
              Created by{' '}
              <a href="https://lmf.logge.top" target="_blank" rel="noopener noreferrer" className="font-bold text-red-500 hover:text-red-400 transition-colors">
                LMF
              </a>
            </p>
          </aside>
        </div>
      </main>

      {disconnectedBanner}

      {/* Wrong move toast */}
      {wrongMoveToast !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold anim-toast">
          Wrong number! -{wrongMoveToast} pts
        </div>
      )}

      {gameWonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm anim-fade">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-2xl text-center border border-slate-200 dark:border-slate-800 anim-pop">
            <div className={`inline-flex p-4 rounded-full mb-5 ${
              isVersus
                ? 'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400'
                : 'bg-amber-100 dark:bg-amber-500/15 text-amber-500'
            }`}>
              <TrophyIcon size={44} />
            </div>
            {(() => {
              const standings = [...gameWonData].sort((a, b) => b.score - a.score);
              return (
                <>
                  {isVersus ? (
                    <>
                      <h2 className="text-3xl font-extrabold mb-1">{standings[0]?.name} wins!</h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">Final standings</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-extrabold mb-1">Victory!</h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">The puzzle has been solved!</p>
                    </>
                  )}

                  <div className="space-y-2 mb-6">
                    {standings.map((p, i) => (
                      <div key={p.name} className={`flex items-center justify-between p-3 rounded-xl border ${
                        i === 0 && isVersus
                          ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`font-extrabold ${i === 0 && isVersus ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`}>
                            #{i + 1}
                          </span>
                          <span className="font-bold">{p.name}</span>
                          {i === 0 && isVersus && <span className="text-lg">👑</span>}
                        </div>
                        <span className={`font-extrabold ${
                          i === 0 && isVersus ? 'text-orange-600 dark:text-orange-400' : 'text-sky-600 dark:text-sky-400'
                        }`}>{p.score}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            <button
              onClick={() => window.location.reload()}
              className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] ${
                isVersus
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
                  : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-red-600/25'
              }`}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold anim-toast">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
