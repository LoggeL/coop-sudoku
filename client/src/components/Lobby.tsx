import React, { useState } from 'react';
import type { Difficulty, GameMode } from '../../../shared/types';
import { generateName } from '../utils/nameGenerator';
import { ArrowRightIcon, DicesIcon, ExternalLinkIcon, Grid3x3Icon, UsersIcon, SwordsIcon } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (name: string, difficulty: Difficulty, mode: GameMode) => void;
  onJoinRoom: (roomId: string, name: string) => void;
  initialRoomCode?: string;
}

const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom, initialRoomCode = '' }) => {
  const [name, setName] = useState(generateName());
  const [roomId, setRoomId] = useState((initialRoomCode || '').toUpperCase());
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<GameMode>('coop');
  const invited = Boolean(initialRoomCode);

  const joinSection = (
    <div className={invited ? 'p-4 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 space-y-3' : 'space-y-3'}>
      {invited && (
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
          You've been invited to a room!
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          placeholder="ROOM CODE"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none transition-all text-center font-mono tracking-[0.3em] font-bold uppercase placeholder:tracking-widest placeholder:font-sans placeholder:font-normal"
          maxLength={6}
        />
        <button
          onClick={() => roomId.length === 6 && onJoinRoom(roomId, name)}
          disabled={roomId.length !== 6}
          className="px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
        >
          Join <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );

  const createSection = (
    <div className="space-y-4">
      {/* Mode cards */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'coop' as GameMode, icon: UsersIcon, title: 'Coop', desc: 'Solve together' },
          { key: 'versus' as GameMode, icon: SwordsIcon, title: 'Versus', desc: 'Race to claim cells' },
        ]).map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              mode === key
                ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Icon size={18} className={mode === key ? 'text-red-500' : 'text-slate-400'} />
            <p className="font-bold text-sm mt-1.5">{title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
          </button>
        ))}
      </div>

      {/* Difficulty segmented control */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              difficulty === d
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <button
        onClick={() => onCreateRoom(name, difficulty, mode)}
        className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 transition-all active:scale-[0.98]"
      >
        Create {mode === 'versus' ? 'Versus' : 'Coop'} Room
      </button>
    </div>
  );

  const divider = (label: string) => (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 anim-pop">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30 mb-3">
            <Grid3x3Icon size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Coop Sudoku</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Solve puzzles together — or compete!</p>
        </div>

        {/* Nickname */}
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium"
            placeholder="Your nickname"
          />
          <button
            onClick={() => setName(generateName())}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
            title="Randomize name"
          >
            <DicesIcon size={20} />
          </button>
        </div>

        {invited ? (
          <>
            {joinSection}
            {divider('or create new')}
            {createSection}
          </>
        ) : (
          <>
            {createSection}
            {divider('or join existing')}
            {joinSection}
          </>
        )}

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pt-1">
          Created by{' '}
          <a
            href="https://lmf.logge.top"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-red-500 hover:text-red-400 transition-colors inline-flex items-center gap-0.5"
          >
            LMF <ExternalLinkIcon size={10} />
          </a>
        </p>
      </div>
    </div>
  );
};

export default Lobby;
