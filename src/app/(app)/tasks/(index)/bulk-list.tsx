'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { bulkAssign, bulkChangeStatus, bulkSetDueDate, type BulkResult } from '@/app/actions/bulk';
import { IconClose } from '@/components/icons';
import { TBody, TD, TH, THead, TR, Table, RowRule } from '@/components/table';
import {
  AvatarStack,
  Button,
  EmptyState,
  LinkButton,
  OverdueBadge,
  PriorityBadge,
  Ref,
  StatusBadge,
  cx,
  fieldBase,
} from '@/components/ui';
import type { TaskStatus } from '@/db/schema';
import { isOverdue, relativeDue, shortDate, todayISO } from '@/lib/dates';
import type { TaskRow } from '@/lib/queries/tasks';
import { STATUS_LABELS, STATUS_ORDER, taskRef } from '@/lib/task-status';

type Person = { id: string; name: string };

function daysLate(dueDate: string | null): number {
  if (!dueDate) return 0;
  return Math.max(0, Math.round(
    (new Date(`${todayISO()}T00:00:00`).getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000));
}

/**
 * The task table, with selection and bulk actions.
 *
 * A table rather than stacked rows: someone triaging runs their eye down one column — due dates, or
 * statuses — comparing values, and that only works when the values line up. Rows are 44px because
 * they carry an avatar.
 *
 * The bulk toolbar appears only when something is selected. Goal 7 requires per-task results, so the
 * outcome panel lists every refusal with its reason rather than reporting a count.
 */
export function BulkTaskList({ tasks, people }: { tasks: TaskRow[]; people: Person[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [assignee, setAssignee] = useState(people[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('');

  const ids = [...selected];
  const allSelected = tasks.length > 0 && selected.size === tasks.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (fn: () => Promise<BulkResult>) =>
    startTransition(async () => {
      const outcome = await fn();
      setResult(outcome);
      // Keep the refused tasks selected so a second attempt after fixing something is one click.
      setSelected(new Set(outcome.outcomes.filter((o) => !o.ok).map((o) => o.taskId)));
    });

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks match these filters."
        hint="Try widening the search, clearing a status, or including archived projects."
        action={
          <LinkButton href="/tasks" tone="secondary" size="sm">
            Clear filters
          </LinkButton>
        }
      />
    );
  }

  return (
    <div>
      {/* Appears only with a selection, so it never occupies space it has not earned. */}
      {selected.size > 0 && (
        <div className="animate-pop sticky top-0 z-20 mb-px flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <span className="text-xs font-medium text-ink">
            {selected.size} selected
          </span>
          <span className="mx-1 h-4 w-px bg-line-strong" />

          <span className="text-2xs uppercase tracking-[0.06em] text-ink-3">Move to</span>
          {STATUS_ORDER.map((status) => (
            <Button key={status} tone="secondary" size="xs" disabled={pending}
              onClick={() => run(() => bulkChangeStatus(ids, status as TaskStatus))}>
              {STATUS_LABELS[status]}
            </Button>
          ))}

          <span className="mx-1 h-4 w-px bg-line-strong" />
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
            aria-label="Person to assign or unassign"
            className={cx(fieldBase, 'max-w-[150px] py-1 text-xs')}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button tone="secondary" size="xs" disabled={pending || !assignee}
            onClick={() => run(() => bulkAssign(ids, assignee, true))}>Assign</Button>
          <Button tone="secondary" size="xs" disabled={pending || !assignee}
            onClick={() => run(() => bulkAssign(ids, assignee, false))}>Unassign</Button>

          <span className="mx-1 h-4 w-px bg-line-strong" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            aria-label="New due date" className={cx(fieldBase, 'py-1 text-xs')} />
          <Button tone="secondary" size="xs" disabled={pending}
            onClick={() => run(() => bulkSetDueDate(ids, dueDate || null))}>
            {dueDate ? 'Set due date' : 'Clear due date'}
          </Button>

          <Button tone="ghost" size="xs" className="ml-auto" disabled={pending}
            onClick={() => setSelected(new Set())}>Clear selection</Button>
          {pending && <span className="w-full text-2xs text-ink-2">Applying…</span>}
        </div>
      )}

      {/* Goal 7.3: what succeeded, what was refused, and why — per task. */}
      {result && (
        <div className="border-b border-line bg-surface">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <p className="text-sm">
              <span className="font-medium text-good">{result.succeeded} applied</span>
              {result.failed > 0 && (
                <>
                  <span className="text-ink-3"> · </span>
                  <span className="font-medium text-danger">{result.failed} rejected</span>
                </>
              )}
              {result.failed > 0 && (
                <span className="ml-2 text-xs text-ink-2">
                  The rejected tasks are still selected.
                </span>
              )}
            </p>
            <button onClick={() => setResult(null)} aria-label="Dismiss result"
              className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink">
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
          {result.error ? (
            <p className="px-3 pb-3 text-sm text-danger">{result.error}</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto border-t border-line">
              {result.outcomes.map((o) => (
                <li
                  key={o.taskId}
                  className={cx(
                    'flex items-start gap-2.5 px-3 py-1.5 text-xs',
                    o.ok && 'text-ink-2',
                  )}
                >
                  <span
                    aria-hidden
                    className={cx('mt-px shrink-0 font-medium', o.ok ? 'text-good' : 'text-danger')}
                  >
                    {o.ok ? '✓' : '✕'}
                  </span>
                  <span className="sr-only">{o.ok ? 'Applied' : 'Rejected'}</span>
                  <Ref>{o.ref}</Ref>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate', o.ok ? 'text-ink-2' : 'text-ink')}>
                      {o.title}
                    </span>
                    {o.reason && <span className="block text-danger">{o.reason}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Table>
        <THead>
          <TH width="34">
            <input type="checkbox" checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))}
              className="h-3.5 w-3.5 rounded border-line-strong text-accent"
              aria-label="Select all tasks on this page" />
          </TH>
          <TH width="88">Task</TH>
          <TH>Title</TH>
          <TH width="120">Status</TH>
          <TH width="92">Priority</TH>
          <TH width="150">Project</TH>
          <TH width="96">Assignees</TH>
          <TH width="118" align="right">Due</TH>
        </THead>
        <TBody>
          {tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const isSelected = selected.has(task.id);
            return (
              <TR key={task.id} selected={isSelected} highlight={overdue ? 'danger' : undefined}>
                <TD className="relative">
                  {overdue && <RowRule tone="danger" />}
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(task.id)}
                    className="h-3.5 w-3.5 rounded border-line-strong text-accent"
                    aria-label={`Select ${task.title}`} />
                </TD>
                <TD>
                  <Ref tone="accent">{taskRef(task.projectKey, task.number)}</Ref>
                </TD>
                <TD>
                  <Link href={`/tasks/${task.id}`}
                    className="block max-w-[36ch] truncate font-medium text-ink transition-colors hover:text-accent">
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
                  <Link href={`/projects/${task.projectId}`}
                    className="block max-w-[18ch] truncate text-xs hover:text-ink hover:underline">
                    {task.projectName}
                  </Link>
                </TD>
                <TD><AvatarStack names={task.assignees.map((a) => a.name)} max={3} /></TD>
                <TD align="right">
                  {overdue ? (
                    <OverdueBadge days={daysLate(task.dueDate)} />
                  ) : task.status === 'done' ? (
                    // A finished task's due date is history, not a deadline. Rendering it as
                    // "46 days ago" made completed work read as late.
                    <span className="whitespace-nowrap text-xs text-ink-3">
                      {task.dueDate ? shortDate(task.dueDate) : '—'}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-ink-2"
                      title={task.dueDate ? shortDate(task.dueDate) : undefined}>
                      {relativeDue(task.dueDate)}
                    </span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
