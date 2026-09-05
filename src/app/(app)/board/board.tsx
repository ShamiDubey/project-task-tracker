'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { changeTaskStatus } from '@/app/actions/tasks';
import { ToastStack, useToasts } from '@/components/overlays';
import { AvatarStack, OverdueBadge, PriorityBadge, Ref, cx } from '@/components/ui';
import type { TaskStatus } from '@/db/schema';
import { isOverdue, relativeDue } from '@/lib/dates';
import type { TaskRow } from '@/lib/queries/tasks';
import { STATUS_LABELS, STATUS_ORDER, taskRef } from '@/lib/task-status';

/**
 * A drag-and-drop board.
 *
 * The rule that makes this more than decoration: a dropped card does not change status on its own
 * authority. It calls the same `changeTaskStatus` server action every other path uses, so the
 * transition table still governs — drag Backlog straight onto Done and the server refuses with a
 * reason, the toast shows why, and the card returns to where it started. The board cannot do
 * anything the rules forbid, because it goes through the same door.
 *
 * Native HTML5 drag and drop, so it adds no dependency. Moves are optimistic and roll back on a
 * rejection, then the route refreshes to reconcile with the truth.
 */
type Columns = Record<TaskStatus, TaskRow[]>;

function group(tasks: TaskRow[]): Columns {
  const cols = Object.fromEntries(STATUS_ORDER.map((s) => [s, []])) as unknown as Columns;
  for (const t of tasks) cols[t.status].push(t);
  return cols;
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  backlog: 'bg-ink-3',
  in_progress: 'bg-info',
  in_review: 'bg-warn',
  blocked: 'bg-danger',
  done: 'bg-good',
};

export function Board({ tasks, canWrite }: { tasks: TaskRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [cols, setCols] = useState<Columns>(() => group(tasks));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();
  const { toasts, push, dismiss } = useToasts();

  // The server-rendered tasks are the source of truth; re-sync when they change.
  const key = tasks.map((t) => `${t.id}:${t.status}`).join(',');
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setCols(group(tasks));
  }

  function move(taskId: string, from: TaskStatus, to: TaskStatus) {
    if (from === to) return;
    const task = cols[from].find((t) => t.id === taskId);
    if (!task) return;

    setCols((c) => ({
      ...c,
      [from]: c[from].filter((t) => t.id !== taskId),
      [to]: [{ ...task, status: to }, ...c[to]],
    }));

    startTransition(async () => {
      const result = await changeTaskStatus(taskId, to);
      if (result?.error) {
        setCols((c) => ({
          ...c,
          [to]: c[to].filter((t) => t.id !== taskId),
          [from]: [task, ...c[from]],
        }));
        push('danger', result.error);
      } else {
        push('good', `${taskRef(task.projectKey, task.number)} → ${STATUS_LABELS[to]}`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            onDragOver={(e) => {
              if (!canWrite || !dragId) return;
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain') || dragId;
              const from = STATUS_ORDER.find((s) => cols[s].some((t) => t.id === id));
              if (id && from) move(id, from, status);
              setDragId(null);
            }}
            className={cx(
              'flex w-[280px] shrink-0 flex-col rounded-xl border transition-colors',
              over === status ? 'border-accent bg-accent-soft/40' : 'border-line bg-surface-2/40',
            )}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <span className={cx('h-2 w-2 rounded-full', COLUMN_ACCENT[status])} aria-hidden />
              <span className="text-sm font-semibold text-ink">{STATUS_LABELS[status]}</span>
              <span className="ml-auto text-xs tabular-nums text-ink-3">{cols[status].length}</span>
            </div>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
              {cols[status].length === 0 ? (
                <p className="px-1 py-6 text-center text-2xs text-ink-3">
                  {canWrite ? 'Drop a card here' : 'Nothing here'}
                </p>
              ) : (
                cols[status].map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  return (
                    <div
                      key={task.id}
                      draggable={canWrite}
                      onDragStart={(e) => {
                        setDragId(task.id);
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      className={cx(
                        'group rounded-lg border border-line bg-surface p-2.5 shadow-e1 transition-all',
                        canWrite && 'cursor-grab active:cursor-grabbing hover:shadow-e2',
                        dragId === task.id && 'opacity-40',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Ref tone="accent">{taskRef(task.projectKey, task.number)}</Ref>
                        {overdue && <OverdueBadge />}
                        <span className="ml-auto">
                          <AvatarStack names={task.assignees.map((a) => a.name)} max={2} />
                        </span>
                      </div>
                      <Link
                        href={`/tasks/${task.id}`}
                        draggable={false}
                        className="mt-1.5 block text-sm leading-snug text-ink hover:text-accent"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-2 flex items-center gap-2.5">
                        <PriorityBadge priority={task.priority} showLabel={false} />
                        {task.dueDate && !overdue && (
                          <span className="text-2xs text-ink-3">{relativeDue(task.dueDate)}</span>
                        )}
                        {task.unfinishedBlockerCount > 0 && (
                          <span className="text-2xs text-warn">{task.unfinishedBlockerCount} blocking</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}
