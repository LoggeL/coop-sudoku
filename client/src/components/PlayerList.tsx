import React from 'react';
import type { Player } from '../../../shared/types';
import { CrownIcon } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const hasScores = sorted.some((p) => p.score !== 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="hidden lg:block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 pt-3">
        Players
      </h3>
      {/* Horizontal chips on mobile, vertical list on desktop */}
      <div className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto p-2 lg:p-2">
        {sorted.map((player, i) => {
          const isMe = player.id === currentPlayerId;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg shrink-0 lg:shrink ${
                isMe ? 'bg-sky-50 dark:bg-sky-500/10' : ''
              }`}
            >
              <span
                className="w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-white text-[10px] lg:text-xs font-bold uppercase shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-semibold truncate leading-tight">
                  {player.name}
                  {isMe && <span className="ml-1 text-[9px] font-medium text-slate-400">you</span>}
                </p>
                <p className="text-[10px] lg:text-xs text-slate-400 dark:text-slate-500 font-medium leading-tight">
                  {player.score} pts
                </p>
              </div>
              {hasScores && i === 0 && (
                <CrownIcon size={14} className="text-amber-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;
