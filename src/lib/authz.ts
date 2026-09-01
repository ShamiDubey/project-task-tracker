/**
 * Authorisation — who may do what.
 *
 * Goal 1 requires the manager/member split to be enforced on the server rather than hidden in the
 * interface. Every mutation in this application starts by calling one of these, and they all take
 * the actor from the session rather than from anything the request supplied.
 *
 * Errors thrown here are `AuthzError`, which server actions convert into a message the user sees.
 */
import 'server-only';

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { projectMembers, type User } from '@/db/schema';

export class AuthzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthzError';
  }
}

export function isManager(user: User): boolean {
  return user.role === 'manager';
}

/**
 * Goal 1.3: only managers create or archive projects, change who is on a project, or delete tasks.
 */
export function requireManager(user: User, action = 'perform this action'): void {
  if (!isManager(user)) {
    throw new AuthzError(`Only managers can ${action}.`);
  }
}

export async function isProjectMember(user: User, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1);
  return Boolean(row);
}

/**
 * Goal 1.5: members only see projects they belong to. Managers see the whole portfolio — that is
 * the point of the role, and "answer 'what is overdue' across the whole portfolio" is one of the
 * two questions the product exists to answer.
 */
export async function canViewProject(user: User, projectId: string): Promise<boolean> {
  if (isManager(user)) return true;
  return isProjectMember(user, projectId);
}

export async function requireProjectAccess(user: User, projectId: string): Promise<void> {
  if (!(await canViewProject(user, projectId))) {
    // Deliberately the same message as a missing project: a member should not be able to learn
    // that a project exists by probing ids.
    throw new AuthzError('Project not found.');
  }
}

/** Members may act on tasks inside their projects; managers anywhere. */
export async function requireTaskWriteAccess(user: User, projectId: string): Promise<void> {
  if (isManager(user)) return;
  if (!(await isProjectMember(user, projectId))) {
    throw new AuthzError('You are not a member of this project.');
  }
}
