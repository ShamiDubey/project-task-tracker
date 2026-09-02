import Link from 'next/link';
import type { ReactNode } from 'react';

import { isOverdue, relativeDue, todayISO } from '@/lib/dates';
import type { TaskRow } from '@/lib/queries/tasks';
import { taskRef } from '@/lib/task-status';

import { IconBlocked } from './icons';
import { AvatarStack, EmptyState, OverdueBadge, PriorityBadge, Ref, StatusBadge, cx } from './ui';

function daysLate(dueDate: string | null): number {
  if (!dueDate) return 0;
  return Math.max(
    0,
    Math.round((new Date(`${todayISO()}T00:00:00`).getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000),
  );
}

/**
 * One row renderer, used by the project view, My tasks, the global list and the bulk list — so a
 * task reads identically everywhere it appears and there is one place to change how it looks.
 *
 * Dense by design. A delivery lead scans this list for the exception, so the row is tuned for
 * scanning a column at a time: reference, then title, then the status/priority pair, then people,
 * then the date. Overdue is the only thing allowed to shout.
 */
export function TaskRowItem({
  task,
  showProject = true,
  selectable,
}: {
  task: TaskRow;
  showProject?: boolean;
  selectable?: ReactNode;
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <li
      className={cx(
        'group relative flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-2',
        overdue && 'bg-danger-soft/30',
      )}
    >
      {/* A hairline on overdue rows, so the exception is findable while scrolling fast. */}
      {overdue && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-danger" />}
      {/* A hairline that draws in from the left on hover — the row acknowledging the pointer. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[2px] origin-top scale-y-0 bg-accent transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100"
      />

      {selectable}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Ref tone="accent">{taskRef(task.projectKey, task.number)}</Ref>
          <Link
            href={`/tasks/${task.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-ink transition-colors group-hover:text-accent"
          >
            {task.title}
          </Link>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={task.status} size="sm" />
          <PriorityBadge priority={task.priority} showLabel={false} />
          {showProject && (
            <Link
              href={`/projects/${task.projectId}`}
              className="max-w-[180px] truncate text-2xs text-ink-3 hover:text-ink-2 hover:underline"
            >
              {task.projectName}
            </Link>
          )}
          {task.unfinishedBlockerCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-2xs text-warn"
              title={`Cannot move to Done until ${task.unfinishedBlockerCount} blocking task${task.unfinishedBlockerCount === 1 ? '' : 's'} finish`}
            >
              <IconBlocked className="h-3 w-3" />
              {task.unfinishedBlockerCount} blocking
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <AvatarStack names={task.assignees.map((a) => a.name)} />
        <div className="w-[92px] text-right">
          {overdue ? (
            <OverdueBadge days={daysLate(task.dueDate)} />
          ) : (
            <span className="text-2xs text-ink-3">{relativeDue(task.dueDate)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

export function TaskList({
  tasks,
  showProject = true,
  emptyTitle = 'No tasks here.',
  emptyHint,
  emptyAction,
}: {
  tasks: TaskRow[];
  showProject?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  }
  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => (
        <TaskRowItem key={task.id} task={task} showProject={showProject} />
      ))}
    </ul>
  );
}
