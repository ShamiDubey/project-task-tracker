/**
 * The task list — Goal 6.
 *
 * "One list shows tasks across every project the viewer can see, with a text search over titles and
 * descriptions, filters for project, status, assignee, priority and overdue, sorting by due date,
 * priority or last update, and pagination showing the total number of matches. All of this must be
 * done by the server — do not load every task into the browser and filter there."
 *
 * So every filter below is a SQL predicate and the page returns one page of rows plus a count. The
 * assignees for those rows are fetched in a second query keyed on the page's task ids — two queries
 * total, regardless of page size, rather than one per row.
 */
import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  projects,
  taskAssignees,
  taskDependencies,
  tasks,
  users,
  type TaskPriority,
  type TaskStatus,
  type User,
} from '@/db/schema';
import { todayISO } from '@/lib/dates';

import { visibleProjects } from './visibility';

export type SortKey = 'due_date' | 'priority' | 'updated_at';
export type SortDir = 'asc' | 'desc';

export type TaskFilters = {
  q?: string;
  projectId?: string;
  statuses?: TaskStatus[];
  assigneeId?: string;
  priorities?: TaskPriority[];
  overdueOnly?: boolean;
  includeArchived?: boolean;
  sort?: SortKey;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
};

export type TaskRow = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  updatedAt: Date;
  projectId: string;
  projectKey: string;
  projectName: string;
  blockerCount: number;
  unfinishedBlockerCount: number;
  assignees: { id: string; name: string }[];
};

export const DEFAULT_PAGE_SIZE = 25;

/** Builds the WHERE clause shared by the list, the count and the CSV export. */
function buildWhere(user: User, f: TaskFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    visibleProjects(user, f.includeArchived ?? false),
    // Soft-deleted tasks are invisible everywhere. Filtering here rather than at each call site is
    // what makes that true of the list, the count, the CSV export and My tasks at once.
    isNull(tasks.deletedAt),
  ];

  // Goal 6.1 — text search over titles *and* descriptions.
  if (f.q) {
    const needle = `%${f.q}%`;
    conditions.push(or(ilike(tasks.title, needle), ilike(tasks.description, needle)));
  }
  if (f.projectId) conditions.push(eq(tasks.projectId, f.projectId));
  if (f.statuses?.length) conditions.push(inArray(tasks.status, f.statuses));
  if (f.priorities?.length) conditions.push(inArray(tasks.priority, f.priorities));

  // Goal 6.4 — filter by assignee, as an EXISTS rather than a join, so a task with three assignees
  // still appears exactly once.
  if (f.assigneeId) {
    conditions.push(sql`exists (
      select 1 from ${taskAssignees}
      where ${taskAssignees.taskId} = ${tasks.id} and ${taskAssignees.userId} = ${f.assigneeId}
    )`);
  }

  // Goal 6.6 — overdue means past the due date and not finished.
  if (f.overdueOnly) {
    conditions.push(and(isNotNull(tasks.dueDate), lt(tasks.dueDate, todayISO()), ne(tasks.status, 'done')));
  }

  return and(...conditions.filter(Boolean));
}

function buildOrder(sort: SortKey, dir: SortDir): SQL[] {
  const direction = dir === 'asc' ? asc : desc;
  switch (sort) {
    case 'due_date':
      // Tasks with no due date sort last either way — an absent date is not "the earliest".
      return [sql`${tasks.dueDate} ${sql.raw(dir)} nulls last`, desc(tasks.updatedAt)];
    case 'priority':
      // Postgres orders enums by declaration order, which is low → urgent, so descending puts the
      // urgent work first. This is why priority is an enum and not text.
      return [direction(tasks.priority), desc(tasks.updatedAt)];
    case 'updated_at':
    default:
      return [direction(tasks.updatedAt)];
  }
}

/** Attaches assignees to a page of rows using one extra query, not one per row. */
async function attachAssignees(rows: Omit<TaskRow, 'assignees'>[]): Promise<TaskRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const links = await db
    .select({ taskId: taskAssignees.taskId, id: users.id, name: users.name })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(inArray(taskAssignees.taskId, ids))
    .orderBy(users.name);

  const byTask = new Map<string, { id: string; name: string }[]>();
  for (const link of links) {
    const list = byTask.get(link.taskId) ?? [];
    list.push({ id: link.id, name: link.name });
    byTask.set(link.taskId, list);
  }
  return rows.map((r) => ({ ...r, assignees: byTask.get(r.id) ?? [] }));
}

const SELECT_SHAPE = {
  id: tasks.id,
  number: tasks.number,
  title: tasks.title,
  status: tasks.status,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  updatedAt: tasks.updatedAt,
  projectId: projects.id,
  projectKey: projects.key,
  projectName: projects.name,
  blockerCount: sql<number>`(
    select count(*)::int from ${taskDependencies} where ${taskDependencies.taskId} = ${tasks.id}
  )`,
  unfinishedBlockerCount: sql<number>`(
    select count(*)::int from ${taskDependencies}
    join ${tasks} as blocker on blocker.id = ${taskDependencies.blockingTaskId}
    where ${taskDependencies.taskId} = ${tasks.id} and blocker.status <> 'done'
  )`,
};

export type TaskPage = {
  rows: TaskRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listTasks(user: User, f: TaskFilters = {}): Promise<TaskPage> {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, f.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = buildWhere(user, f);
  const order = buildOrder(f.sort ?? 'updated_at', f.dir ?? 'desc');

  // Goal 6.8 wants the total number of matches, so the count runs over the whole filtered set. It is
  // a second scan of the same predicate; docs/schema.md records this as one of the first things that
  // would need attention at 100x the data.
  const [[{ n: total }], rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(where),
    db
      .select(SELECT_SHAPE)
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(where)
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    rows: await attachAssignees(rows),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Goal 7.6 — the CSV export runs the same predicate builder as the list, so the file always matches
 * what is on screen. Capped, and the cap is stated in the UI rather than left as a surprise.
 */
export const CSV_ROW_CAP = 5000;

export async function listTasksForExport(user: User, f: TaskFilters = {}): Promise<TaskRow[]> {
  const rows = await db
    .select(SELECT_SHAPE)
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(buildWhere(user, f))
    .orderBy(...buildOrder(f.sort ?? 'updated_at', f.dir ?? 'desc'))
    .limit(CSV_ROW_CAP);
  return attachAssignees(rows);
}

/** Goal 5.4 — one list of everything assigned to me, across every project. */
export async function listMyTasks(user: User, f: TaskFilters = {}): Promise<TaskPage> {
  return listTasks(user, { ...f, assigneeId: user.id });
}
