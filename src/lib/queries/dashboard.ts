/**
 * Dashboard metrics — Goal 8.
 *
 * Every number here is a SQL aggregate scoped to what the viewer can see. None of it is computed by
 * pulling rows into JavaScript and counting them, which matters because a manager's scope is the
 * entire portfolio.
 */
import 'server-only';

import { and, eq, gte, isNotNull, lt, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  projects,
  taskAssignees,
  tasks,
  users,
  type TaskStatus,
  type User,
} from '@/db/schema';
import { addDays, lastNWeeks, startOfWeek, todayISO, toISODate } from '@/lib/dates';

import { visibleProjects } from './visibility';

export type Headline = {
  openTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  completedThisWeek: number;
};

export async function headlineNumbers(user: User): Promise<Headline> {
  const weekStart = startOfWeek();
  const weekEnd = addDays(weekStart, 7);
  const today = todayISO();

  // One pass over the visible tasks, four conditional counts. Four separate queries would have been
  // four scans of the same rows.
  const [row] = await db
    .select({
      openTasks: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      overdueTasks: sql<number>`count(*) filter (
        where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${today}
      )::int`,
      dueThisWeek: sql<number>`count(*) filter (
        where ${tasks.status} <> 'done'
          and ${tasks.dueDate} >= ${toISODate(weekStart)}
          and ${tasks.dueDate} < ${toISODate(weekEnd)}
      )::int`,
      completedThisWeek: sql<number>`count(*) filter (
        where ${tasks.completedAt} >= ${weekStart}
      )::int`,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(visibleProjects(user));

  return row ?? { openTasks: 0, overdueTasks: 0, dueThisWeek: 0, completedThisWeek: 0 };
}

/** Goal 8.5 — the breakdown by status. */
export async function countsByStatus(user: User): Promise<{ status: TaskStatus; n: number }[]> {
  const rows = await db
    .select({ status: tasks.status, n: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(visibleProjects(user))
    .groupBy(tasks.status);
  return rows;
}

/**
 * Goal 8.6 — the breakdown by assignee. This is the query that answers "who is overloaded", which is
 * one of the two questions the whole product exists for, so it counts open work rather than all work
 * and splits out the overdue portion.
 */
export async function loadByAssignee(user: User) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      overdue: sql<number>`count(*) filter (
        where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${todayISO()}
      )::int`,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(and(visibleProjects(user), ne(tasks.status, 'done')))
    .groupBy(users.id, users.name)
    .orderBy(sql`count(*) desc`);
}

/** Goal 8.7 — completions per week for the last eight weeks. */
export async function completionsByWeek(user: User) {
  const weeks = lastNWeeks(8);
  const from = weeks[0].start;

  const rows = await db
    .select({
      // date_trunc gives the Monday of each ISO week, which matches how `lastNWeeks` buckets.
      week: sql<string>`to_char(date_trunc('week', ${tasks.completedAt}), 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(visibleProjects(user), isNotNull(tasks.completedAt), gte(tasks.completedAt, from)))
    .groupBy(sql`date_trunc('week', ${tasks.completedAt})`);

  const counts = new Map(rows.map((r) => [r.week, r.n]));
  // Weeks with no completions must still appear, or the chart lies about the shape of the trend.
  return weeks.map((w) => ({ label: w.label, count: counts.get(toISODate(w.start)) ?? 0 }));
}

/** A small "needs attention" list under the headline numbers. */
export async function mostOverdue(user: User, limit = 5) {
  return db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      dueDate: tasks.dueDate,
      status: tasks.status,
      priority: tasks.priority,
      projectKey: projects.key,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(visibleProjects(user), ne(tasks.status, 'done'), lt(tasks.dueDate, todayISO())))
    .orderBy(tasks.dueDate)
    .limit(limit);
}
