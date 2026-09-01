import Link from 'next/link';

import type { TaskRow } from '@/lib/queries/tasks';
import { isOverdue, relativeDue } from '@/lib/dates';
import { taskRef } from '@/lib/task-status';

import { AvatarStack, EmptyState, OverdueBadge, Pill, PriorityBadge, StatusBadge } from './ui';

/**
 * One row renderer, shared by the project page, My tasks, the global list and the alerts page, so a
 * task looks and reads the same everywhere it appears.
 */
export function TaskRowItem({
  task,
  showProject = true,
  selectable,
}: {
  task: TaskRow;
  showProject?: boolean;
  selectable?: React.ReactNode;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <li className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/70">
      {selectable}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">{taskRef(task.projectKey, task.number)}</Pill>
          <Link
            href={`/tasks/${task.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline"
          >
            {task.title}
          </Link>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {showProject && (
            <Link
              href={`/projects/${task.projectId}`}
              className="text-xs text-ink-muted hover:underline"
            >
              {task.projectName}
            </Link>
          )}
          {task.unfinishedBlockerCount > 0 && (
            <span className="text-xs text-warn">
              Blocked by {task.unfinishedBlockerCount} unfinished{' '}
              {task.unfinishedBlockerCount === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <AvatarStack names={task.assignees.map((a) => a.name)} />
        <div className="w-24 text-right">
          {overdue ? (
            <OverdueBadge />
          ) : (
            <span className="text-xs text-ink-muted">{relativeDue(task.dueDate)}</span>
          )}
          {overdue && (
            <p className="mt-0.5 text-[11px] text-danger">{relativeDue(task.dueDate)}</p>
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
}: {
  tasks: TaskRow[];
  showProject?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (tasks.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => (
        <TaskRowItem key={task.id} task={task} showProject={showProject} />
      ))}
    </ul>
  );
}
