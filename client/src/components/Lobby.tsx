import React, { useState } from 'react';
import type { Difficulty } from '../../../shared/types';
import { generateName } from '../utils/nameGenerator';
import { PuzzleIcon, UserIcon, ArrowRightIcon, PlusIcon, ExternalLinkIcon } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (name: string, difficulty: Difficulty) => void;
  onJoinRoom: (roomId: string, name: string) => void;
  initialRoomCode?: string;
}

const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom, initialRoomCode = '' }) => {
  const [name, setName] = useState(generateName());
  const [roomId, setRoomId] = useState(initialRoomCode);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl transition-all border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
            <PuzzleIcon size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Coop Sudoku</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Solve puzzles together in real-time</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <UserIcon size={16} /> Your Nickname
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-0 transition-all outline-none"
                placeholder="Enter your name"
              />
              <button
                onClick={() => setName(generateName())}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Randomize name"
              >
                🎲
              </button>
            </div>
          </div>

          {/* Show join section first if there's an initial room code */}
          {initialRoomCode ? (
            <>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-3">
                  You've been invited to join a room!
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-0 transition-all outline-none text-center font-mono tracking-widest font-bold"
                    maxLength={6}
                  />
                  <button
                    onClick={() => roomId.length === 6 && onJoinRoom(roomId, name)}
                    disabled={roomId.length !== 6}
                    className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Join <ArrowRightIcon size={18} />
                  </button>
                </div>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or create new</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        difficulty === d
                          ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onCreateRoom(name, difficulty)}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all transform active:scale-[0.98]"
                >
                  <PlusIcon size={20} /> Create New Room
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Game Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          difficulty === d
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onCreateRoom(name, difficulty)}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-red-500/25"
                  >
                    <PlusIcon size={20} /> Create Room
                  </button>
                </div>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or join existing</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:border-red-500 focus:ring-0 transition-all outline-none text-center font-mono tracking-widest"
                    maxLength={6}
                  />
                  <button
                    onClick={() => roomId.length === 6 && onJoinRoom(roomId, name)}
                    disabled={roomId.length !== 6}
                    className="px-6 py-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Join <ArrowRightIcon size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* LMF Attribution */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Created by{' '}
            <a 
              href="https://lmf.logge.top" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-red-500 hover:text-red-400 transition-colors inline-flex items-center gap-1"
            >
              LMF <ExternalLinkIcon size={10} />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
