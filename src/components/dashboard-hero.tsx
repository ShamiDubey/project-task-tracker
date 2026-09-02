'use client';

import Link from 'next/link';
import { IconArrowRight } from './icons';
import { Counter } from './counter';
import { Ref, cx } from './ui';

/**
 * The dashboard hero.
 *
 * "Good evening, Priya" on its own is a greeting card, not a landing view. This states the situation
 * as a sentence with the numbers set into it — the shape a delivery lead would actually say out loud
 * — and puts the single most urgent thing directly under it, so the first screen answers "what do I
 * do now" rather than "here is some data".
 *
 * There is no decoration on it. An earlier version washed a gradient under the cursor; the sentence
 * and the figures are the content, and a blob following the mouse only competed with them.
 */
export function DashboardHero({
  name,
  role,
  overdue,
  dueThisWeek,
  openTasks,
  focus,
}: {
  name: string;
  role: string;
  overdue: number;
  dueThisWeek: number;
  openTasks: number;
  focus: { id: string; ref: string; title: string; daysLate: number; project: string } | null;
}) {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-line bg-surface px-6 py-6 shadow-e1 md:px-8 md:py-7">
      {/* A fine grid, masked away toward the middle so it never competes with the text. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 70% 120% at 92% 0%, black, transparent 70%)',
        }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-[0.11em] text-ink-3">
            {role === 'manager' ? 'Portfolio' : 'Your projects'} · {period}
          </p>

          {/* The situation as a sentence, with the figures set into it. */}
          <h1 className="mt-2.5 max-w-2xl text-[clamp(1.35rem,2.6vw,1.9rem)] font-semibold leading-[1.28] tracking-[-0.022em] text-ink">
            {name.split(' ')[0]}, you have{' '}
            <Metric value={openTasks} tone="ink" /> open{' '}
            {openTasks === 1 ? 'task' : 'tasks'}
            {overdue > 0 ? (
              <>
                , and <Metric value={overdue} tone="danger" /> of them{' '}
                {overdue === 1 ? 'is' : 'are'} already late.
              </>
            ) : (
              <> and nothing is late.</>
            )}{' '}
            <span className="text-ink-3">
              <Metric value={dueThisWeek} tone="muted" /> more{' '}
              {dueThisWeek === 1 ? 'lands' : 'land'} this week.
            </span>
          </h1>
        </div>

        {focus && (
          <Link
            href={`/tasks/${focus.id}`}
            className="lift group/f relative w-full max-w-xs shrink-0 overflow-hidden rounded-xl border border-danger-line bg-danger-soft/60 p-3.5 backdrop-blur-sm sm:w-auto"
          >
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.09em] text-danger">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
              </span>
              Needs you first
            </p>
            <p className="mt-2 flex items-center gap-2">
              <Ref>{focus.ref}</Ref>
              <span className="min-w-0 truncate text-sm font-medium text-ink">{focus.title}</span>
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-2xs text-ink-2">
              {focus.daysLate} {focus.daysLate === 1 ? 'day' : 'days'} late · {focus.project}
              <IconArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover/f:translate-x-0 group-hover/f:opacity-100" />
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

function Metric({ value, tone }: { value: number; tone: 'ink' | 'danger' | 'muted' }) {
  return (
    <Counter
      value={value}
      className={cx(
        'font-semibold tabular-nums',
        tone === 'danger' ? 'text-danger' : tone === 'muted' ? 'text-ink-3' : 'text-accent',
      )}
    />
  );
}
