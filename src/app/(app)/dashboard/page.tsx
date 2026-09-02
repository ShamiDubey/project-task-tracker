import Link from 'next/link';
import type { CSSProperties } from 'react';

import { CompletionsChart } from '@/components/completions-chart';
import { Counter, Sparkline } from '@/components/counter';
import { DashboardHero } from '@/components/dashboard-hero';
import { Tilt } from '@/components/motion';
import { IconArrowRight } from '@/components/icons';
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  OverdueBadge,
  PriorityBadge,
  Ref,
  cx,
} from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { relativeDue, todayISO } from '@/lib/dates';
import {
  completionsByWeek,
  countsByStatus,
  headlineNumbers,
  loadByAssignee,
  mostOverdue,
  portfolioHealth,
  recentTrend,
} from '@/lib/queries/dashboard';
import { STATUS_LABELS, STATUS_ORDER, taskRef } from '@/lib/task-status';

export const metadata = { title: 'Dashboard' };

const delay = (i: number) => ({ '--i': i }) as CSSProperties;

function Stat({
  i,
  label,
  value,
  tone = 'neutral',
  href,
  note,
  trend,
}: {
  i: number;
  label: string;
  value: number;
  tone?: 'neutral' | 'danger' | 'good';
  href?: string;
  note?: string;
  trend?: number[];
}) {
  const alarmed = tone === 'danger' && value > 0;
  const inner = (
    <Tilt max={5} className="h-full">
      <div
        style={delay(i)}
        className={cx(
          'reveal group relative h-full overflow-hidden rounded-xl border bg-surface px-4 py-3.5 shadow-e1 transition-shadow duration-200',
          alarmed ? 'border-danger-line' : 'border-line',
          href && 'hover:shadow-e2',
        )}
      >
      {/* A tint that only appears on the tile that needs attention. */}
        {alarmed && (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-danger opacity-[0.07] blur-2xl"
          />
        )}
        <div className="relative z-[2] flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-2">{label}</p>
          {href && (
            <IconArrowRight className="h-3.5 w-3.5 -translate-x-1 text-ink-3 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          )}
        </div>
        <div className="relative z-[2] mt-1.5 flex items-end justify-between gap-3">
          <Counter
            value={value}
            className={cx(
              'text-[30px] font-semibold leading-none tracking-tight',
              alarmed ? 'text-danger' : tone === 'good' ? 'text-good' : 'text-ink',
            )}
          />
          {trend && <Sparkline points={trend} tone={tone === 'neutral' ? 'accent' : tone} />}
        </div>
        {note && <p className="mt-2 text-2xs text-ink-3">{note}</p>}
      </div>
    </Tilt>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [headline, byStatus, byAssignee, completions, overdue, trend, portfolio] = await Promise.all([
    headlineNumbers(user),
    countsByStatus(user),
    loadByAssignee(user),
    completionsByWeek(user),
    mostOverdue(user),
    recentTrend(user),
    portfolioHealth(user),
  ]);

  const statusMap = new Map(byStatus.map((r) => [r.status, r.n]));
  const totalTasks = byStatus.reduce((sum, r) => sum + r.n, 0);
  const busiest = byAssignee[0]?.open ?? 0;
  const completionTrend = completions.slice(-6).map((c) => c.count);

  // The single thing most worth doing first: whatever has been late the longest.
  const worst = overdue[0];
  const focus = worst
    ? {
        id: worst.id,
        ref: taskRef(worst.projectKey, worst.number),
        title: worst.title,
        project: worst.projectKey,
        daysLate: Math.max(
          1,
          Math.round(
            (new Date(`${todayISO()}T00:00:00`).getTime() -
              new Date(`${worst.dueDate}T00:00:00`).getTime()) / 86400000,
          ),
        ),
      }
    : null;

  return (
    <>
      <div className="reveal" style={delay(0)}>
        <DashboardHero
          name={user.name}
          role={user.role}
          overdue={headline.overdueTasks}
          dueThisWeek={headline.dueThisWeek}
          openTasks={headline.openTasks}
          focus={focus}
        />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat i={1} label="Open tasks" value={headline.openTasks} href="/tasks?status=open" note="Everything not finished" trend={trend} />
        <Stat i={2} label="Overdue" value={headline.overdueTasks} tone="danger" href="/tasks?overdue=1" note="Past due, not finished" />
        <Stat i={3} label="Due this week" value={headline.dueThisWeek} note="Monday to Sunday" />
        <Stat i={4} label="Completed this week" value={headline.completedThisWeek} tone="good" note="Moved to Done" trend={completionTrend} />
      </section>

      {/* The portfolio at a glance: one bar per project, segmented by state. Sorted by how late each
          one is, so the project that needs attention is the top line rather than something to find. */}
      <section className="reveal mt-4" style={delay(5)}>
        <Card>
          <CardHeader
            title="The portfolio"
            subtitle="One line per project, ordered by how much is already late."
            action={
              <Link href="/projects" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                All projects <IconArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {portfolio.map((p, i) => {
              const total = Math.max(1, p.open + p.done);
              const seg = (n: number) => `${(n / total) * 100}%`;
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <Ref tone="accent">{p.key}</Ref>
                    <span className="w-40 shrink-0 truncate text-sm text-ink transition-colors group-hover:text-accent">
                      {p.name}
                    </span>
                    <span className="flex h-2.5 flex-1 gap-px overflow-hidden rounded-full bg-sunk">
                      <span
                        className="reveal-line h-full bg-danger"
                        style={{ width: seg(p.overdue), ...delay(i) }}
                        title={`${p.overdue} overdue`}
                      />
                      <span
                        className="reveal-line h-full bg-warn"
                        style={{ width: seg(p.blocked), ...delay(i) }}
                        title={`${p.blocked} blocked`}
                      />
                      <span
                        className="reveal-line h-full bg-accent"
                        style={{ width: seg(Math.max(0, p.open - p.overdue - p.blocked)), ...delay(i) }}
                        title={`${p.open - p.overdue - p.blocked} in flight`}
                      />
                      <span
                        className="reveal-line h-full bg-good/45"
                        style={{ width: seg(p.done), ...delay(i) }}
                        title={`${p.done} done`}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right text-2xs text-ink-3">
                      <span data-metric className="font-medium text-ink-2">{p.open}</span> open
                      {p.overdue > 0 && (
                        <span data-metric className="ml-1.5 font-medium text-danger">{p.overdue} late</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="reveal lg:col-span-3" style={delay(6)}>
          <Card className="h-full">
            <CardHeader
              title="Throughput"
              subtitle="Tasks finished each week. Weeks with none are still plotted, so the shape is honest."
            />
            <CompletionsChart data={completions} />
          </Card>
        </div>

        <div className="reveal lg:col-span-2" style={delay(7)}>
          <Card className="h-full">
            <CardHeader title="By status" subtitle={`${totalTasks} tasks in view`} />
            <ul className="divide-y divide-line">
              {STATUS_ORDER.map((status, i) => {
                const n = statusMap.get(status) ?? 0;
                const pct = totalTasks ? (n / totalTasks) * 100 : 0;
                return (
                  <li key={status}>
                    <Link
                      href={`/tasks?status=${status}`}
                      className="group flex items-center gap-3 px-4 py-[11px] transition-colors hover:bg-surface-2"
                    >
                      <span className="w-[104px] shrink-0 text-xs text-ink-2 transition-colors group-hover:text-ink">
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                        <span
                          className="reveal-line block h-full rounded-full bg-accent"
                          style={{ width: `${pct}%`, ...delay(i) }}
                        />
                      </span>
                      <span data-metric className="w-7 text-right text-xs font-medium text-ink-2">
                        {n}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="reveal" style={delay(8)}>
          <Card className="h-full">
            <CardHeader title="Who is carrying what" subtitle="Open tasks per person. The red segment is already late." />
            {byAssignee.length === 0 ? (
              <EmptyState title="Nothing assigned yet." hint="Assign work and the load shows up here." />
            ) : (
              <ul className="divide-y divide-line">
                {byAssignee.map((person, i) => (
                  <li key={person.userId}>
                    <Link
                      href={`/tasks?assignee=${person.userId}&status=open`}
                      className="group flex items-center gap-3 px-4 py-[11px] transition-colors hover:bg-surface-2"
                    >
                      <Avatar name={person.name} size="sm" />
                      <span className="w-28 shrink-0 truncate text-sm text-ink">{person.name}</span>
                      <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-sunk">
                        <span
                          className="reveal-line h-full bg-danger"
                          style={{ width: `${busiest ? (person.overdue / busiest) * 100 : 0}%`, ...delay(i) }}
                        />
                        <span
                          className="reveal-line h-full bg-accent"
                          style={{ width: `${busiest ? ((person.open - person.overdue) / busiest) * 100 : 0}%`, ...delay(i) }}
                        />
                      </span>
                      <span data-metric className="w-14 shrink-0 text-right text-xs text-ink-2">
                        {person.open}
                        {person.overdue > 0 && <span className="ml-1 font-medium text-danger">·{person.overdue}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="reveal" style={delay(9)}>
          <Card className="h-full">
            <CardHeader
              title="Late the longest"
              subtitle="Where a client is most likely to notice first."
              action={
                <Link href="/alerts" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  All alerts <IconArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            {overdue.length === 0 ? (
              <EmptyState title="Nothing is overdue." hint="Everything with a due date is on time." />
            ) : (
              <ul className="divide-y divide-line">
                {overdue.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="group flex items-start gap-2.5 px-4 py-[11px] transition-colors hover:bg-surface-2"
                    >
                      <Ref>{taskRef(task.projectKey, task.number)}</Ref>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink transition-colors group-hover:text-accent">
                          {task.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2.5">
                          <PriorityBadge priority={task.priority} showLabel={false} />
                          <span className="text-2xs text-ink-3">{STATUS_LABELS[task.status]}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <OverdueBadge />
                        <span className="mt-1 block text-2xs text-ink-3">{relativeDue(task.dueDate)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
