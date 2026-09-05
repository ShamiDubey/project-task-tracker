/**
 * Goal verification.
 *
 * One check per numbered requirement in the brief, run against a real database and a running server
 * rather than against mocks — the point is to prove the behaviour the brief asks for, not that a
 * function was called. Authorisation checks issue real HTTP requests with a real session cookie,
 * because "enforced on the server, not just hidden in the interface" is only demonstrated by asking
 * the server directly.
 *
 * Assumes the demo seed, so `npm run test:goals` re-seeds first. Several checks compare a page's
 * reported total against a count from the database, and both have to be looking at the same data.
 *
 *   npm run dev          # in one terminal
 *   npm run test:goals   # in another — re-seeds, then checks
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { neon } from '@neondatabase/serverless';
import { SignJWT } from 'jose';

const sql = neon(process.env.DATABASE_URL);
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

let pass = 0;
let fail = 0;
const failures = [];

async function session(email) {
  const [u] = await sql`select id from users where email = ${email}`;
  if (!u) throw new Error(`seed user ${email} not found — run npm run db:seed`);
  const token = await new SignJWT({ sub: u.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  return { cookie: `ptt_session=${token}`, id: u.id };
}

const get = (path, cookie) =>
  fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
const body = async (path, cookie) => (await get(path, cookie)).text();

async function check(label, fn) {
  try {
    const result = await fn();
    if (result === true) {
      pass++;
      console.log(`   ok   ${label}`);
    } else {
      fail++;
      failures.push(label);
      console.log(`   FAIL ${label} — ${result}`);
    }
  } catch (err) {
    fail++;
    failures.push(label);
    console.log(`   FAIL ${label} — threw: ${err.message}`);
  }
}
const heading = (t) => console.log(`\n${t}`);

/** Total match count, read off the pagination line the brief requires. */
const totalMatches = (html) =>
  Number(html.match(/of\s*<!-- -->(\d+)<!-- -->/)?.[1] ?? html.match(/>(\d+)<\/span> matching/)?.[1] ?? -1);

function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(entry.name)) out.push(p);
    }
  })('src');
  return out;
}

const manager = await session('priya@tracker.dev');
const member = await session('sam@tracker.dev');   // on ACME and ORBIT
const outsider = await session('yuki@tracker.dev'); // on NOVA and HELIO, not ACME

const [acme] = await sql`select id, key from projects where key = 'ACME'`;
const [pixel] = await sql`select id from projects where key = 'PIXEL'`; // archived
const [anyAcmeTask] = await sql`
  select t.id from tasks t join projects p on p.id = t.project_id
  where p.key = 'ACME' and t.deleted_at is null limit 1`;

/* ---------------------------------------------------------------- goal 1 */
heading('GOAL 1 — accounts and roles');
await check('1.1 sign-in page takes an email and a password', async () =>
  (await body('/login')).includes('Password') || 'no password field');
await check('1.2 two roles exist', async () => {
  const rows = await sql`select distinct role from users order by 1`;
  const roles = rows.map((r) => r.role).join(',');
  return roles === 'manager,member' || roles;
});
await check('1.3 manager reaches project create and settings', async () =>
  ((await get('/projects/new', manager.cookie)).status === 200 &&
    (await get(`/projects/${acme.id}/settings`, manager.cookie)).status === 200) || 'blocked');
await check('1.4 member is refused project create', async () => {
  const s = (await get('/projects/new', member.cookie)).status;
  return s === 307 || `expected 307, got ${s}`;
});
await check('1.4 member is refused project settings', async () => {
  const s = (await get(`/projects/${acme.id}/settings`, member.cookie)).status;
  return s === 307 || `expected 307, got ${s}`;
});
await check('1.4 member sees no Delete control on a task', async () =>
  !(await body(`/tasks/${anyAcmeTask.id}`, member.cookie)).includes('>Delete<') || 'Delete rendered');
await check('1.3 manager does see Delete', async () =>
  (await body(`/tasks/${anyAcmeTask.id}`, manager.cookie)).includes('>Delete<') || 'missing');
await check('1.5 member 404s on a project they are not on', async () => {
  const s = (await get(`/projects/${acme.id}`, outsider.cookie)).status;
  return s === 404 || `expected 404, got ${s}`;
});
await check('1.5 member 404s on a task in that project', async () => {
  const s = (await get(`/tasks/${anyAcmeTask.id}`, outsider.cookie)).status;
  return s === 404 || `expected 404, got ${s}`;
});
await check('1.6 no session is refused at the server', async () =>
  (await get('/dashboard')).status === 307 || 'not redirected');
await check('1.6 self-registration cannot grant the manager role', async () =>
  !(await body('/register')).includes('value="manager"') || 'role selectable');

/* ---------------------------------------------------------------- goal 2 */
heading('GOAL 2 — projects');
await check('2.1 create form has key, name, description and owner', async () => {
  const html = await body('/projects/new', manager.cookie);
  return ['name="key"', 'name="name"', 'name="description"', 'name="ownerId"'].every((f) =>
    html.includes(f)) || 'a field is missing';
});
await check('2.2 the database rejects a malformed key', async () => {
  try {
    await sql`insert into projects (key, name, owner_id) values ('bad', 'x', ${manager.id})`;
    await sql`delete from projects where key = 'bad'`;
    return 'lowercase key accepted';
  } catch {
    return true;
  }
});
await check('2.3 projects can be edited', async () =>
  (await body(`/projects/${acme.id}/settings`, manager.cookie)).includes('Save changes') || 'no form');
await check('2.4 archive and restore control exists', async () =>
  (await body(`/projects/${acme.id}/settings`, manager.cookie)).includes('Archive project') || 'missing');
await check('2.5 archived project is hidden from the default list', async () =>
  !(await body('/projects', manager.cookie)).includes(pixel.id) || 'archived project shown');
await check('2.5 archived project appears when asked for', async () =>
  (await body('/projects?archived=1', manager.cookie)).includes(pixel.id) || 'missing');
await check('2.6 archiving destroyed neither the project nor its tasks', async () => {
  const [{ n }] = await sql`select count(*)::int n from tasks where project_id = ${pixel.id}`;
  const reachable = (await get(`/projects/${pixel.id}`, manager.cookie)).status === 200;
  return (n > 0 && reachable) || `tasks=${n} reachable=${reachable}`;
});

/* ---------------------------------------------------------------- goal 3 */
heading('GOAL 3 — tasks inside projects');
await check('3.1 every task belongs to exactly one project', async () => {
  const [{ n }] = await sql`select count(*)::int n from tasks where project_id is null`;
  return n === 0 || `${n} orphaned tasks`;
});
await check('3.2 a task carries title, description, priority and optional due date', async () => {
  const html = await body(`/projects/${acme.id}`, manager.cookie);
  return ['name="title"', 'name="description"', 'name="priority"', 'name="dueDate"'].every((f) =>
    html.includes(f)) || 'a field is missing';
});
await check('3.3 a task can be blocked by any number of others', async () => {
  const [{ n }] = await sql`
    select coalesce(max(c), 0)::int n from (select count(*) c from task_dependencies group by task_id) s`;
  return n >= 2 || `most blockers on one task is ${n}`;
});
await check('3.4 a cross-project blocker is refused by the database', async () => {
  const [a] = await sql`
    select t.id, t.project_id from tasks t join projects p on p.id = t.project_id where p.key='ACME' limit 1`;
  const [b] = await sql`
    select t.id from tasks t join projects p on p.id = t.project_id where p.key='NOVA' limit 1`;
  try {
    await sql`insert into task_dependencies (task_id, blocking_task_id, project_id)
              values (${a.id}, ${b.id}, ${a.project_id})`;
    await sql`delete from task_dependencies where task_id=${a.id} and blocking_task_id=${b.id}`;
    return 'cross-project dependency accepted';
  } catch {
    return true;
  }
});
await check('3.6 opening a project shows its tasks', async () =>
  (await body(`/projects/${acme.id}`, manager.cookie)).includes('ACME-1') || 'no task references');

/* ---------------------------------------------------------------- goal 4 */
heading('GOAL 4 — the lifecycle, through the rendered interface');
const [blocked] = await sql`
  select id from tasks where status='blocked' and blocked_from_status is not null and deleted_at is null limit 1`;
const [gated] = await sql`
  select t.id from tasks t
  where t.status='in_review' and t.deleted_at is null
    and exists (select 1 from task_dependencies d join tasks b on b.id=d.blocking_task_id
                where d.task_id=t.id and b.status <> 'done') limit 1`;
const [clear] = await sql`
  select t.id from tasks t
  where t.status='in_review' and t.deleted_at is null
    and not exists (select 1 from task_dependencies d join tasks b on b.id=d.blocking_task_id
                    where d.task_id=t.id and b.status <> 'done') limit 1`;
const [finished] = await sql`
  select t.id from tasks t join projects p on p.id = t.project_id
  where t.status = 'done' and t.deleted_at is null and p.archived_at is null limit 1`;

await check('4.2/4.3 a blocked task offers only the state it was blocked from', async () => {
  const html = await body(`/tasks/${blocked.id}`, manager.cookie);
  const unblock = /Unblock →/.test(html);
  const done = /Move to Done/.test(html);
  return (unblock && !done) || `unblock=${unblock} doneOffered=${done}`;
});
await check('4.3 the state it was blocked from is recorded and shown', async () =>
  (await body(`/tasks/${blocked.id}`, manager.cookie)).includes('Blocked from') || 'not shown');
await check('4.4 a finished task offers reopen', async () =>
  /Move to In Progress/.test(await body(`/tasks/${finished.id}`, manager.cookie)) || 'no reopen');
await check('4.5 In Review with an unfinished blocker hides Done and says why', async () => {
  if (!gated) return 'no such task in the seed data';
  const html = await body(`/tasks/${gated.id}`, manager.cookie);
  return (!/Move to Done/.test(html) && /Cannot move to Done: blocked by/.test(html)) ||
    'Done offered, or no reason given';
});
await check('4.5 In Review with no unfinished blocker does offer Done', async () => {
  if (!clear) return 'no such task in the seed data';
  return /Move to Done/.test(await body(`/tasks/${clear.id}`, manager.cookie)) || 'Done not offered';
});
await check('4.6 the database refuses an inconsistent blocked state', async () => {
  try {
    await sql`update tasks set status='blocked', blocked_from_status='backlog' where id=${finished.id}`;
    return 'accepted an illegal blocked_from_status';
  } catch {
    return true;
  }
});
await check('4.6 the database refuses Done without a completion time', async () => {
  try {
    await sql`update tasks set status='done', completed_at=null where id=${blocked.id}`;
    return 'accepted Done with no completed_at';
  } catch {
    return true;
  }
});
await check('4.7 the buttons come from the same module the server validates with', async () => {
  const controls = readFileSync('src/app/(app)/tasks/[id]/controls.tsx', 'utf8');
  const action = readFileSync('src/app/actions/tasks.ts', 'utf8');
  return (/allowedTransitions/.test(controls) && /validateTransition/.test(action) &&
    /from '@\/lib\/task-status'/.test(controls)) || 'the rules are duplicated';
});

/* ---------------------------------------------------------------- goal 5 */
heading('GOAL 5 — assignment');
await check('5.1 many assignees per task, and many tasks per person', async () => {
  const [{ a }] = await sql`select coalesce(max(c),0)::int a from (select count(*) c from task_assignees group by task_id) s`;
  const [{ b }] = await sql`select coalesce(max(c),0)::int b from (select count(*) c from task_assignees group by user_id) s`;
  return (a >= 2 && b >= 2) || `max per task ${a}, max per person ${b}`;
});
await check('5.2 a non-member cannot be assigned', async () => {
  const [t] = await sql`
    select t.id, t.project_id from tasks t join projects p on p.id=t.project_id where p.key='ACME' limit 1`;
  try {
    await sql`insert into task_assignees (task_id, user_id, project_id)
              values (${t.id}, ${outsider.id}, ${t.project_id})`;
    await sql`delete from task_assignees where task_id=${t.id} and user_id=${outsider.id}`;
    return 'non-member assignment accepted';
  } catch {
    return true;
  }
});
await check('5.3 removing someone unassigns them from that project only', async () => {
  const [t] = await sql`
    select t.id, t.project_id from tasks t join projects p on p.id=t.project_id where p.key='NOVA' limit 1`;
  await sql`insert into project_members (project_id, user_id) values (${t.project_id}, ${member.id})
            on conflict do nothing`;
  await sql`insert into task_assignees (task_id, user_id, project_id)
            values (${t.id}, ${member.id}, ${t.project_id}) on conflict do nothing`;
  const before = (await sql`select count(*)::int n from task_assignees where user_id=${member.id}`)[0].n;
  await sql`delete from project_members where project_id=${t.project_id} and user_id=${member.id}`;
  const after = (await sql`select count(*)::int n from task_assignees where user_id=${member.id}`)[0].n;
  const elsewhere = (await sql`
    select count(*)::int n from task_assignees ta join projects p on p.id=ta.project_id
    where ta.user_id=${member.id} and p.key='ACME'`)[0].n;
  return (after === before - 1 && elsewhere > 0) ||
    `before ${before}, after ${after}, kept on ACME ${elsewhere}`;
});
await check('5.4 My tasks spans more than one project', async () => {
  const html = await body('/my-tasks', member.cookie);
  const keys = new Set([...html.matchAll(/([A-Z]{4,6})-\d+/g)].map((m) => m[1]));
  return keys.size >= 2 || `only ${[...keys].join(', ') || 'none'}`;
});

/* ---------------------------------------------------------------- goal 6 */
heading('GOAL 6 — finding things, on the server');
const allTasks = await body('/tasks', manager.cookie);
/**
 * Counts rows the way the application does.
 *
 * Note `TODAY` rather than SQL's `current_date`: the app decides "overdue" against the business
 * timezone, and current_date is the database's. When those differ — which they do for part of every
 * day — the two disagree by a task, and it is the test that is wrong, not the page.
 */
const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.BUSINESS_TIMEZONE ?? 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const visibleCount = async (where) => {
  const [{ n }] = await sql`
    select count(*)::int n from tasks t join projects p on p.id=t.project_id
    where t.deleted_at is null and p.archived_at is null and ${sql.unsafe(where)}`;
  return n;
};
await check('6.1 search covers titles and descriptions', async () => {
  const shown = totalMatches(await body('/tasks?q=legacy', manager.cookie));
  const expected = await visibleCount("(t.title ilike '%legacy%' or t.description ilike '%legacy%')");
  return (shown === expected && expected > 0) || `page said ${shown}, database says ${expected}`;
});
await check('6.2 filter by project', async () => {
  const shown = totalMatches(await body(`/tasks?project=${acme.id}`, manager.cookie));
  const expected = await visibleCount(`t.project_id = '${acme.id}'`);
  return shown === expected || `${shown} vs ${expected}`;
});
await check('6.3 filter by status', async () => {
  const shown = totalMatches(await body('/tasks?status=blocked', manager.cookie));
  const expected = await visibleCount("t.status = 'blocked'");
  return shown === expected || `${shown} vs ${expected}`;
});
await check('6.4 filter by assignee', async () => {
  const shown = totalMatches(await body(`/tasks?assignee=${member.id}`, manager.cookie));
  const expected = await visibleCount(
    `exists (select 1 from task_assignees ta where ta.task_id = t.id and ta.user_id = '${member.id}')`);
  return shown === expected || `${shown} vs ${expected}`;
});
await check('6.5 filter by priority', async () => {
  const shown = totalMatches(await body('/tasks?priority=urgent', manager.cookie));
  const expected = await visibleCount("t.priority = 'urgent'");
  return shown === expected || `${shown} vs ${expected}`;
});
await check('6.6 filter by overdue', async () => {
  const shown = totalMatches(await body('/tasks?overdue=1', manager.cookie));
  const expected = await visibleCount(`t.status <> 'done' and t.due_date < '${TODAY}'`);
  return shown === expected || `${shown} vs ${expected}`;
});
await check('6.7 all three sorts render', async () => {
  for (const s of ['due_date', 'priority', 'updated_at']) {
    if ((await get(`/tasks?sort=${s}&dir=asc`, manager.cookie)).status !== 200) return `sort ${s} failed`;
  }
  return true;
});
await check('6.7 reversing a sort reverses the list', async () => {
  // Read the first row of the list itself, not the first reference in the document — the command
  // palette index sits above the list and is identical whatever the sort is.
  const firstRow = (html) => {
    // The table body starts after the header row; the palette index sits above it in the document.
    const body = html.split('aria-label="Select all tasks on this page"')[1] ?? '';
    return body.match(/([A-Z]{4,6}-\d+)/)?.[1];
  };
  const asc = firstRow(await body('/tasks?sort=due_date&dir=asc', manager.cookie));
  const desc = firstRow(await body('/tasks?sort=due_date&dir=desc', manager.cookie));
  return (asc && desc && asc !== desc) || `ascending starts at ${asc}, descending at ${desc}`;
});
await check('6.7 the sort is applied by the server, not the browser', async () => {
  // The export runs the same order-by builder as the list and contains no palette markup, so it is
  // the cleanest place to prove the ordering is genuinely coming from SQL.
  const rows = async (dir) =>
    (await (await get(`/api/tasks/export?sort=due_date&dir=${dir}`, manager.cookie)).text())
      .trim().split('\r\n').slice(1)
      .map((r) => r.split(',')[6]).filter(Boolean);
  const asc = await rows('asc');
  const desc = await rows('desc');
  const ascending = asc.every((d, i) => i === 0 || asc[i - 1] <= d);
  const descending = desc.every((d, i) => i === 0 || desc[i - 1] >= d);
  return (ascending && descending) || `ascending=${ascending} descending=${descending}`;
});
await check('6.8 pagination states the total number of matches', async () =>
  /matching task/.test(allTasks) || 'no total shown');
await check('6.9 one page of rows is sent, not the whole table', async () => {
  // Count rows in the list itself. The command palette also ships an index of task references with
  // the shell, so matching references across the whole document would measure the wrong thing —
  // Goal 6 is about the list being paged by the server, which is what this asserts.
  // Count the per-row checkboxes. The header's select-all carries a different label, so it is not
  // included in this count.
  const rows = (allTasks.match(/aria-label="Select [^a]/g) ?? []).length;
  const [{ n }] = await sql`select count(*)::int n from tasks where deleted_at is null`;
  return (rows > 0 && rows <= 25 && n > 25) || `list rendered ${rows} rows of ${n} tasks`;
});
await check('6.x a member sees strictly fewer tasks than a manager', async () =>
  totalMatches(await body('/tasks', member.cookie)) < totalMatches(allTasks) || 'same count');

/* ---------------------------------------------------------------- goal 7 */
heading('GOAL 7 — bulk actions and export');
await check('7.1 tasks can be selected from the list', async () => {
  const html = await body('/tasks', manager.cookie);
  return (/aria-label="Select all tasks on this page"/.test(html) &&
    (html.match(/aria-label="Select [^a]/g) ?? []).length > 0) || 'no selection controls';
});
await check('7.2 the toolbar applies a status move, an assignee change or a due date', async () => {
  // The toolbar only renders once a selection exists, so this reads the component rather than the
  // empty-selection page.
  const src = readFileSync('src/app/(app)/tasks/(index)/bulk-list.tsx', 'utf8');
  return ['bulkChangeStatus', 'bulkAssign', 'bulkSetDueDate'].every((fn) => src.includes(fn)) ||
    'a bulk action is missing';
});
await check('7.3/7.4 each task gets its own transaction, not one batch', async () => {
  const src = readFileSync('src/app/actions/bulk.ts', 'utf8');
  return (/for \(const taskId of taskIds\)/.test(src) &&
    /await db\.transaction/.test(src) &&
    /outcomes\.push/.test(src)) || 'not per task';
});
await check('7.5 per-task outcomes and reasons are rendered', async () => {
  const src = readFileSync('src/app/(app)/tasks/(index)/bulk-list.tsx', 'utf8');
  // Every outcome is listed, not only the failures — Goal 7.3 asks for what succeeded as well as
  // what was rejected.
  return (/result\.outcomes\.map/.test(src) && /o\.reason/.test(src) && /o\.ok \?/.test(src)) ||
    'per-task outcomes not rendered';
});
await check('7.6 CSV downloads as a file', async () => {
  const r = await get('/api/tasks/export?overdue=1', manager.cookie);
  return (r.status === 200 && (r.headers.get('content-disposition') ?? '').includes('attachment')) ||
    `status ${r.status}`;
});
await check('7.6 CSV contains exactly the filtered rows', async () => {
  const rows = (await (await get('/api/tasks/export?overdue=1', manager.cookie)).text())
    .trim().split('\r\n').slice(1);
  const expected = await visibleCount(`t.status <> 'done' and t.due_date < '${TODAY}'`);
  return (rows.length === expected && rows.every((r) => r.includes(',yes,'))) ||
    `${rows.length} rows, expected ${expected}`;
});
await check('7.6 export refuses an unauthenticated caller', async () =>
  (await get('/api/tasks/export')).status === 401 || 'not 401');
await check('7.6 a member export is narrower than a manager export', async () => {
  const m = (await (await get('/api/tasks/export', manager.cookie)).text()).split('\r\n').length;
  const s = (await (await get('/api/tasks/export', member.cookie)).text()).split('\r\n').length;
  return s < m || `member ${s} rows, manager ${m}`;
});

/* ---------------------------------------------------------------- goal 8 */
heading('GOAL 8 — dashboard');
const dashboard = await body('/dashboard', manager.cookie);
for (const [label, needle] of [
  ['8.1 open tasks', 'Open tasks'],
  ['8.2 overdue tasks', 'Overdue'],
  ['8.3 due this week', 'Due this week'],
  ['8.4 completed this week', 'Completed this week'],
  ['8.5 breakdown by status', 'By status'],
  ['8.6 breakdown by assignee', 'Who is carrying what'],
]) {
  await check(label, async () => dashboard.includes(needle) || 'missing');
}
await check('8.7 an eight-week completions chart with data behind it', async () => {
  const [{ n }] = await sql`
    select count(*)::int n from tasks where completed_at > now() - interval '8 weeks' and deleted_at is null`;
  return (dashboard.includes('last eight weeks') && n > 0) || `completions in window: ${n}`;
});
await check('8.8 the numbers are SQL aggregates, not counted in JavaScript', async () => {
  const src = readFileSync('src/lib/queries/dashboard.ts', 'utf8');
  return (/count\(\*\) filter \(where/.test(src) && /groupBy/.test(src)) || 'not aggregated in SQL';
});

/* ---------------------------------------------------------------- goal 9 */
heading('GOAL 9 — history that cannot be rewritten');
const taskPage = await body(`/tasks/${anyAcmeTask.id}`, manager.cookie);
await check('9.1/9.2 a timeline exists and records creation', async () =>
  (taskPage.includes('Timeline') && /created this task/.test(taskPage)) || 'missing');
await check('9.3 field changes carry the old and the new value', async () =>
  /changed status from .* to /.test(taskPage) || 'no old-to-new entry rendered');
await check('9.4 assignments and unassignments are recorded', async () => {
  const [{ n }] = await sql`select count(*)::int n from activity where type in ('assigned','unassigned')`;
  return n > 0 || 'none recorded';
});
await check('9.5 comments live in the same stream as everything else', async () => {
  const [{ n }] = await sql`select count(*)::int n from activity where type = 'commented'`;
  return n > 0 || 'no comments recorded';
});
await check('9.6 no application code updates or deletes an activity row', async () => {
  // src/db/seed.ts is excluded on purpose: it truncates every table to reload the demo data. That is
  // a database reset, not a path any user or manager can reach through the application.
  const offenders = sourceFiles()
    .filter((f) => !f.endsWith('seed.ts'))
    .filter((f) => /\.update\(\s*activity\s*\)|\.delete\(\s*activity\s*\)/.test(readFileSync(f, 'utf8')));
  return offenders.length === 0 || `found in ${offenders.join(', ')}`;
});
await check('9.6 the activity table has no updated_at column', async () => {
  const cols = await sql`select column_name from information_schema.columns where table_name = 'activity'`;
  return !cols.some((c) => c.column_name === 'updated_at') || 'it has one';
});
await check('9.6 deleting a task does not destroy its history', async () => {
  const before = (await sql`select count(*)::int n from activity where task_id=${anyAcmeTask.id}`)[0].n;
  await sql`update tasks set deleted_at = now() where id = ${anyAcmeTask.id}`;
  const after = (await sql`select count(*)::int n from activity where task_id=${anyAcmeTask.id}`)[0].n;
  const hidden = (await get(`/tasks/${anyAcmeTask.id}`, manager.cookie)).status === 404;
  await sql`update tasks set deleted_at = null where id = ${anyAcmeTask.id}`;
  return (before === after && before > 0 && hidden) ||
    `before ${before}, after ${after}, hidden ${hidden}`;
});

/* --------------------------------------------------------------- goal 10 */
heading('GOAL 10 — overdue alerts');
await check('10.1 the alerts page lists overdue, unfinished tasks', async () => {
  const html = await body('/alerts', manager.cookie);
  const expected = await visibleCount(`t.status <> 'done' and t.due_date < '${TODAY}'`);
  return html.includes(`${expected} open alert`) || `page did not report ${expected}`;
});
await check('10.2 a count badge appears in the navigation', async () =>
  /aria-label="\d+ overdue"/.test(dashboard) || 'no badge');
await check('10.3 Dismiss is offered only for the viewer’s own tasks', async () => {
  const html = await body('/alerts', member.cookie);
  return (html.includes('Dismiss') && html.includes('Not yours to dismiss')) ||
    'both states were not present on the page';
});
await check('10.4 a dismissal dies when the due date changes, and only then', async () => {
  const [t] = await sql`
    select t.id, t.due_date::text as due_date from tasks t
    join task_assignees ta on ta.task_id = t.id
    join projects p on p.id = t.project_id
    where ta.user_id = ${member.id} and t.status <> 'done'
      and t.due_date < ${TODAY} and t.deleted_at is null and p.archived_at is null
    limit 1`;
  if (!t) return 'no overdue task assigned to the member';
  const count = async () =>
    Number((await body('/alerts', member.cookie)).match(/(\d+) open alert/)?.[1] ?? -1);

  const start = await count();
  await sql`insert into alert_dismissals (user_id, task_id, dismissed_due_date)
            values (${member.id}, ${t.id}, ${t.due_date})
            on conflict (user_id, task_id) do update set dismissed_due_date = excluded.dismissed_due_date`;
  const afterDismiss = await count();
  // Derived from the task's own due date, so it is guaranteed to differ. Picking a fixed offset
  // like "three days ago" can land on the value the task already has, in which case nothing changes
  // and the dismissal correctly survives — a passing product looking like a failure.
  const dueISO = t.due_date; // already YYYY-MM-DD, thanks to the ::text cast above
  const moved = new Date(new Date(`${dueISO}T00:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  await sql`update tasks set due_date = ${moved} where id = ${t.id}`;
  const afterMove = await count();
  await sql`update tasks set due_date = ${dueISO} where id = ${t.id}`;
  const afterMoveBack = await count();
  await sql`delete from alert_dismissals where user_id = ${member.id} and task_id = ${t.id}`;

  console.log(`          ${start} open → dismiss → ${afterDismiss} → move due date → ${afterMove}` +
              ` → move it back → ${afterMoveBack}`);
  return (afterDismiss === start - 1 && afterMove === start && afterMoveBack === start - 1) ||
    `expected ${start} / ${start - 1} / ${start} / ${start - 1}`;
});

console.log(`\n${'='.repeat(64)}`);
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) console.log(`  failing: ${failures.join(' | ')}`);
console.log('='.repeat(64));
process.exit(fail ? 1 : 0);
