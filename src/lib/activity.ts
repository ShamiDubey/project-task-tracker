/**
 * The timeline — Goal 9.
 *
 * Every function here appends. There is no update and no delete, anywhere, for anyone: Goal 9.6 says
 * nothing in the timeline can be edited or deleted after the fact, *including by managers*. That is
 * guaranteed here by construction — this module is the only writer, and it only ever inserts.
 *
 * Every one of these takes a transaction handle, because a change without its timeline entry is a
 * bug rather than a slightly-stale read. The two commit together or neither does.
 */
import 'server-only';

import { activity, type ActivityType, type TaskStatus } from '@/db/schema';
import type { Tx } from '@/db/tx';

type Base = { tx: Tx; taskId: string; actorId: string };

export async function logCreated({ tx, taskId, actorId }: Base) {
  await tx.insert(activity).values({ taskId, actorId, type: 'created' });
}

/**
 * Goal 9.3 — "every field change with the old and new value and who made it".
 * Values are stored as text so one table describes a change to any field.
 */
export async function logFieldChange({
  tx,
  taskId,
  actorId,
  field,
  oldValue,
  newValue,
}: Base & { field: string; oldValue: string | null; newValue: string | null }) {
  await tx.insert(activity).values({
    taskId,
    actorId,
    type: 'field_changed',
    field,
    oldValue,
    newValue,
  });
}

export async function logStatusChange(
  args: Base & { from: TaskStatus; to: TaskStatus },
) {
  await logFieldChange({ ...args, field: 'status', oldValue: args.from, newValue: args.to });
}

/** Goal 9.4 — every assignment and unassignment. */
export async function logAssignment({
  tx,
  taskId,
  actorId,
  subjectUserId,
  assigned,
}: Base & { subjectUserId: string; assigned: boolean }) {
  await tx.insert(activity).values({
    taskId,
    actorId,
    type: assigned ? 'assigned' : 'unassigned',
    subjectUserId,
  });
}

/** Goal 9.5 — comments are part of the same stream, not a separate one. */
export async function logComment({ tx, taskId, actorId, body }: Base & { body: string }) {
  await tx.insert(activity).values({ taskId, actorId, type: 'commented', body });
}

export async function logDependency({
  tx,
  taskId,
  actorId,
  blockerRef,
  added,
}: Base & { blockerRef: string; added: boolean }) {
  await tx.insert(activity).values({
    taskId,
    actorId,
    type: (added ? 'dependency_added' : 'dependency_removed') satisfies ActivityType,
    newValue: blockerRef,
  });
}

/** Compare two versions of a task and append one row per field that actually changed. */
export async function logChangedFields({
  tx,
  taskId,
  actorId,
  before,
  after,
}: Base & {
  before: Record<string, string | null>;
  after: Record<string, string | null>;
}) {
  for (const field of Object.keys(after)) {
    const oldValue = before[field] ?? null;
    const newValue = after[field] ?? null;
    if (oldValue !== newValue) {
      await logFieldChange({ tx, taskId, actorId, field, oldValue, newValue });
    }
  }
}
