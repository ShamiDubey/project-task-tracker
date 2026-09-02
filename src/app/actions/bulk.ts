'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { projectMembers, taskAssignees, tasks, type TaskStatus } from '@/db/schema';
import { logAssignment, logFieldChange } from '@/lib/activity';
import { requireUser } from '@/lib/auth/session';
import { canViewProject, isManager } from '@/lib/authz';
import { getTask } from '@/lib/queries/task-detail';
import { taskRef } from '@/lib/task-status';

import { applyStatusChange } from './tasks';

/**
 * Bulk operations — Goal 7.
 *
 * "Because some of those changes will be illegal for some tasks, the result must report per task
 * what succeeded and what was rejected and why — not just fail the whole batch."
 *
 * That sentence rules out the obvious implementation. One transaction around the whole batch would
 * mean a single illegal task rolls back the other nineteen; no transaction at all would mean a task
 * could change without its timeline row, which Goal 9 makes a bug rather than a stale read.
 *
 * So each task gets its **own** transaction. A rejection rolls back only that task, the rest commit,
 * and the caller receives one result per task with the reason for every failure. The reasons come
 * from the same `validateTransition` the single-task path uses, so a bulk rejection reads exactly
 * like an individual one.
 */

export type BulkOutcome = {
  taskId: string;
  ref: string;
  title: string;
  ok: boolean;
  reason?: string;
};

export type BulkResult = {
  outcomes: BulkOutcome[];
  succeeded: number;
  failed: number;
  error?: string;
};

type BulkAction =
  | { kind: 'status'; status: TaskStatus }
  | { kind: 'assign'; userId: string; assign: boolean }
  | { kind: 'due_date'; dueDate: string | null };

async function runBulk(taskIds: string[], action: BulkAction): Promise<BulkResult> {
  const actor = await requireUser();

  if (taskIds.length === 0) {
    return { outcomes: [], succeeded: 0, failed: 0, error: 'Select at least one task first.' };
  }
  if (taskIds.length > 200) {
    return { outcomes: [], succeeded: 0, failed: 0, error: 'Select 200 tasks or fewer at a time.' };
  }

  const outcomes: BulkOutcome[] = [];

  for (const taskId of taskIds) {
    const task = await getTask(taskId);
    if (!task) {
      outcomes.push({ taskId, ref: taskId.slice(0, 8), title: '(unknown)', ok: false, reason: 'Task not found.' });
      continue;
    }

    const ref = taskRef(task.projectKey, task.number);
    const record = (ok: boolean, reason?: string) =>
      outcomes.push({ taskId, ref, title: task.title, ok, reason });

    // Authorisation is re-checked per task, not once for the batch: a selection can span projects,
    // and a member may be entitled to some of them and not others.
    if (!(await canViewProject(actor, task.projectId))) {
      record(false, 'You do not have access to this task.');
      continue;
    }
    if (!isManager(actor)) {
      const [member] = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, task.projectId), eq(projectMembers.userId, actor.id)))
        .limit(1);
      if (!member) {
        record(false, 'You are not a member of this task’s project.');
        continue;
      }
    }
    if (task.projectArchivedAt) {
      record(false, 'This task’s project is archived.');
      continue;
    }

    try {
      // One transaction per task. This is the whole point: a rejection here rolls back this task
      // alone and leaves every successful sibling committed.
      await db.transaction(async (tx) => {
        if (action.kind === 'status') {
          const result = await applyStatusChange(tx, {
            taskId,
            to: action.status,
            actorId: actor.id,
          });
          if (!result.ok) throw new RejectedError(result.reason);
          return;
        }

        if (action.kind === 'assign') {
          if (action.assign) {
            const [member] = await tx
              .select({ userId: projectMembers.userId })
              .from(projectMembers)
              .where(
                and(
                  eq(projectMembers.projectId, task.projectId),
                  eq(projectMembers.userId, action.userId),
                ),
              )
              .limit(1);
            // Goal 5.2. The foreign key would refuse this anyway; checking first lets the batch
            // report a sentence rather than a constraint name.
            if (!member) {
              throw new RejectedError('That person is not a member of this task’s project.');
            }
            await tx
              .insert(taskAssignees)
              .values({
                taskId,
                userId: action.userId,
                projectId: task.projectId,
                assignedById: actor.id,
              })
              .onConflictDoNothing();
          } else {
            await tx
              .delete(taskAssignees)
              .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, action.userId)));
          }
          await logAssignment({
            tx,
            taskId,
            actorId: actor.id,
            subjectUserId: action.userId,
            assigned: action.assign,
          });
          await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
          return;
        }

        // due_date
        if (task.dueDate === action.dueDate) {
          throw new RejectedError('Already has that due date.');
        }
        await tx
          .update(tasks)
          .set({ dueDate: action.dueDate, updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
        await logFieldChange({
          tx,
          taskId,
          actorId: actor.id,
          field: 'due_date',
          oldValue: task.dueDate,
          newValue: action.dueDate,
        });
        // Note what is *not* here: nothing clears any alert dismissal. It does not need to — a
        // dismissal is stored against a due date value, so changing the value invalidates it on its
        // own. That is exactly why Goal 10.4 works from this code path without this code path
        // knowing anything about alerts.
      });
      record(true);
    } catch (err) {
      if (err instanceof RejectedError) record(false, err.message);
      else {
        console.error(err);
        record(false, 'Could not apply the change to this task.');
      }
    }
  }

  revalidatePath('/tasks');
  revalidatePath('/my-tasks');
  revalidatePath('/alerts');

  return {
    outcomes,
    succeeded: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
  };
}

/** Thrown to roll back one task's transaction with a message worth showing the user. */
class RejectedError extends Error {}

export async function bulkChangeStatus(taskIds: string[], status: TaskStatus): Promise<BulkResult> {
  return runBulk(taskIds, { kind: 'status', status });
}

export async function bulkAssign(
  taskIds: string[],
  userId: string,
  assign: boolean,
): Promise<BulkResult> {
  return runBulk(taskIds, { kind: 'assign', userId, assign });
}

export async function bulkSetDueDate(taskIds: string[], dueDate: string | null): Promise<BulkResult> {
  return runBulk(taskIds, { kind: 'due_date', dueDate });
}
