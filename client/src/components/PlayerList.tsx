import React from 'react';
import type { Player } from '../../../shared/types';
import { UserIcon } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Players</h3>
      <div className="space-y-2">
        {[...players].sort((a, b) => b.score - a.score).map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              player.id === currentPlayerId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: player.color }}
            >
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {player.name} {player.id === currentPlayerId && <span className="text-[10px] opacity-60">(You)</span>}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {player.score} points
              </p>
            </div>
            {player.score > 0 && (
              <div className="text-xs font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                #{[...players].sort((a, b) => b.score - a.score).findIndex(p => p.id === player.id) + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
