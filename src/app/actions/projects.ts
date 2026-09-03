'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { projectMembers, projects, taskAssignees, tasks } from '@/db/schema';
import { logAssignment } from '@/lib/activity';
import { requireUser } from '@/lib/auth/session';
import { AuthzError, requireManager, requireProjectAccess } from '@/lib/authz';
import { firstError, projectEditSchema, projectSchema } from '@/lib/validation/schemas';

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

/** Turns the expected failure kinds into a message the form can show. */
function toMessage(err: unknown): string {
  if (err instanceof AuthzError) return err.message;
  const text = errorText(err);
  if (text.includes('projects_key_unique') || /duplicate key.*projects/i.test(text)) {
    return 'That project key is already in use. Pick another.';
  }
  if (text.includes('projects_key_format')) {
    return 'Use 2–10 letters or digits, starting with a letter, e.g. ACME.';
  }
  if (text.includes('project_members_pkey')) return 'That person is already on this project.';
  console.error(err);
  return 'Something went wrong. Please try again.';
}

/* --------------------------------------------------------------------- CRUD */

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let newId: string;
  try {
    const user = await requireUser();
    requireManager(user, 'create projects'); // Goal 1.3, checked on the server

    const parsed = projectSchema.safeParse({
      key: formData.get('key'),
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      ownerId: formData.get('ownerId'),
    });
    if (!parsed.success) return { error: firstError(parsed.error) };

    const [created] = await db.transaction(async (tx) => {
      const inserted = await tx.insert(projects).values(parsed.data).returning();
      // The owner is always a member of their own project — otherwise a manager could own a project
      // whose tasks they cannot be assigned to.
      await tx
        .insert(projectMembers)
        .values({ projectId: inserted[0].id, userId: parsed.data.ownerId });
      return inserted;
    });
    newId = created.id;
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath('/projects');
  redirect(`/projects/${newId}`);
}

export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    requireManager(user, 'edit projects');

    const projectId = String(formData.get('projectId'));
    await requireProjectAccess(user, projectId);

    const parsed = projectEditSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      ownerId: formData.get('ownerId'),
    });
    if (!parsed.success) return { error: firstError(parsed.error) };

    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
      // Keep the invariant that an owner is a member of their own project.
      await tx
        .insert(projectMembers)
        .values({ projectId, userId: parsed.data.ownerId })
        .onConflictDoNothing();
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects');
    return { ok: 'Project updated.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* ---------------------------------------------------------- archive/restore */

/**
 * Goal 2.4/2.6 — archiving sets a timestamp. Nothing is deleted: the project, its tasks and their
 * whole history stay exactly as they were, and restoring is setting the column back to null.
 */
export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionState> {
  try {
    const user = await requireUser();
    requireManager(user, 'archive projects');
    await requireProjectAccess(user, projectId);

    await db
      .update(projects)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    return { ok: archived ? 'Project archived.' : 'Project restored.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/* ----------------------------------------------------------------- members */

export async function addProjectMember(projectId: string, userId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    requireManager(user, 'change who is on a project');
    await requireProjectAccess(user, projectId);

    await db.insert(projectMembers).values({ projectId, userId }).onConflictDoNothing();

    revalidatePath(`/projects/${projectId}`);
    return { ok: 'Member added.' };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/**
 * Goal 5.3 — "removing someone from a project unassigns them from that project's tasks".
 *
 * The database would do the unassignment on its own: `task_assignees` has a composite foreign key
 * into `project_members`, so deleting the membership row cascades those assignments away. But a
 * cascade writes no activity rows, and Goal 9.4 requires every unassignment to appear in the task's
 * timeline. So this does the work explicitly, inside one transaction, and the foreign key remains
 * the floor underneath it: if this code ever has a bug, the data is still correct — it would only
 * have a gap in the audit trail.
 */
export async function removeProjectMember(projectId: string, userId: string): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requireManager(actor, 'change who is on a project');
    await requireProjectAccess(actor, projectId);

    const [project] = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (project?.ownerId === userId) {
      return { error: 'The project owner cannot be removed. Change the owner first.' };
    }

    const removed = await db.transaction(async (tx) => {
      const held = await tx
        .select({ taskId: taskAssignees.taskId })
        .from(taskAssignees)
        .where(and(eq(taskAssignees.projectId, projectId), eq(taskAssignees.userId, userId)));

      for (const row of held) {
        await logAssignment({
          tx,
          taskId: row.taskId,
          actorId: actor.id,
          subjectUserId: userId,
          assigned: false,
        });
        await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, row.taskId));
      }

      await tx
        .delete(taskAssignees)
        .where(and(eq(taskAssignees.projectId, projectId), eq(taskAssignees.userId, userId)));
      await tx
        .delete(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

      return held.length;
    });

    revalidatePath(`/projects/${projectId}`);
    return {
      ok:
        removed === 0
          ? 'Member removed.'
          : `Member removed, and unassigned from ${removed} task${removed === 1 ? '' : 's'} on this project.`,
    };
  } catch (err) {
    return { error: toMessage(err) };
  }
}
