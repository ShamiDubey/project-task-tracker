'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import {
  alertDismissals,
  projects,
  taskAssignees,
  taskDependencies,
  tasks,
  timeEntries,
  type TaskStatus,
} from '@/db/schema';
import {
  logAssignment,
  logChangedFields,
  logComment,
  logCreated,
  logDependency,
  logFieldChange,
  logStatusChange,
} from '@/lib/activity';
import { requireUser } from '@/lib/auth/session';
import { AuthzError, requireManager, requireProjectAccess, requireTaskWriteAccess } from '@/lib/authz';
import { getTask, transitionContext } from '@/lib/queries/task-detail';
import { taskRef, validateTransition } from '@/lib/task-status';
import { commentSchema, firstError, taskSchema } from '@/lib/validation/schemas';

export type ActionState = { error?: string; ok?: string } | undefined;

/**
 * Flattens an error into searchable text.
 *
 * Drizzle wraps a driver error in its own, putting the Postgres message on `cause`, so a plain
 * `err.message.includes('...')` never sees the constraint name. Postgres also exposes the offending
 * constraint on a `constraint` property, which is the most reliable signal of the three — hence
 * walking the chain and collecting all of them.
 */
function errorText(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof Error) {
      parts.push(current.message);
      const constraint = (current as { constraint?: unknown }).constraint;
      if (typeof constraint === 'string') parts.push(constraint);
      current = (current as { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(' | ');
}

function toMessage(err: unknown): string {
  if (err instanceof AuthzError) return err.message;
  const text = errorText(err);
  if (text.includes('task_assignees_membership_fk')) {
    return 'That person is not a member of this project, so they cannot be assigned to its tasks.';
  }
  if (text.includes('task_dependencies_task_fk') || text.includes('task_dependencies_blocking_fk')) {
    return 'A task can only be blocked by another task in the same project.';
  }
  if (text.includes('task_dependencies_no_self_block')) return 'A task cannot block itself.';
  if (text.includes('tasks_blocked_state_consistent') || text.includes('tasks_completed_at_consistent')) {
    return 'That would leave the task in an inconsistent state. Reload and try again.';
  }
  console.error(err);
  return 'Something went wrong. Please try again.';
}

/** Loads a task and confirms the viewer is allowed to see its project. */
async function loadTaskForActor(taskId: string) {
  const user = await requireUser();
  const task = await getTask(taskId);
  if (!task) throw new AuthzError('Task not found.');
  await requireProjectAccess(user, task.projectId);
  return { user, task };
}

/* ------------------------------------------------------------------ create */

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let created: { id: string } | null = null;
  try {
    const user = await requireUser();
    const projectId = String(formData.get('projectId'));
    await requireProjectAccess(user, projectId);
    await requireTaskWriteAccess(user, projectId);

    const [project] = await db
      .select({ archivedAt: projects.archivedAt })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (project?.archivedAt) return { error: 'This project is archived. Restore it to add tasks.' };

    const parsed = taskSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      priority: formData.get('priority'),
      dueDate: formData.get('dueDate') || null,
    });
    if (!parsed.success) return { error: firstError(parsed.error) };

    created = await db.transaction(async (tx) => {
      // Allocate the next per-project number under the same transaction, so numbers are gapless
      // and two simultaneous creations cannot collide.
      const [{ taskSeq }] = await tx
        .update(projects)
        .set({ taskSeq: sql`${projects.taskSeq} + 1` })
        .where(eq(projects.id, projectId))
        .returning({ taskSeq: projects.taskSeq });

      const [task] = await tx
        .insert(tasks)
        .values({
          projectId,
          number: taskSeq,
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority,
          dueDate: parsed.data.dueDate,
          createdById: user.id,
        })
        .returning({ id: tasks.id });

      await logCreated({ tx, taskId: task.id, actorId: user.id });
      return task;
    });
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath('/tasks');
  redirect(`/tasks/${created.id}`);
}

/* -------------------------------------------------------------------- edit */

export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const taskId = String(formData.get('taskId'));
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    const parsed = taskSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      priority: formData.get('priority'),
      dueDate: formData.get('dueDate') || null,
    });
    if (!parsed.success) return { error: firstError(parsed.error) };

    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      // Goal 9.3 — one timeline row per field that actually changed, with both values.
      await logChangedFields({
        tx,
        taskId,
        actorId: user.id,
        before: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: task.dueDate,
        },
        after: {
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority,
          due_date: parsed.data.dueDate,
        },
      });
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Task updated.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/**
 * Goal 1.3 — deleting a task is a manager-only action, checked here on the server. A member who
 * crafts the request by hand gets the same refusal as one who never sees the button.
 *
 * It is a *soft* delete, and that is a deliberate reading of two goals that collide. Goal 1.3 lets
 * managers delete tasks; Goal 9.6 says nothing in the timeline can be deleted, "including by
 * managers". A hard delete would cascade the task's history away and hand every manager a way to
 * erase the record — which is exactly what Goal 9 exists to prevent.
 *
 * So the task disappears from every view and its timeline survives, with the deletion itself
 * recorded as the last entry. This mirrors the pattern the brief already sanctions for projects,
 * where archiving hides something "without destroying its data".
 */
export async function deleteTask(taskId: string): Promise<ActionState> {
  let projectId: string;
  try {
    const { user, task } = await loadTaskForActor(taskId);
    requireManager(user, 'delete tasks');
    projectId = task.projectId;

    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
      await logFieldChange({
        tx,
        taskId,
        actorId: user.id,
        field: 'deleted',
        oldValue: null,
        newValue: new Date().toISOString(),
      });
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath('/tasks');
  redirect(`/projects/${projectId}`);
}

/* ------------------------------------------------------------ status moves */

/**
 * The single place a status change is applied — Goal 4.
 *
 * Legality is decided by `validateTransition`, the same function the interface uses to decide which
 * buttons to render, so the server can never reject a move the UI offered. On rejection it returns
 * the reason, because Goal 4.6 asks for a message explaining why rather than a bare refusal.
 *
 * Exported for reuse by the bulk operation, which needs identical rules and identical wording.
 */
export async function applyStatusChange(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  args: { taskId: string; to: TaskStatus; actorId: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ctx = await transitionContext(args.taskId);
  if (!ctx) return { ok: false, reason: 'Task not found.' };

  const verdict = validateTransition(ctx, args.to);
  if (!verdict.ok) return verdict;

  const from = ctx.status;
  await tx
    .update(tasks)
    .set({
      status: args.to,
      // Goal 4.3 — remember where we came from on the way in, and forget it on the way out. A check
      // constraint makes any other combination impossible to write.
      blockedFromStatus: args.to === 'blocked' ? (from as TaskStatus) : null,
      // Kept in step with status by another check constraint, because the dashboard chart reads it.
      completedAt: args.to === 'done' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, args.taskId));

  await logStatusChange({ tx, taskId: args.taskId, actorId: args.actorId, from, to: args.to });
  return { ok: true };
}

export async function changeTaskStatus(taskId: string, to: TaskStatus): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    const result = await db.transaction(async (tx) =>
      applyStatusChange(tx, { taskId, to, actorId: user.id }),
    );
    if (!result.ok) return { error: result.reason };

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath('/tasks');
    return { ok: 'Status updated.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* -------------------------------------------------------------- assignment */

export async function assignUser(taskId: string, userId: string): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    await db.transaction(async (tx) => {
      // Goal 5.2 is guaranteed by a foreign key into project_members; this insert simply fails if
      // the person is not on the project, and `toMessage` turns that into a readable sentence.
      await tx
        .insert(taskAssignees)
        .values({ taskId, userId, projectId: task.projectId, assignedById: user.id })
        .onConflictDoNothing();
      await logAssignment({ tx, taskId, actorId: user.id, subjectUserId: userId, assigned: true });
      await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Assigned.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function unassignUser(taskId: string, userId: string): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    await db.transaction(async (tx) => {
      await tx
        .delete(taskAssignees)
        .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
      await logAssignment({ tx, taskId, actorId: user.id, subjectUserId: userId, assigned: false });
      await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Unassigned.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* ------------------------------------------------------------ dependencies */

export async function addDependency(taskId: string, blockingTaskId: string): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    const blocker = await getTask(blockingTaskId);
    if (!blocker) return { error: 'That task could not be found.' };

    await db.transaction(async (tx) => {
      // The composite foreign keys enforce the same-project rule (Goal 3.4); passing the blocked
      // task's project here is what makes a cross-project attempt fail rather than succeed.
      await tx
        .insert(taskDependencies)
        .values({ taskId, blockingTaskId, projectId: task.projectId, createdById: user.id })
        .onConflictDoNothing();
      await logDependency({
        tx,
        taskId,
        actorId: user.id,
        blockerRef: taskRef(blocker.projectKey, blocker.number),
        added: true,
      });
      await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Blocker added.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function removeDependency(taskId: string, blockingTaskId: string): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    const blocker = await getTask(blockingTaskId);

    await db.transaction(async (tx) => {
      await tx
        .delete(taskDependencies)
        .where(
          and(
            eq(taskDependencies.taskId, taskId),
            eq(taskDependencies.blockingTaskId, blockingTaskId),
          ),
        );
      await logDependency({
        tx,
        taskId,
        actorId: user.id,
        blockerRef: blocker ? taskRef(blocker.projectKey, blocker.number) : 'a task',
        added: false,
      });
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Blocker removed.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* ---------------------------------------------------------------- comments */

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const taskId = String(formData.get('taskId'));
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    const parsed = commentSchema.safeParse({ body: formData.get('body') });
    if (!parsed.success) return { error: firstError(parsed.error) };

    // Goal 9.5 — a comment is a row in the same timeline as everything else, and like everything
    // else in that table it can never be edited or deleted afterwards.
    await db.transaction(async (tx) => {
      await logComment({ tx, taskId, actorId: user.id, body: parsed.data.body });
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Comment added.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* ------------------------------------------------------------------ alerts */

/**
 * Goal 10.3/10.4 — dismiss an overdue alert.
 *
 * The dismissal records the due date it was dismissed against. That single column is what makes
 * "the alert comes back if the due date changes" work without any code running on the change.
 */
export async function dismissAlert(taskId: string): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    if (!task.dueDate) return { error: 'That task has no due date, so it has no alert.' };

    // Only someone assigned to the task may dismiss its alert.
    const [assigned] = await db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id)))
      .limit(1);
    if (!assigned) return { error: 'You can only dismiss alerts for tasks you are assigned to.' };

    await db
      .insert(alertDismissals)
      .values({ userId: user.id, taskId, dismissedDueDate: task.dueDate })
      .onConflictDoUpdate({
        target: [alertDismissals.userId, alertDismissals.taskId],
        set: { dismissedDueDate: task.dueDate, dismissedAt: new Date() },
      });

    revalidatePath('/alerts');
    revalidatePath('/dashboard');
    return { ok: 'Alert dismissed. It will return if the due date changes.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}



/* --------------------------------------------------------------- time tracking */

/**
 * Log a stretch of time against a task — a stretch feature, kept off the main mutation paths.
 *
 * A member may log time on any task in a project they belong to. The value is validated at the
 * boundary and again by a database check constraint, so a nonsensical duration cannot be stored
 * even if the form is bypassed.
 */
export async function logTime(
  taskId: string,
  minutes: number,
  spentOn: string,
  note: string,
): Promise<ActionState> {
  try {
    const { user, task } = await loadTaskForActor(taskId);
    await requireTaskWriteAccess(user, task.projectId);

    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
      return { error: 'Enter between 1 and 1440 minutes.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) return { error: 'Choose a valid date.' };

    await db.insert(timeEntries).values({
      taskId,
      userId: user.id,
      minutes,
      spentOn,
      note: note.trim().slice(0, 500),
    });

    revalidatePath(`/tasks/${taskId}`);
    return { ok: 'Time logged.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}
