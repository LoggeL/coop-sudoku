import { motion } from 'motion/react';
import { CheckIcon, CrownIcon, WifiOffIcon } from 'lucide-react';
import type { PlayerView, RoomView } from '@coop-sudoku/shared';
import { useGame } from '../../lib/store.ts';
import { cn } from '../../lib/cn.ts';
import { Avatar, Card, SectionLabel } from '../ui/primitives.tsx';

const ranked = (room: RoomView) => [...room.players].sort((a, b) => b.score - a.score);
const leaderId = (players: PlayerView[]) => (players.length > 1 && players[0].score > 0 ? players[0].id : null);

/** Desktop sidebar card */
export function PlayersPanel() {
  const room = useGame((s) => s.room)!;
  const players = ranked(room);
  const leader = leaderId(players);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Players</SectionLabel>
        <span className="text-xs text-subtle">{room.players.length}/4</span>
      </div>
      <ul className="space-y-1">
        {players.map((p) => {
          const me = p.id === room.you;
          return (
            <motion.li
              key={p.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className={cn('rounded-xl px-2.5 py-2', me && 'bg-surface-2')}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={p.name} color={p.color} size={30} dim={!p.connected} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('truncate text-sm font-medium', !p.connected && 'text-subtle')}>{p.name}</span>
                    {me && <span className="rounded-md bg-surface-3 px-1 text-[10px] font-semibold text-muted">YOU</span>}
                    {p.id === leader && <CrownIcon size={13} className="shrink-0 text-amber-400" />}
                    {!p.connected && <WifiOffIcon size={12} className="shrink-0 text-subtle" />}
                    {room.mode === 'versus' && p.finished && <CheckIcon size={14} className="shrink-0 text-emerald-500" />}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: p.color }}
                      initial={false}
                      animate={{ width: `${Math.round(p.progress * 100)}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right font-display text-sm font-semibold tabular-nums">{p.score}</span>
              </div>
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-[11px] text-subtle">
        {room.mode === 'coop' ? 'Bars show how much of the puzzle each player solved.' : 'Bars show each board’s progress.'}
      </p>
    </Card>
  );
}

/** Compact horizontal strip for phones and tablets */
export function PlayersStrip() {
  const room = useGame((s) => s.room)!;
  const players = ranked(room);
  const leader = leaderId(players);

  return (
    <div className="scrollbar-none -mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3">
      {players.map((p) => (
        <motion.div
          key={p.id}
          layout
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1',
            p.id === room.you ? 'border-line-strong bg-surface' : 'border-line bg-surface/60',
          )}
        >
          <span className="relative">
            <Avatar name={p.name} color={p.color} size={26} dim={!p.connected} />
            {p.id === leader && <CrownIcon size={11} className="absolute -top-1.5 -right-1 text-amber-400" />}
          </span>
          <span className="max-w-24 truncate text-xs font-medium">{p.name}</span>
          <span className="font-display text-xs font-semibold text-muted tabular-nums">{p.score}</span>
          {room.mode === 'versus' && (
            <span className="text-[10px] text-subtle tabular-nums">{p.finished ? '✓' : `${Math.round(p.progress * 100)}%`}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
