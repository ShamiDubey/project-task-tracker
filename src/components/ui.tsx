/**
 * The small set of visual primitives the whole application is built from. Kept deliberately thin —
 * this is a take-home, not a design system, and every component here earns its place by being used
 * in at least three screens.
 */
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import type { TaskPriority, TaskStatus } from '@/db/schema';
import { STATUS_LABELS } from '@/lib/task-status';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ badges */

const STATUS_STYLES: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-info-soft text-info ring-blue-200',
  in_review: 'bg-warn-soft text-warn ring-amber-200',
  blocked: 'bg-danger-soft text-danger ring-red-200',
  done: 'bg-good-soft text-good ring-green-200',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'text-ink-subtle',
  medium: 'text-info',
  high: 'text-warn',
  urgent: 'text-danger font-semibold',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs', PRIORITY_STYLES[priority])}>
      <span aria-hidden className="text-[10px] leading-none">
        {priority === 'urgent' ? '▲▲' : priority === 'high' ? '▲' : priority === 'medium' ? '■' : '▼'}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger ring-1 ring-inset ring-red-200">
      Overdue
    </span>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs',
        tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-ink-muted',
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- avatars */

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return (
    <span
      title={name}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
        AVATAR_TONES[sum % AVATAR_TONES.length],
        size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs',
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-xs text-ink-subtle">Unassigned</span>;
  return (
    <span className="flex -space-x-1.5">
      {names.slice(0, 4).map((n) => (
        <span key={n} className="ring-2 ring-surface rounded-full">
          <Avatar name={n} size="sm" />
        </span>
      ))}
      {names.length > 4 && (
        <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-1.5 text-[10px] text-ink-muted ring-2 ring-surface">
          +{names.length - 4}
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------- surface */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-line bg-surface', className)}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-accent text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-slate-50',
  ghost: 'text-ink-muted hover:bg-slate-100 hover:text-ink',
  danger: 'bg-surface text-danger ring-1 ring-inset ring-red-200 hover:bg-danger-soft',
};

export function buttonClass(tone: ButtonTone = 'primary', size: 'sm' | 'md' = 'md') {
  return cx(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
    BUTTON_TONES[tone],
  );
}

export function Button({
  tone = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<'button'> & { tone?: ButtonTone; size?: 'sm' | 'md' }) {
  return <button {...rest} className={cx(buttonClass(tone, size), className)} />;
}

export function LinkButton({
  tone = 'secondary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<typeof Link> & { tone?: ButtonTone; size?: 'sm' | 'md' }) {
  return <Link {...rest} className={cx(buttonClass(tone, size), className)} />;
}

/* ------------------------------------------------------------------ inputs */

export const fieldClass =
  'block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-subtle focus:ring-2 focus:ring-inset focus:ring-accent';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ alerts */

export function Notice({ tone = 'danger', children }: { tone?: 'danger' | 'good' | 'info'; children: ReactNode }) {
  const tones = {
    danger: 'bg-danger-soft text-danger ring-red-200',
    good: 'bg-good-soft text-good ring-green-200',
    info: 'bg-info-soft text-info ring-blue-200',
  };
  return (
    <div className={cx('rounded-lg px-3 py-2 text-sm ring-1 ring-inset', tones[tone])} role="alert">
      {children}
    </div>
  );
}
