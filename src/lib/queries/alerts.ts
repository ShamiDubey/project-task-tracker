/**
 * Overdue alerts — Goal 10.
 *
 * A task raises an alert when it is past its due date and not finished. The dismissal rule is the
 * interesting part: a dismissal stores the due date it was dismissed against, so it only suppresses
 * the alert while that value still matches the task's current due date. Change the due date from
 * anywhere, in either direction, and the alert returns on its own — no cleanup job, and no
 * dependence on every writer remembering to clear a flag.
 */
import 'server-only';

import { and, count, eq, isNull, lt, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { alertDismissals, projects, taskAssignees, tasks, type User } from '@/db/schema';
import { todayISO } from '@/lib/dates';

import { visibleProjects } from './visibility';

/**
 * The dismissal test, as SQL: "no dismissal row exists for this user, on this task, recorded against
 * the due date the task currently has".
 */
function notDismissedBy(user: User) {
  return sql`not exists (
    select 1 from ${alertDismissals}
    where ${alertDismissals.taskId} = ${tasks.id}
      and ${alertDismissals.userId} = ${user.id}
      and ${alertDismissals.dismissedDueDate} = ${tasks.dueDate}
  )`;
}

function overdueConditions(user: User) {
  return and(
    lt(tasks.dueDate, todayISO()),
    ne(tasks.status, 'done'),
    isNull(projects.archivedAt),
    visibleProjects(user),
    notDismissedBy(user),
  );
}

/** Goal 10.2 — the count badge in the navigation. */
export async function countOpenAlerts(user: User): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(overdueConditions(user));
  return row?.n ?? 0;
}

export type AlertRow = {
  taskId: string;
  number: number;
  title: string;
  status: (typeof tasks.$inferSelect)['status'];
  priority: (typeof tasks.$inferSelect)['priority'];
  dueDate: string;
  projectId: string;
  projectKey: string;
  projectName: string;
  /** Goal 10.3 — only someone assigned to the task may dismiss its alert. */
  isAssignedToViewer: boolean;
};

export async function listOpenAlerts(user: User): Promise<AlertRow[]> {
  const rows = await db
    .select({
      taskId: tasks.id,
      number: tasks.number,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: projects.id,
      projectKey: projects.key,
      projectName: projects.name,
      isAssignedToViewer: sql<boolean>`exists (
        select 1 from ${taskAssignees}
        where ${taskAssignees.taskId} = ${tasks.id} and ${taskAssignees.userId} = ${user.id}
      )`,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(overdueConditions(user))
    .orderBy(tasks.dueDate);

  return rows.map((r) => ({ ...r, dueDate: r.dueDate! }));
}
