import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PartyPopperIcon, TrophyIcon } from 'lucide-react';
import type { Difficulty } from '@coop-sudoku/shared';
import { dismissResults, leaveRoom, newGame, useGame } from '../../lib/store.ts';
import { formatDuration } from '../../hooks/useElapsed.ts';
import { cn } from '../../lib/cn.ts';
import { Avatar, PrimaryButton, Segmented } from '../ui/primitives.tsx';

export function GameOverDialog() {
  const room = useGame((s) => s.room)!;
  const dismissed = useGame((s) => s.dismissedRound === s.room?.round);
  const [difficulty, setDifficulty] = useState<Difficulty>(room.difficulty);
  const open = room.finishedAt !== null && !dismissed;

  const standings = [...room.players].sort((a, b) => b.score - a.score);
  const winner = standings[0];
  const versus = room.mode === 'versus';
  const duration = room.finishedAt ? formatDuration(room.finishedAt - room.startedAt) : '';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissResults}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="game-over-title"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="bg-gradient-accent pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full opacity-20 blur-3xl" />

            <div className="bg-gradient-accent relative mx-auto mb-4 grid size-16 place-items-center rounded-2xl text-white shadow-xl shadow-rose-500/30">
              {versus ? <TrophyIcon size={30} /> : <PartyPopperIcon size={30} />}
            </div>
            <h2 id="game-over-title" className="relative font-display text-3xl font-semibold tracking-tight">
              {versus ? `${winner?.name ?? 'Nobody'} wins!` : 'Puzzle solved!'}
            </h2>
            <p className="relative mt-1 text-muted">
              {versus ? 'Final standings' : 'Great teamwork'} · {duration}
            </p>

            <ol className="relative mt-6 space-y-2 text-left">
              {standings.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                    i === 0 && versus ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface-2/60',
                  )}
                >
                  <span className="w-5 text-center font-display font-semibold text-subtle">{i + 1}</span>
                  <Avatar name={p.name} color={p.color} size={30} />
                  <span className="flex-1 truncate font-medium">
                    {p.name}
                    {p.id === room.you && <span className="ml-1.5 text-xs text-subtle">you</span>}
                  </span>
                  <span className="font-display text-lg font-semibold tabular-nums">{p.score}</span>
                </motion.li>
              ))}
            </ol>

            <div className="relative mt-6 space-y-3">
              <Segmented
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
              <PrimaryButton className="w-full" onClick={() => newGame(difficulty)}>
                Play another round
              </PrimaryButton>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={dismissResults} className="h-11 rounded-xl border border-line text-sm font-medium text-muted transition hover:text-fg">
                  View board
                </button>
                <button type="button" onClick={leaveRoom} className="h-11 rounded-xl border border-line text-sm font-medium text-muted transition hover:text-rose-500">
                  Leave room
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
