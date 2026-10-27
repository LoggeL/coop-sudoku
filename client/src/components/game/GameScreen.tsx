import { AnimatePresence, motion } from 'motion/react';
import { HourglassIcon } from 'lucide-react';
import { SCORING } from '@coop-sudoku/shared';
import { useGame } from '../../lib/store.ts';
import { useKeyboard } from '../../hooks/useKeyboard.ts';
import { Card, SectionLabel } from '../ui/primitives.tsx';
import { Board } from './Board.tsx';
import { ChatPanel, ChatSheet } from './Chat.tsx';
import { Controls } from './Controls.tsx';
import { GameOverDialog } from './GameOver.tsx';
import { PlayersPanel, PlayersStrip } from './Players.tsx';
import { TopBar } from './TopBar.tsx';

export function GameScreen() {
  const room = useGame((s) => s.room)!;
  const me = room.players.find((p) => p.id === room.you);
  const waiting = room.mode === 'versus' && me?.finished && !room.finishedAt;
  useKeyboard(true);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />

      <main className="mx-auto grid w-full max-w-[90rem] flex-1 grid-cols-[minmax(0,1fr)] items-start justify-center gap-6 px-3 py-3 sm:py-5 lg:grid-cols-[auto_20rem] lg:px-6 xl:grid-cols-[17rem_auto_20rem]">
        <aside className="sticky top-20 hidden space-y-4 xl:block">
          <PlayersPanel />
          <HowToPlay />
        </aside>

        <section className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="w-full lg:hidden">
            <PlayersStrip />
          </div>
          <div className="relative">
            <Board />
            <AnimatePresence>
              {waiting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center rounded-[1.1rem] bg-bg/70 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <HourglassIcon size={32} className="mx-auto mb-3 animate-pulse text-accent" />
                    <p className="font-display text-xl font-semibold">Board complete!</p>
                    <p className="text-sm text-muted">Waiting for the others to finish…</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Controls />
        </section>

        <aside className="sticky top-20 hidden h-[calc(100dvh-7rem)] flex-col gap-4 lg:flex">
          <div className="xl:hidden">
            <PlayersPanel />
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel />
          </div>
        </aside>
      </main>

      <ChatSheet />
      <GameOverDialog key={room.round} />
    </div>
  );
}

function HowToPlay() {
  const mode = useGame((s) => s.room!.mode);
  const scores =
    mode === 'coop'
      ? [
          ['Correct digit', `+${SCORING.coop.correct}`],
          ['Wrong digit', `${SCORING.coop.wrong}`],
          ['Hint', `${SCORING.coop.hint}`],
        ]
      : [
          ['Solved first', `+${SCORING.versus.first}`],
          ['Solved after', `+${SCORING.versus.second}`],
          ['Wrong digit', `${SCORING.versus.wrong}`],
        ];
  const keys = [
    ['1–9', 'Enter digit'],
    ['N', 'Notes mode'],
    ['⌫', 'Erase notes'],
    ['← ↑ → ↓', 'Move'],
    ...(mode === 'coop' ? [['H', 'Hint']] : []),
    ['Ctrl Z', 'Undo notes'],
  ];

  return (
    <Card className="space-y-4 p-4">
      <div>
        <SectionLabel className="mb-2">Scoring</SectionLabel>
        <dl className="space-y-1.5 text-sm">
          {scores.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-muted">{label}</dt>
              <dd className={value.startsWith('+') ? 'font-semibold text-emerald-500' : 'font-semibold text-rose-500'}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <SectionLabel className="mb-2">Shortcuts</SectionLabel>
        <dl className="space-y-1.5 text-sm">
          {keys.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <dt className="text-muted">{label}</dt>
              <dd>
                <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">{key}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
