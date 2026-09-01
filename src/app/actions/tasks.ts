'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import {
  alertDismissals,
  projectMembers,
  projects,
  taskAssignees,
  taskDependencies,
  tasks,
  type TaskStatus,
} from '@/db/schema';
import {
  logAssignment,
  logChangedFields,
  logComment,
  logCreated,
  logDependency,
  logStatusChange,
} from '@/lib/activity';
import { requireUser } from '@/lib/auth/session';
import { AuthzError, requireManager, requireProjectAccess, requireTaskWriteAccess } from '@/lib/authz';
import { getBlockers, getTask, transitionContext } from '@/lib/queries/task-detail';
import { taskRef, validateTransition } from '@/lib/task-status';
import { commentSchema, firstError, taskSchema } from '@/lib/validation/schemas';

export type ActionState = { error?: string; ok?: string } | undefined;

function toMessage(err: unknown): string {
  if (err instanceof AuthzError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('task_assignees_membership_fk')) {
    return 'That person is not a member of this project, so they cannot be assigned to its tasks.';
  }
  if (message.includes('task_dependencies_task_fk') || message.includes('task_dependencies_blocking_fk')) {
    return 'A task can only be blocked by another task in the same project.';
  }
  if (message.includes('task_dependencies_no_self_block')) return 'A task cannot block itself.';
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
 */
export async function deleteTask(taskId: string): Promise<ActionState> {
  let projectId: string;
  try {
    const { user, task } = await loadTaskForActor(taskId);
    requireManager(user, 'delete tasks');
    projectId = task.projectId;
    await db.delete(tasks).where(eq(tasks.id, taskId));
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

/** People who may be assigned to this task — Goal 5.2, the project's members and nobody else. */
export async function assignableMembers(projectId: string) {
  return db
    .select({ id: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
}

/** Re-exported so the detail page can show why Done is unavailable. */
export { getBlockers };
