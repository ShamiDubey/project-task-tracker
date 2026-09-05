import Link from 'next/link';

import { TBody, TD, TH, THead, TR, Table, RowRule } from '@/components/table';
import {
  EmptyState,
  LinkButton,
  OverdueBadge,
  PageHeader,
  PriorityBadge,
  Ref,
  StatusBadge,
  cx,
} from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { isOverdue, relativeDue, shortDate, startOfWeek, todayISO, toISODate } from '@/lib/dates';
import { listMyTasks } from '@/lib/queries/tasks';
import type { TaskRow } from '@/lib/queries/tasks';
import { taskRef } from '@/lib/task-status';

export const metadata = { title: 'My tasks' };

/**
 * Goal 5.4 — everything assigned to me, across every project.
 *
 * Not another flat table. The question someone opens this page with is "what do I do now", and a
 * list sorted by due date does not answer it — an overdue task and one due in three weeks look the
 * same. So the work is grouped by urgency, in the order it demands attention:
 *
 *   Overdue    → already late
 *   Blocked    → cannot progress, needs someone else
 *   Today      → due today
 *   This week  → the rest of the week
 *   Later      → everything else, including tasks with no due date
 *
 * Blocked sits second on purpose: it is the group most likely to be silently stuck, because nobody
 * is prompted by a date.
 */
type Group = { key: string; title: string; hint: string; tone?: 'danger' | 'warn'; tasks: TaskRow[] };

export default async function MyTasksPage({ searchParams }: PageProps<'/my-tasks'>) {
  const user = await requireUser();
  const params = await searchParams;
  const includeFinished = params.all === '1';

  const page = await listMyTasks(user, {
    statuses: includeFinished ? undefined : ['backlog', 'in_progress', 'in_review', 'blocked'],
    sort: 'due_date',
    dir: 'asc',
    pageSize: 100,
  });

  const today = todayISO();
  const weekEnd = toISODate(new Date(startOfWeek().getTime() + 7 * 86400000));

  const groups: Group[] = [
    { key: 'overdue', title: 'Overdue', hint: 'Past its due date and not finished.', tone: 'danger', tasks: [] },
    { key: 'blocked', title: 'Blocked', hint: 'Waiting on another task. Nothing will prompt you about these.', tone: 'warn', tasks: [] },
    { key: 'today', title: 'Today', hint: 'Due today.', tasks: [] },
    { key: 'week', title: 'This week', hint: 'Due before the week is out.', tasks: [] },
    { key: 'later', title: 'Later', hint: 'Further out, or with no due date set.', tasks: [] },
  ];
  const bucket = Object.fromEntries(groups.map((g) => [g.key, g])) as Record<string, Group>;

  for (const task of page.rows) {
    if (isOverdue(task.dueDate, task.status)) bucket.overdue.tasks.push(task);
    else if (task.status === 'blocked') bucket.blocked.tasks.push(task);
    else if (task.dueDate === today) bucket.today.tasks.push(task);
    else if (task.dueDate && task.dueDate < weekEnd) bucket.week.tasks.push(task);
    else bucket.later.tasks.push(task);
  }

  const visible = groups.filter((g) => g.tasks.length > 0);
  const actionable = bucket.overdue.tasks.length + bucket.today.tasks.length;

  return (
    <>
      <PageHeader
        title="My tasks"
        subtitle={
          page.total === 0
            ? 'Nothing is assigned to you yet.'
            : actionable > 0
              ? `${actionable} ${actionable === 1 ? 'task needs' : 'tasks need'} attention today. ${page.total} assigned in total.`
              : `Nothing is due today. ${page.total} assigned in total.`
        }
        actions={
          <LinkButton href={includeFinished ? '/my-tasks' : '/my-tasks?all=1'} tone="secondary" size="sm">
            {includeFinished ? 'Open work only' : 'Include finished'}
          </LinkButton>
        }
      />

      {visible.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-e1">
          <EmptyState
            title="Nothing assigned to you."
            hint="When someone assigns you a task it will appear here, grouped by when it needs doing."
            action={
              <LinkButton href="/tasks" tone="secondary" size="sm">
                Browse all tasks
              </LinkButton>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {visible.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-baseline gap-2.5">
                <h2
                  className={cx(
                    'text-sm font-semibold',
                    group.tone === 'danger' ? 'text-danger' : group.tone === 'warn' ? 'text-warn' : 'text-ink',
                  )}
                >
                  {group.title}
                </h2>
                <span className="text-xs tabular-nums text-ink-3">{group.tasks.length}</span>
                <span className="text-xs text-ink-3">· {group.hint}</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-e1">
                <Table>
                  <THead>
                    <TH width="88">Task</TH>
                    <TH>Title</TH>
                    <TH width="120">Status</TH>
                    <TH width="92">Priority</TH>
                    <TH width="170">Project</TH>
                    <TH width="118" align="right">Due</TH>
                  </THead>
                  <TBody>
                    {group.tasks.map((task) => (
                      <TR key={task.id} highlight={group.tone}>
                        <TD className="relative">
                          {group.tone && <RowRule tone={group.tone} />}
                          <Ref tone="accent">{taskRef(task.projectKey, task.number)}</Ref>
                        </TD>
                        <TD>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="block max-w-[42ch] truncate font-medium text-ink transition-colors hover:text-accent"
                          >
                            {task.title}
                          </Link>
                          {task.unfinishedBlockerCount > 0 && (
                            <span className="text-2xs text-warn">
                              Blocked by {task.unfinishedBlockerCount} unfinished
                            </span>
                          )}
                        </TD>
                        <TD><StatusBadge status={task.status} size="sm" /></TD>
                        <TD><PriorityBadge priority={task.priority} /></TD>
                        <TD muted>
                          <Link
                            href={`/projects/${task.projectId}`}
                            className="block max-w-[22ch] truncate text-xs hover:text-ink hover:underline"
                          >
                            {task.projectName}
                          </Link>
                        </TD>
                        <TD align="right">
                          {group.key === 'overdue' ? (
                            <OverdueBadge />
                          ) : (
                            <span className="whitespace-nowrap text-xs text-ink-2"
                              title={task.dueDate ? shortDate(task.dueDate) : undefined}>
                              {relativeDue(task.dueDate)}
                            </span>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
