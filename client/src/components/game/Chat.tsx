import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircleIcon, SendHorizontalIcon, XIcon } from 'lucide-react';
import { CHAT_MAX_LENGTH } from '@coop-sudoku/shared';
import { sendChat, setChatOpen, useGame } from '../../lib/store.ts';
import { cn } from '../../lib/cn.ts';
import { Card, IconButton, SectionLabel } from '../ui/primitives.tsx';

function Messages() {
  const chat = useGame((s) => s.chat);
  const you = useGame((s) => s.room?.you);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
      {chat.length === 0 && <p className="pt-8 text-center text-sm text-subtle">No messages yet — say hi 👋</p>}
      {chat.map((m, i) => {
        if (m.system) {
          return (
            <p key={m.id} className="py-1 text-center text-[11px] text-subtle">
              {m.text}
            </p>
          );
        }
        const mine = m.playerId === you;
        const grouped = chat[i - 1]?.playerId === m.playerId && !chat[i - 1]?.system;
        return (
          <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start', grouped && '-mt-1')}>
            {!grouped && !mine && (
              <span className="mb-0.5 px-1 text-[11px] font-semibold" style={{ color: m.color }}>
                {m.name}
              </span>
            )}
            <p
              title={new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap',
                mine ? 'bg-gradient-accent rounded-br-md text-white' : 'rounded-bl-md bg-surface-2',
              )}
            >
              {m.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ autoFocus }: { autoFocus?: boolean }) {
  const [text, setText] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-line p-2.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={CHAT_MAX_LENGTH}
        placeholder="Message"
        aria-label="Chat message"
        autoFocus={autoFocus}
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Send"
        className="bg-gradient-accent grid size-10 shrink-0 place-items-center rounded-xl text-white transition active:scale-95 disabled:opacity-30"
      >
        <SendHorizontalIcon size={17} />
      </button>
    </form>
  );
}

export function ChatPanel() {
  return (
    <Card className="flex h-full min-h-80 flex-col overflow-hidden">
      <SectionLabel className="border-b border-line px-4 py-3">Chat</SectionLabel>
      <Messages />
      <Composer />
    </Card>
  );
}

/** Top-bar trigger with unread badge, small screens only */
export function ChatButton() {
  const unread = useGame((s) => s.unread);
  return (
    <IconButton label="Open chat" onClick={() => setChatOpen(true)} className="relative lg:hidden">
      <MessageCircleIcon size={19} />
      {unread > 0 && (
        <span className="bg-gradient-accent absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </IconButton>
  );
}

/** Bottom sheet on small screens */
export function ChatSheet() {
  const open = useGame((s) => s.chatOpen);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Chat"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 120 && setChatOpen(false)}
              className="absolute inset-x-0 bottom-0 flex h-[70dvh] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
            >
              <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="font-display font-semibold">Chat</span>
                <IconButton label="Close chat" onClick={() => setChatOpen(false)}>
                  <XIcon size={18} />
                </IconButton>
              </div>
              <Messages />
              <Composer />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
