import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRightIcon, DicesIcon, Loader2Icon, SwordsIcon, UsersIcon } from 'lucide-react';
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  SCORING,
  normalizeRoomCode,
  type Difficulty,
  type GameMode,
} from '@coop-sudoku/shared';
import { createRoom, joinRoom, roomCodeFromUrl, useGame } from '../lib/store.ts';
import { randomName, saveName, savedName } from '../lib/names.ts';
import { cn } from '../lib/cn.ts';
import { Card, Logo, PrimaryButton, SectionLabel, Segmented, ThemeToggle } from './ui/primitives.tsx';

const MODES: { value: GameMode; icon: typeof UsersIcon; title: string; text: string }[] = [
  { value: 'coop', icon: UsersIcon, title: 'Co-op', text: 'One board, shared notes, live cursors.' },
  { value: 'versus', icon: SwordsIcon, title: 'Versus', text: 'Same puzzle, private boards. Race!' },
];

export function Lobby() {
  const busy = useGame((s) => s.busy);
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(() => normalizeRoomCode(roomCodeFromUrl()));
  const [mode, setMode] = useState<GameMode>('coop');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const invited = roomCodeFromUrl().length > 0;

  const trimmedName = name.trim();
  const canJoin = trimmedName.length > 0 && code.length === ROOM_CODE_LENGTH && !busy;
  const canCreate = trimmedName.length > 0 && !busy;

  const onJoin = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canJoin) return;
    saveName(trimmedName);
    joinRoom(code, trimmedName);
  };

  const onCreate = () => {
    if (!canCreate) return;
    saveName(trimmedName);
    createRoom(trimmedName, difficulty, mode);
  };

  const joinForm = (
    <form onSubmit={onJoin} className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
        placeholder="ROOM CODE"
        aria-label="Room code"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-center font-mono text-lg font-semibold tracking-[0.35em] uppercase outline-none transition placeholder:text-sm placeholder:tracking-[0.2em] placeholder:text-subtle focus:border-accent focus:bg-surface"
      />
      <button
        type="submit"
        disabled={!canJoin}
        className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-fg px-5 font-semibold text-bg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
      >
        Join <ArrowRightIcon size={16} />
      </button>
    </form>
  );

  const createForm = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ value, icon: Icon, title, text }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={active}
              className={cn(
                'group relative rounded-2xl border p-3.5 text-left transition',
                active ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2/50 hover:border-line-strong',
              )}
            >
              <span
                className={cn(
                  'mb-2.5 grid size-9 place-items-center rounded-xl transition',
                  active ? 'bg-gradient-accent text-white' : 'bg-surface-3 text-muted',
                )}
              >
                <Icon size={18} />
              </span>
              <span className="block font-display font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{text}</span>
            </button>
          );
        })}
      </div>

      <Segmented
        value={difficulty}
        onChange={setDifficulty}
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' },
        ]}
      />

      <PrimaryButton onClick={onCreate} disabled={!canCreate} className="w-full">
        {busy ? <Loader2Icon size={18} className="animate-spin" /> : null}
        Create {mode === 'coop' ? 'co-op' : 'versus'} room
      </PrimaryButton>
    </div>
  );

  const divider = (label: string) => (
    <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );

  return (
    <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center lg:text-left"
      >
        <div className="mb-6 inline-flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-xl font-semibold tracking-tight">Coop Sudoku</span>
        </div>
        <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Sudoku, but <span className="text-gradient">together.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-pretty text-muted lg:mx-0">
          Share a link, solve in real time with up to four friends — or race them on the same puzzle.
        </p>

        <HeroBoard />

        <dl className="mx-auto mt-8 hidden max-w-md grid-cols-3 gap-3 text-left sm:grid lg:mx-0">
          {[
            ['Correct', `+${SCORING.coop.correct}`],
            ['First in versus', `+${SCORING.versus.first}`],
            ['Hint', `${SCORING.coop.hint}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface/50 px-3 py-2.5">
              <dt className="text-[11px] text-subtle">{label}</dt>
              <dd className="font-display text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
      >
        <Card className="mx-auto w-full max-w-md space-y-6 p-5 sm:p-7">
          <div className="space-y-2">
            <SectionLabel>Your name</SectionLabel>
            <div className="flex gap-2">
              <input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nickname"
                aria-label="Nickname"
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 font-medium outline-none transition focus:border-accent focus:bg-surface"
              />
              <button
                type="button"
                onClick={() => setName(randomName())}
                title="Random name"
                aria-label="Random name"
                className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted transition hover:text-fg active:rotate-90"
              >
                <DicesIcon size={20} />
              </button>
            </div>
          </div>

          {invited ? (
            <>
              <div className="space-y-2.5 rounded-2xl border border-accent/40 bg-accent-soft p-4">
                <p className="text-sm font-semibold">You've been invited to a room 🎉</p>
                {joinForm}
              </div>
              {divider('or start your own')}
              {createForm}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <SectionLabel>New game</SectionLabel>
                {createForm}
              </div>
              {divider('or join with a code')}
              {joinForm}
            </>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-subtle">
          Made by{' '}
          <a href="https://lmf.logge.top" target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
            LMF
          </a>
        </p>
      </motion.div>
    </div>
  );
}

/** Decorative board with a couple of "teammates" at work */
function HeroBoard() {
  const digits = '5 3 . . 7 . . . . 6 . . 1 9 5 . . . . 9 8 . . . . 6 .'.split(' ');
  const cursors = [
    { i: 11, color: '#38bdf8', name: 'Swift Otter' },
    { i: 24, color: '#a3e635', name: 'Neon Lynx' },
  ];
  return (
    <div className="relative mx-auto mt-10 hidden w-fit lg:mx-0 lg:block">
      <div className="grid grid-cols-9 overflow-hidden rounded-2xl border border-line-strong bg-surface/70 shadow-card backdrop-blur">
        {digits.map((d, i) => {
          const cursor = cursors.find((c) => c.i === i);
          return (
            <div
              key={i}
              className={cn(
                'relative grid size-11 place-items-center border-line font-display text-lg',
                i % 9 !== 8 && 'border-r',
                i % 3 === 2 && i % 9 !== 8 && 'border-r-line-strong',
                i < 18 && 'border-b',
                d === '.' ? 'text-transparent' : i % 4 === 0 ? 'text-accent' : 'text-fg',
              )}
            >
              {d}
              {cursor && (
                <>
                  <span className="animate-cursor absolute inset-0.5 rounded-md" style={{ boxShadow: `inset 0 0 0 2px ${cursor.color}` }} />
                  <span
                    className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-black/80"
                    style={{ background: cursor.color }}
                  >
                    {cursor.name}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
