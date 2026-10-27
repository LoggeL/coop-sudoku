import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from '../../lib/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="bg-gradient-accent inline-grid shrink-0 place-items-center rounded-[30%] shadow-lg shadow-rose-500/25"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="white" aria-hidden>
        {[0, 1, 2].flatMap((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}${c}`}
              x={1 + c * 8}
              y={1 + r * 8}
              width={6}
              height={6}
              rx={1.8}
              opacity={r === c ? 1 : 0.45}
            />
          )),
        )}
      </svg>
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface/80 shadow-card backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase', className)}>{children}</h2>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle}>
      {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </IconButton>
  );
}

export function Avatar({ name, color, size = 32, dim }: { name: string; color: string; size?: number; dim?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-black/80', dim && 'opacity-40 grayscale')}
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg py-2 text-sm font-medium transition',
            value === o.value ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'bg-gradient-accent relative inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white',
        'shadow-lg shadow-rose-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:hover:brightness-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
