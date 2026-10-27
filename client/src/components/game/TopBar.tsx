import { useEffect, useState } from 'react';
import { CheckIcon, ClockIcon, LinkIcon, LogOutIcon, SwordsIcon, UsersIcon } from 'lucide-react';
import { inviteLink, leaveRoom, toast, useGame } from '../../lib/store.ts';
import { useElapsed } from '../../hooks/useElapsed.ts';
import { cn } from '../../lib/cn.ts';
import { IconButton, Logo, ThemeToggle } from '../ui/primitives.tsx';
import { ChatButton } from './Chat.tsx';

const chip = 'flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-2.5 text-sm font-medium';

export function TopBar() {
  const room = useGame((s) => s.room)!;
  const elapsed = useElapsed(room.startedAt, room.finishedAt);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!confirmLeave) return;
    const t = setTimeout(() => setConfirmLeave(false), 3000);
    return () => clearTimeout(t);
  }, [confirmLeave]);

  const share = async () => {
    const url = inviteLink(room.code);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Join my Sudoku room', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('info', 'Invite link copied');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast('error', `Copy failed — room code is ${room.code}`);
    }
  };

  const ModeIcon = room.mode === 'coop' ? UsersIcon : SwordsIcon;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-2 px-3 lg:px-6">
        <div className="mr-1 hidden items-center gap-2.5 md:flex">
          <Logo size={30} />
          <span className="font-display font-semibold tracking-tight">Coop Sudoku</span>
          <span className="mx-2 h-5 w-px bg-line-strong" />
        </div>

        <button type="button" onClick={share} className={cn(chip, 'transition hover:border-line-strong')} title="Copy invite link">
          <span className="font-mono font-semibold tracking-[0.18em]">{room.code}</span>
          {copied ? <CheckIcon size={15} className="text-emerald-500" /> : <LinkIcon size={14} className="text-subtle" />}
        </button>

        <span className={cn(chip, 'text-muted')}>
          <ModeIcon size={15} />
          <span className="hidden sm:inline">{room.mode === 'coop' ? 'Co-op' : 'Versus'}</span>
          <span className="hidden text-subtle sm:inline">·</span>
          <span className="hidden capitalize sm:inline">{room.difficulty}</span>
        </span>

        <span className={cn(chip, 'font-mono tabular-nums', room.finishedAt ? 'text-emerald-500' : 'text-muted')}>
          <ClockIcon size={14} />
          {elapsed}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ChatButton />
          <ThemeToggle />
          {confirmLeave ? (
            <button
              type="button"
              onClick={leaveRoom}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-500 px-3 text-sm font-semibold text-white transition active:scale-95"
            >
              <LogOutIcon size={15} /> Leave?
            </button>
          ) : (
            <IconButton label="Leave room" onClick={() => setConfirmLeave(true)} className="hover:text-rose-500">
              <LogOutIcon size={18} />
            </IconButton>
          )}
        </div>
      </div>
    </header>
  );
}
