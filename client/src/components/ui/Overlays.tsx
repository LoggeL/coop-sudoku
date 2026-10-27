import { AnimatePresence, motion } from 'motion/react';
import { AlertCircleIcon, InfoIcon, WifiOffIcon, XCircleIcon } from 'lucide-react';
import { useGame } from '../../lib/store.ts';
import { cn } from '../../lib/cn.ts';

const toneStyles = {
  error: { icon: AlertCircleIcon, className: 'text-rose-500' },
  penalty: { icon: XCircleIcon, className: 'text-rose-500' },
  info: { icon: InfoIcon, className: 'text-sky-500' },
};

export function Toaster() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { icon: Icon, className } = toneStyles[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="flex items-center gap-2.5 rounded-full border border-line-strong bg-surface/95 py-2 pr-4 pl-3 text-sm font-medium shadow-card backdrop-blur-xl"
            >
              <Icon size={16} className={className} />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ConnectionBanner() {
  const status = useGame((s) => s.status);
  const ready = useGame((s) => s.ready);
  const show = ready && status === 'offline';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg">
            <WifiOffIcon size={16} />
            Connection lost — reconnecting
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn('size-1 animate-bounce rounded-full bg-amber-950')}
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
