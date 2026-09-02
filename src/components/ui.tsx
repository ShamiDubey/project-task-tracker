/**
 * Cadence — the visual primitives.
 *
 * Two rules hold this together:
 *
 *  1. Components refer only to semantic tokens (`surface`, `ink-2`, `danger`), never to a raw
 *     palette value. That is what makes the dark theme a change in one file rather than fifty.
 *  2. Red, amber and emerald are reserved for overdue, at-risk and done. The brand violet never
 *     carries a status meaning, so a coloured pixel always means the same thing anywhere you see it.
 */
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import type { TaskPriority, TaskStatus } from '@/db/schema';
import { STATUS_LABELS } from '@/lib/task-status';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ status */

/**
 * Every status badge carries a small shape as well as a colour — a ring, a half-filled ring, a
 * cross, a tick. Colour alone would leave the five states indistinguishable to anyone who cannot
 * separate red from green, and would flatten entirely in a screenshot printed in mono.
 */
const STATUS_STYLE: Record<TaskStatus, { chip: string; dot: ReactNode }> = {
  backlog: {
    chip: 'bg-surface-2 text-ink-2 ring-line-strong',
    dot: <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.6" />,
  },
  in_progress: {
    chip: 'bg-info-soft text-info ring-info-line',
    dot: (
      <>
        <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 1.6a3.4 3.4 0 0 1 0 6.8Z" fill="currentColor" />
      </>
    ),
  },
  in_review: {
    chip: 'bg-warn-soft text-warn ring-warn-line',
    dot: (
      <>
        <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      </>
    ),
  },
  blocked: {
    chip: 'bg-danger-soft text-danger ring-danger-line',
    dot: (
      <>
        <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m2.6 2.6 4.8 4.8" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
  done: {
    chip: 'bg-good-soft text-good ring-good-line',
    dot: (
      <>
        <circle cx="5" cy="5" r="4.2" fill="currentColor" />
        <path d="m3.1 5.1 1.4 1.4 2.5-2.7" fill="none" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
};

export function StatusBadge({ status, size = 'md' }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  const { chip, dot } = STATUS_STYLE[status];
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-[3px] text-xs',
        chip,
      )}
    >
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
        {dot}
      </svg>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ---------------------------------------------------------------- priority */

/**
 * Priority reads as a four-step meter rather than a colour swatch, so relative weight is legible
 * at a glance down a column without having to decode which colour outranks which.
 */
const PRIORITY_META: Record<TaskPriority, { label: string; bars: number; tone: string }> = {
  low: { label: 'Low', bars: 1, tone: 'text-ink-3' },
  medium: { label: 'Medium', bars: 2, tone: 'text-info' },
  high: { label: 'High', bars: 3, tone: 'text-warn' },
  urgent: { label: 'Urgent', bars: 4, tone: 'text-danger' },
};

export function PriorityBadge({ priority, showLabel = true }: { priority: TaskPriority; showLabel?: boolean }) {
  const { label, bars, tone } = PRIORITY_META[priority];
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs', tone)} title={`${label} priority`}>
      <span className="flex items-end gap-[1.5px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cx('w-[2.5px] rounded-full', i < bars ? 'bg-current' : 'bg-current opacity-20')}
            style={{ height: `${4 + i * 2.5}px` }}
          />
        ))}
      </span>
      {showLabel && label}
      {!showLabel && <span className="sr-only">{label} priority</span>}
    </span>
  );
}

export function OverdueBadge({ days }: { days?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2 py-[3px] text-2xs font-semibold text-danger ring-1 ring-inset ring-danger-line">
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
      </span>
      {days ? `${days}d overdue` : 'Overdue'}
    </span>
  );
}

/** Task references are monospaced — they are identifiers, and they line up in a column. */
export function Ref({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-2xs font-medium tracking-tight',
        tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2',
      )}
    >
      {children}
    </span>
  );
}

export const Pill = Ref;

/* ----------------------------------------------------------------- avatars */

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_TONES = [
  'bg-[#e9e5fd] text-[#4b3cc0] dark:bg-[#2a2450] dark:text-[#b3a9f7]',
  'bg-[#d9f2e5] text-[#08734a] dark:bg-[#133324] dark:text-[#6ed6a5]',
  'bg-[#fdeacd] text-[#8a4d05] dark:bg-[#33260f] dark:text-[#e8bd72]',
  'bg-[#fbdedb] text-[#a92f26] dark:bg-[#331a17] dark:text-[#f2988f]',
  'bg-[#d6e8fb] text-[#15549e] dark:bg-[#132738] dark:text-[#84b6f0]',
  'bg-[#f0dcf7] text-[#7a2b91] dark:bg-[#2c1734] dark:text-[#d69bea]',
];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  const dims = {
    xs: 'h-4.5 w-4.5 text-[9px]',
    sm: 'h-5.5 w-5.5 text-[10px]',
    md: 'h-7 w-7 text-xs',
    lg: 'h-9 w-9 text-sm',
  }[size];
  return (
    <span
      title={name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', AVATAR_TONES[sum % AVATAR_TONES.length], dims)}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) {
    return <span className="text-2xs text-ink-3">Unassigned</span>;
  }
  return (
    <span className="flex -space-x-1.5" title={names.join(', ')}>
      {names.slice(0, max).map((n) => (
        <span key={n} className="rounded-full ring-2 ring-surface">
          <Avatar name={n} size="sm" />
        </span>
      ))}
      {names.length > max && (
        <span className="inline-flex h-5.5 items-center rounded-full bg-surface-2 px-1.5 text-[10px] font-medium text-ink-2 ring-2 ring-surface">
          +{names.length - max}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- surfaces */

export function Card({
  children,
  className,
  elevation = 1,
}: {
  children: ReactNode;
  className?: string;
  elevation?: 0 | 1 | 2;
}) {
  return (
    <div
      className={cx(
        'rounded-xl border border-line bg-surface',
        elevation === 1 && 'shadow-e1',
        elevation === 2 && 'shadow-e2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Empty states get a drawn mark rather than a bare sentence. An empty screen is the one a new user
 * is most likely to see first, and "nothing here" with no shape reads as broken rather than empty.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <svg viewBox="0 0 48 48" className="mb-4 h-11 w-11 text-ink-3" fill="none" aria-hidden>
        <rect x="7" y="10" width="34" height="28" rx="4" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
        <path d="M14 19h13M14 25h20M14 31h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
        <circle cx="34.5" cy="32.5" r="7.5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
        <path d="M31.6 32.5h5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary:
    'bg-accent text-on-accent shadow-e1 hover:bg-accent-hover active:scale-[0.985] disabled:opacity-50',
  secondary:
    'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2 active:scale-[0.985]',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-surface text-danger ring-1 ring-inset ring-danger-line hover:bg-danger-soft active:scale-[0.985]',
};

export function buttonClass(tone: ButtonTone = 'primary', size: 'xs' | 'sm' | 'md' = 'md') {
  return cx(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-55',
    size === 'xs' ? 'px-2 py-1 text-2xs' : size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
    BUTTON_TONES[tone],
  );
}

export function Button({
  tone = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<'button'> & { tone?: ButtonTone; size?: 'xs' | 'sm' | 'md' }) {
  return <button {...rest} className={cx(buttonClass(tone, size), className)} />;
}

export function LinkButton({
  tone = 'secondary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<typeof Link> & { tone?: ButtonTone; size?: 'xs' | 'sm' | 'md' }) {
  return <Link {...rest} className={cx(buttonClass(tone, size), className)} />;
}

/* ------------------------------------------------------------------ inputs */

export const fieldClass =
  'block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm text-ink ring-1 ring-inset ring-line-strong transition-shadow placeholder:text-ink-3 focus:ring-2 focus:ring-inset focus:ring-accent';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-ink-2">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ notice */

export function Notice({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'good' | 'info' | 'warn';
  children: ReactNode;
}) {
  const tones = {
    danger: 'bg-danger-soft text-danger ring-danger-line',
    good: 'bg-good-soft text-good ring-good-line',
    info: 'bg-info-soft text-info ring-info-line',
    warn: 'bg-warn-soft text-warn ring-warn-line',
  };
  return (
    <div className={cx('animate-pop rounded-lg px-3 py-2 text-sm leading-relaxed ring-1 ring-inset', tones[tone])} role="alert">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- skeletons */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />;
}
