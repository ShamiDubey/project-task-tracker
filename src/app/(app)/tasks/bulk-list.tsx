'use client';

import { useState, useTransition } from 'react';

import {
  bulkAssign,
  bulkChangeStatus,
  bulkSetDueDate,
  type BulkResult,
} from '@/app/actions/bulk';
import { TaskRowItem } from '@/components/task-table';
import { Button, Card, EmptyState, Pill, cx, fieldClass } from '@/components/ui';
import type { TaskStatus } from '@/db/schema';
import type { TaskRow } from '@/lib/queries/tasks';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/task-status';

type Person = { id: string; name: string };

/**
 * Goal 7 — select several tasks and apply one change to all of them.
 *
 * The result panel is the requirement, not a nicety: "the result must report per task what succeeded
 * and what was rejected and why — not just fail the whole batch". So the outcomes come back one per
 * task and every failure is shown with its reason, in the same wording the single-task path uses.
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
      // Keep only the tasks that failed selected, so a second attempt after fixing something is easy.
      setSelected(new Set(outcome.outcomes.filter((o) => !o.ok).map((o) => o.taskId)));
    });

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No tasks match these filters."
          hint="Try widening the search, or clearing a filter."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 rounded-xl border border-accent/30 bg-accent-soft p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-accent">
              {selected.size} selected
            </span>

            <span className="mx-1 h-4 w-px bg-accent/20" />

            <span className="text-xs text-ink-muted">Move to</span>
            {STATUS_ORDER.map((status) => (
              <Button
                key={status}
                tone="secondary"
                size="sm"
                disabled={pending}
                onClick={() => run(() => bulkChangeStatus(ids, status as TaskStatus))}
              >
                {STATUS_LABELS[status]}
              </Button>
            ))}

            <span className="mx-1 h-4 w-px bg-accent/20" />

            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={`${fieldClass} w-auto py-1 text-xs`}
              aria-label="Person to assign or unassign"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              tone="secondary"
              size="sm"
              disabled={pending || !assignee}
              onClick={() => run(() => bulkAssign(ids, assignee, true))}
            >
              Assign
            </Button>
            <Button
              tone="secondary"
              size="sm"
              disabled={pending || !assignee}
              onClick={() => run(() => bulkAssign(ids, assignee, false))}
            >
              Unassign
            </Button>

            <span className="mx-1 h-4 w-px bg-accent/20" />

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${fieldClass} w-auto py-1 text-xs`}
              aria-label="New due date"
            />
            <Button
              tone="secondary"
              size="sm"
              disabled={pending}
              onClick={() => run(() => bulkSetDueDate(ids, dueDate || null))}
            >
              {dueDate ? 'Set due date' : 'Clear due date'}
            </Button>

            <Button
              tone="ghost"
              size="sm"
              disabled={pending}
              className="ml-auto"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
          {pending && <p className="mt-2 text-xs text-ink-muted">Applying…</p>}
        </div>
      )}

      {result && (
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <p className="text-sm">
              <span className="font-medium text-good">{result.succeeded} applied</span>
              {result.failed > 0 && (
                <>
                  <span className="text-ink-subtle"> · </span>
                  <span className="font-medium text-danger">{result.failed} rejected</span>
                </>
              )}
            </p>
            <Button tone="ghost" size="sm" onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </div>
          {result.error ? (
            <p className="px-4 py-3 text-sm text-danger">{result.error}</p>
          ) : (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {result.outcomes.map((o) => (
                <li key={o.taskId} className="flex items-start gap-3 px-4 py-2">
                  <span
                    className={cx(
                      'mt-0.5 shrink-0 text-xs font-medium',
                      o.ok ? 'text-good' : 'text-danger',
                    )}
                  >
                    {o.ok ? '✓' : '✕'}
                  </span>
                  <Pill>{o.ref}</Pill>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{o.title}</span>
                    {o.reason && <span className="block text-xs text-danger">{o.reason}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3 border-b border-line px-4 py-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
            }
            className="h-4 w-4 rounded border-line-strong text-accent"
            aria-label="Select all tasks on this page"
          />
          <span className="text-xs text-ink-muted">
            {allSelected ? 'All on this page selected' : 'Select all on this page'}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {tasks.map((task) => (
            <TaskRowItem
              key={task.id}
              task={task}
              selectable={
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong text-accent"
                  aria-label={`Select ${task.title}`}
                />
              }
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}
