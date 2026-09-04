/**
 * Parsing the task list's filters out of the URL query string.
 *
 * The filters live in the URL rather than in component state on purpose: it makes the list
 * shareable and bookmarkable, it survives a reload, and — the reason that matters for Goal 6 — it
 * means the server receives the filters with the request and can answer with one page of rows
 * instead of shipping everything to the browser to be filtered there.
 */
import type { TaskPriority, TaskStatus } from '@/db/schema';
import { isUuid } from '@/lib/validation/schemas';
import { OPEN_STATUSES } from '@/lib/task-status';

import type { SortDir, SortKey, TaskFilters } from './tasks';

const STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'in_review', 'blocked', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const SORTS: SortKey[] = ['due_date', 'priority', 'updated_at'];

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.length > 0 ? str : undefined;
}

function many(params: Params, key: string): string[] {
  const value = params[key];
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(',')).filter(Boolean);
}

export function parseFilters(params: Params): TaskFilters {
  const statusParam = many(params, 'status');
  // `?status=open` is the shorthand the dashboard tiles link to.
  const statuses = statusParam.includes('open')
    ? OPEN_STATUSES
    : (statusParam.filter((s) => STATUSES.includes(s as TaskStatus)) as TaskStatus[]);

  const sort = one(params, 'sort');
  const dir = one(params, 'dir');

  return {
    q: one(params, 'q'),
    // Ignored rather than passed on: an id that cannot identify a row is not a filter.
    projectId: isUuid(one(params, 'project')) ? one(params, 'project') : undefined,
    statuses: statuses.length ? statuses : undefined,
    assigneeId: isUuid(one(params, 'assignee')) ? one(params, 'assignee') : undefined,
    priorities: many(params, 'priority').filter((p) =>
      PRIORITIES.includes(p as TaskPriority),
    ) as TaskPriority[],
    overdueOnly: one(params, 'overdue') === '1',
    includeArchived: one(params, 'archived') === '1',
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'updated_at',
    dir: dir === 'asc' ? 'asc' : ('desc' as SortDir),
    page: Math.max(1, Number(one(params, 'page') ?? 1) || 1),
  };
}

/** Rebuilds a query string, so links can change one filter and keep the rest. */
export function buildQuery(params: Params, changes: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) if (v) search.append(key, v);
  }
  for (const [key, value] of Object.entries(changes)) {
    search.delete(key);
    if (value !== undefined && value !== '') search.set(key, value);
  }
  // Any filter change resets to the first page — staying on page 7 of a narrower result is a bug.
  if (!('page' in changes)) search.delete('page');
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
