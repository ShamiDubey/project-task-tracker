import 'server-only';

import { and, asc, count, eq, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { projectMembers, projects, tasks, users, type User } from '@/db/schema';
import { todayISO } from '@/lib/dates';

import { visibleProjects } from './visibility';

export type ProjectSummary = {
  id: string;
  key: string;
  name: string;
  description: string;
  archivedAt: Date | null;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  openTasks: number;
  overdueTasks: number;
};

export async function listProjects(user: User, includeArchived = false): Promise<ProjectSummary[]> {
  return db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      archivedAt: projects.archivedAt,
      ownerId: projects.ownerId,
      ownerName: users.name,
      memberCount: sql<number>`(
        select count(*)::int from ${projectMembers} where ${projectMembers.projectId} = ${projects.id}
      )`,
      openTasks: sql<number>`(
        select count(*)::int from ${tasks}
        where ${tasks.projectId} = ${projects.id} and ${tasks.status} <> 'done'
      )`,
      overdueTasks: sql<number>`(
        select count(*)::int from ${tasks}
        where ${tasks.projectId} = ${projects.id}
          and ${tasks.status} <> 'done'
          and ${tasks.dueDate} < ${todayISO()}
      )`,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(visibleProjects(user, includeArchived))
    .orderBy(asc(projects.archivedAt), asc(projects.key));
}

export async function getProject(user: User, projectId: string) {
  const [row] = await db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      archivedAt: projects.archivedAt,
      ownerId: projects.ownerId,
      ownerName: users.name,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    // Archived projects are still reachable by direct link — Goal 2.5 says archiving hides a project
    // from the *default views*, not that it becomes unreachable. Its data survives intact.
    .where(and(eq(projects.id, projectId), visibleProjects(user, true)))
    .limit(1);
  return row ?? null;
}

export async function listProjectMembers(projectId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      addedAt: projectMembers.addedAt,
      openTasks: sql<number>`(
        select count(*)::int from ${tasks}
        join task_assignees ta on ta.task_id = ${tasks.id}
        where ta.user_id = ${users.id} and ${tasks.projectId} = ${projectId} and ${tasks.status} <> 'done'
      )`,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(users.name));
}

/** Everyone, for the owner and "add member" pickers. */
export async function listAllUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
}

export async function countProjectTasks(projectId: string) {
  const [row] = await db
    .select({
      total: count(),
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));
  return row ?? { total: 0, open: 0 };
}

/** Projects the viewer can pick from in filters — cheap, no aggregates. */
export async function listProjectOptions(user: User, includeArchived = false) {
  return db
    .select({ id: projects.id, key: projects.key, name: projects.name })
    .from(projects)
    .where(visibleProjects(user, includeArchived))
    .orderBy(asc(projects.key));
}

/** People who can be filtered by, i.e. anyone the viewer shares a project with. Managers see all. */
export async function listAssigneeOptions(user: User) {
  if (user.role === 'manager') return listAllUsers();
  return db
    .selectDistinct({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .innerJoin(projectMembers, eq(projectMembers.userId, users.id))
    .where(
      sql`${projectMembers.projectId} in (
        select project_id from project_members where user_id = ${user.id}
      )`,
    )
    .orderBy(asc(users.name));
}

export async function activeProjectCount(user: User): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(projects)
    .where(and(visibleProjects(user), isNull(projects.archivedAt), ne(projects.key, '')));
  return row?.n ?? 0;
}
