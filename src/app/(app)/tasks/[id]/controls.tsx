'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  addComment,
  addDependency,
  assignUser,
  changeTaskStatus,
  deleteTask,
  removeDependency,
  unassignUser,
  updateTask,
  type ActionState,
} from '@/app/actions/tasks';
import { Avatar, Button, Field, Notice, Ref, StatusBadge, fieldClass } from '@/components/ui';
import type { TaskPriority, TaskStatus } from '@/db/schema';
import {
  STATUS_LABELS,
  allowedTransitions,
  validateTransition,
  type TransitionContext,
} from '@/lib/task-status';

type Person = { id: string; name: string; email: string };

/**
 * Goal 4.7 — the interface only offers the moves that are currently legal.
 *
 * The buttons are derived from `allowedTransitions`, which is the same module the server calls to
 * decide whether to accept a move. They cannot disagree. Where a move is illegal for a reason worth
 * explaining — Done while a blocker is unfinished — the reason is shown rather than the button
 * silently vanishing.
 */
export function StatusControls({
  taskId,
  ctx,
  canWrite,
}: {
  taskId: string;
  ctx: TransitionContext;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(undefined);

  const allowed = allowedTransitions(ctx);
  const doneVerdict = validateTransition(ctx, 'done');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-2">Currently</span>
        <StatusBadge status={ctx.status} />
      </div>

      {canWrite ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {allowed.length === 0 && (
              <p className="text-xs text-ink-2">No moves are available from here.</p>
            )}
            {allowed.map((status) => (
              <Button
                key={status}
                tone="secondary"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => setMessage(await changeTaskStatus(taskId, status)))
                }
              >
                {ctx.status === 'blocked'
                  ? `Unblock → ${STATUS_LABELS[status]}`
                  : status === 'blocked'
                    ? 'Mark blocked'
                    : `Move to ${STATUS_LABELS[status]}`}
              </Button>
            ))}
          </div>

          {/* Goal 4.5 — say why Done is not on offer, rather than leaving a hole. */}
          {!doneVerdict.ok && ctx.status === 'in_review' && (
            <p className="text-xs text-warn">{doneVerdict.reason}</p>
          )}
          {message?.error && <Notice>{message.error}</Notice>}
        </>
      ) : (
        <p className="text-xs text-ink-2">
          You are not a member of this project, so you cannot change its tasks.
        </p>
      )}
    </div>
  );
}

export function AssigneeControls({
  taskId,
  assignees,
  members,
  canWrite,
}: {
  taskId: string;
  assignees: Person[];
  members: Person[];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(undefined);
  const assignedIds = new Set(assignees.map((a) => a.id));
  const candidates = members.filter((m) => !assignedIds.has(m.id));
  const [toAdd, setToAdd] = useState(candidates[0]?.id ?? '');

  return (
    <div className="space-y-2 px-4 py-3">
      {message?.error && <Notice>{message.error}</Notice>}

      {assignees.length === 0 && <p className="text-xs text-ink-2">Nobody is assigned.</p>}
      <ul className="space-y-1.5">
        {assignees.map((person) => (
          <li key={person.id} className="flex items-center gap-2">
            <Avatar name={person.name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{person.name}</span>
            {canWrite && (
              <Button
                tone="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => setMessage(await unassignUser(taskId, person.id)))
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canWrite && candidates.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className={`${fieldClass} min-w-0 flex-1 py-1 text-xs`}
            aria-label="Person to assign"
          >
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            className="shrink-0"
            disabled={pending || !toAdd}
            onClick={() => startTransition(async () => setMessage(await assignUser(taskId, toAdd)))}
          >
            Assign
          </Button>
        </div>
      )}
      {canWrite && candidates.length === 0 && assignees.length > 0 && (
        <p className="pt-1 text-xs text-ink-3">
          Everyone on this project is already assigned. Only project members can be assigned.
        </p>
      )}
    </div>
  );
}

export function DependencyControls({
  taskId,
  blockers,
  candidates,
  canWrite,
}: {
  taskId: string;
  blockers: { id: string; ref: string; title: string; status: TaskStatus }[];
  candidates: { id: string; ref: string; title: string }[];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(undefined);
  const [toAdd, setToAdd] = useState(candidates[0]?.id ?? '');

  return (
    <div className="space-y-2 px-4 py-3">
      {message?.error && <Notice>{message.error}</Notice>}

      {blockers.length === 0 && (
        <p className="text-xs text-ink-2">Nothing is blocking this task.</p>
      )}
      <ul className="space-y-1.5">
        {blockers.map((b) => (
          <li key={b.id} className="flex items-center gap-2">
            <Ref>{b.ref}</Ref>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{b.title}</span>
            <StatusBadge status={b.status} />
            {canWrite && (
              <Button
                tone="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => setMessage(await removeDependency(taskId, b.id)))
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canWrite && candidates.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className={`${fieldClass} min-w-0 flex-1 py-1 text-xs`}
            aria-label="Task that blocks this one"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ref} — {c.title}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            aria-label="Add blocker"
            className="shrink-0 whitespace-nowrap"
            disabled={pending || !toAdd}
            onClick={() =>
              startTransition(async () => setMessage(await addDependency(taskId, toAdd)))
            }
          >
            Add
          </Button>
        </div>
      )}
      {canWrite && (
        <p className="pt-1 text-xs text-ink-3">
          Only tasks in the same project can block this one.
        </p>
      )}
    </div>
  );
}

function CommentSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Posting…' : 'Comment'}
    </Button>
  );
}

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addComment, undefined);

  return (
    <form action={action} className="space-y-2 border-t border-line px-4 py-3">
      <input type="hidden" name="taskId" value={taskId} />
      {state?.error && <Notice>{state.error}</Notice>}
      <textarea
        name="body"
        rows={2}
        required
        placeholder="Add a comment…"
        className={fieldClass}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3">
          Comments are part of the permanent timeline and cannot be edited or deleted.
        </p>
        <CommentSubmit />
      </div>
    </form>
  );
}

export function EditTaskForm({
  taskId,
  title,
  description,
  priority,
  dueDate,
}: {
  taskId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateTask, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button tone="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full space-y-3 rounded-lg border border-line p-3">
      <input type="hidden" name="taskId" value={taskId} />
      {state?.error && <Notice>{state.error}</Notice>}
      {state?.ok && <Notice tone="good">{state.ok}</Notice>}

      <Field label="Title">
        <input name="title" defaultValue={title} required className={fieldClass} />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={4} defaultValue={description} className={fieldClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Priority">
          <select name="priority" defaultValue={priority} className={fieldClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Due date" hint="Changing this brings back any dismissed overdue alert.">
          <input name="dueDate" type="date" defaultValue={dueDate ?? ''} className={fieldClass} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button type="button" tone="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}

/** Goal 1.3 — only rendered for managers, and the action refuses anyone else regardless. */
export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!confirming) {
    return (
      <Button tone="danger" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-danger">Delete permanently?</span>
      <Button
        tone="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => setError((await deleteTask(taskId))?.error))
        }
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </Button>
      <Button tone="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
