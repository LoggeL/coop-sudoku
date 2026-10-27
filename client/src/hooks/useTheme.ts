import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The initial theme is applied by an inline script in index.html before first paint */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read);

  const toggle = useCallback(() => {
    const next: Theme = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Not persisted in private mode
    }
    listeners.forEach((l) => l());
  }, []);

  return { theme, toggle };
}
