import Link from 'next/link';

import { CompletionsChart } from '@/components/completions-chart';
import { IconArrowRight } from '@/components/icons';
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  OverdueBadge,
  PageHeader,
  PriorityBadge,
  Ref,
  StatusBadge,
  cx,
} from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { relativeDue } from '@/lib/dates';
import {
  completionsByWeek,
  countsByStatus,
  headlineNumbers,
  loadByAssignee,
  mostOverdue,
} from '@/lib/queries/dashboard';
import { STATUS_LABELS, STATUS_ORDER, taskRef } from '@/lib/task-status';

export const metadata = { title: 'Dashboard' };

/**
 * The landing view.
 *
 * Ordered by the question it answers, not by what was easy to compute: the four headline numbers
 * first, then throughput, then the two things a manager actually acts on — who is carrying too much,
 * and what has been late the longest.
 */
function Stat({
  label,
  value,
  tone = 'neutral',
  href,
  note,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'danger' | 'good';
  href?: string;
  note?: string;
}) {
  const body = (
    <div
      className={cx(
        'group relative h-full overflow-hidden rounded-xl border bg-surface px-4 py-3.5 shadow-e1 transition-all duration-150',
        tone === 'danger' && value > 0 ? 'border-danger-line' : 'border-line',
        href && 'hover:-translate-y-px hover:shadow-e2',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-2">{label}</p>
        {href && (
          <IconArrowRight className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <p
        data-metric
        className={cx(
          'mt-1.5 text-[28px] font-semibold leading-none',
          tone === 'danger' && value > 0 ? 'text-danger' : tone === 'good' ? 'text-good' : 'text-ink',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1.5 text-2xs text-ink-3">{note}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [headline, byStatus, byAssignee, completions, overdue] = await Promise.all([
    headlineNumbers(user),
    countsByStatus(user),
    loadByAssignee(user),
    completionsByWeek(user),
    mostOverdue(user),
  ]);

  const statusMap = new Map(byStatus.map((r) => [r.status, r.n]));
  const totalTasks = byStatus.reduce((sum, r) => sum + r.n, 0);
  const busiest = byAssignee[0]?.open ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'manager' ? 'Portfolio' : 'Your projects'}
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        subtitle={
          headline.overdueTasks > 0
            ? `${headline.overdueTasks} ${headline.overdueTasks === 1 ? 'task is' : 'tasks are'} past due and ${headline.dueThisWeek} more ${headline.dueThisWeek === 1 ? 'is' : 'are'} due this week.`
            : 'Nothing is overdue. Here is where the work stands.'
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={headline.openTasks} href="/tasks?status=open" note="Everything not finished" />
        <Stat
          label="Overdue"
          value={headline.overdueTasks}
          tone="danger"
          href="/tasks?overdue=1"
          note="Past due, not finished"
        />
        <Stat label="Due this week" value={headline.dueThisWeek} note="Monday to Sunday" />
        <Stat label="Completed this week" value={headline.completedThisWeek} tone="good" note="Moved to Done" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Throughput"
            subtitle="Tasks finished each week. Weeks with none are still plotted, so the shape is honest."
          />
          <CompletionsChart data={completions} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="By status" subtitle={`${totalTasks} tasks in view`} />
          <ul className="divide-y divide-line">
            {STATUS_ORDER.map((status) => {
              const n = statusMap.get(status) ?? 0;
              const pct = totalTasks ? (n / totalTasks) * 100 : 0;
              return (
                <li key={status}>
                  <Link
                    href={`/tasks?status=${status}`}
                    className="flex items-center gap-3 px-4 py-[11px] transition-colors hover:bg-surface-2"
                  >
                    <span className="w-[104px] shrink-0">
                      <StatusBadge status={status} size="sm" />
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                      <span
                        className="block h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
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
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Who is carrying what"
            subtitle="Open tasks per person. The red segment is already late."
          />
          {byAssignee.length === 0 ? (
            <EmptyState title="Nothing assigned yet." hint="Assign work and the load shows up here." />
          ) : (
            <ul className="divide-y divide-line">
              {byAssignee.map((person) => (
                <li key={person.userId}>
                  <Link
                    href={`/tasks?assignee=${person.userId}&status=open`}
                    className="flex items-center gap-3 px-4 py-[11px] transition-colors hover:bg-surface-2"
                  >
                    <Avatar name={person.name} size="sm" />
                    <span className="w-28 shrink-0 truncate text-sm text-ink">{person.name}</span>
                    <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-sunk">
                      <span
                        className="h-full bg-danger transition-[width] duration-500"
                        style={{ width: `${busiest ? (person.overdue / busiest) * 100 : 0}%` }}
                      />
                      <span
                        className="h-full bg-accent transition-[width] duration-500"
                        style={{ width: `${busiest ? ((person.open - person.overdue) / busiest) * 100 : 0}%` }}
                      />
                    </span>
                    <span data-metric className="w-14 shrink-0 text-right text-xs text-ink-2">
                      {person.open}
                      {person.overdue > 0 && (
                        <span className="ml-1 font-medium text-danger">·{person.overdue}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Late the longest"
            subtitle="Where a client is most likely to notice first."
            action={
              <Link
                href="/alerts"
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
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
                      <span className="block truncate text-sm text-ink group-hover:text-accent">
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
      </section>
    </>
  );
}
