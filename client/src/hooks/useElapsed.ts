import { useEffect, useState } from 'react';

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Ticking stopwatch; freezes once `finishedAt` is set */
export function useElapsed(startedAt: number, finishedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [finishedAt]);

  return formatDuration((finishedAt ?? now) - startedAt);
}
