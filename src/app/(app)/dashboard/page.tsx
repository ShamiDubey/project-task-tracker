import Link from 'next/link';

import { CompletionsChart } from '@/components/completions-chart';
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
  PriorityBadge,
  StatusBadge,
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

export const metadata = { title: 'Dashboard · Project Tracker' };

function Stat({
  label,
  value,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'danger' | 'good';
  href?: string;
}) {
  const body = (
    <Card className="p-4 transition-shadow hover:shadow-sm">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={
          'mt-1 text-2xl font-semibold tabular-nums ' +
          (tone === 'danger' ? 'text-danger' : tone === 'good' ? 'text-good' : 'text-ink')
        }
      >
        {value}
      </p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
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

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.name.split(' ')[0]}`}
        subtitle={
          user.role === 'manager'
            ? 'The whole portfolio, across every project.'
            : 'Across the projects you are on.'
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={headline.openTasks} href="/tasks?status=open" />
        <Stat
          label="Overdue"
          value={headline.overdueTasks}
          tone={headline.overdueTasks > 0 ? 'danger' : 'neutral'}
          href="/tasks?overdue=1"
        />
        <Stat label="Due this week" value={headline.dueThisWeek} />
        <Stat label="Completed this week" value={headline.completedThisWeek} tone="good" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Completions, last eight weeks"
            subtitle="Tasks moved to Done, bucketed by the week they were finished."
          />
          <CompletionsChart data={completions} />
        </Card>

        <Card>
          <CardHeader title="By status" subtitle={`${totalTasks} tasks in view`} />
          <ul className="divide-y divide-line">
            {STATUS_ORDER.map((status) => {
              const n = statusMap.get(status) ?? 0;
              const pct = totalTasks ? Math.round((n / totalTasks) * 100) : 0;
              return (
                <li key={status} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-24 shrink-0">
                    <StatusBadge status={status} />
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-sm tabular-nums text-ink-muted">{n}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Who is carrying what"
            subtitle="Open tasks per person. The red portion is already overdue."
          />
          {byAssignee.length === 0 ? (
            <EmptyState title="Nothing assigned yet." />
          ) : (
            <ul className="divide-y divide-line">
              {byAssignee.map((person) => (
                <li key={person.userId} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={person.name} size="sm" />
                  <Link
                    href={`/tasks?assignee=${person.userId}`}
                    className="w-32 shrink-0 truncate text-sm text-ink hover:underline"
                  >
                    {person.name}
                  </Link>
                  <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="h-full bg-danger"
                      style={{ width: `${busiest ? (person.overdue / busiest) * 100 : 0}%` }}
                    />
                    <span
                      className="h-full bg-accent"
                      style={{
                        width: `${busiest ? ((person.open - person.overdue) / busiest) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="w-16 text-right text-sm tabular-nums text-ink-muted">
                    {person.open}
                    {person.overdue > 0 && (
                      <span className="ml-1 text-xs text-danger">({person.overdue})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Most overdue"
            subtitle="The work that has been late the longest."
            action={
              <Link href="/alerts" className="text-xs font-medium text-accent hover:underline">
                All alerts
              </Link>
            }
          />
          {overdue.length === 0 ? (
            <EmptyState title="Nothing is overdue." hint="Everything with a due date is on time." />
          ) : (
            <ul className="divide-y divide-line">
              {overdue.map((task) => (
                <li key={task.id} className="px-4 py-2.5">
                  <Link href={`/tasks/${task.id}`} className="group flex items-center gap-2">
                    <Pill>{taskRef(task.projectKey, task.number)}</Pill>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:underline">
                      {task.title}
                    </span>
                    <StatusBadge status={task.status} />
                    <span className="w-20 shrink-0 text-right text-xs text-danger">
                      {relativeDue(task.dueDate)}
                    </span>
                  </Link>
                  <div className="mt-1 flex items-center gap-2 pl-1">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-ink-subtle">
                      {STATUS_LABELS[task.status]} · {task.projectKey}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
