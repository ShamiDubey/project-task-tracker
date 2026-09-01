/**
 * Who can see what — Goal 1.5.
 *
 * Every list query in the application starts from one of these, so the visibility rule is written
 * once. A member sees only the projects they belong to; a manager sees the whole portfolio, which is
 * the point of the role and what makes "what is overdue across the portfolio" answerable at all.
 *
 * Note these produce SQL conditions rather than filtering in JavaScript. The brief bans loading
 * everything into the browser, and the same logic applies one layer down: we do not want to load
 * every project into the server either.
 */
import 'server-only';

import { and, eq, inArray, isNull, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { projectMembers, projects, type User } from '@/db/schema';

/** Subquery: the ids of projects this person is a member of. */
export function memberProjectIds(user: User) {
  return db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id));
}

/**
 * A condition on the `projects` table. `includeArchived` defaults to false because Goal 2.5 says
 * archiving hides a project from the *default* views — the archived ones are still reachable, but
 * only when explicitly asked for.
 */
export function visibleProjects(user: User, includeArchived = false): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];
  if (!includeArchived) conditions.push(isNull(projects.archivedAt));
  if (user.role !== 'manager') conditions.push(inArray(projects.id, memberProjectIds(user)));
  return and(...conditions.filter(Boolean));
}
