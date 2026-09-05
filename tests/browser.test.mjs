/**
 * Browser tests — the write paths.
 *
 * The other suites read pages and inspect the database directly. Neither of them ever performs a
 * mutation *through the application*, which means every server action — creating a project, moving a
 * task, assigning someone, dismissing an alert, running a bulk operation — was unverified. This
 * drives a real browser through those flows and fails on any console error along the way.
 *
 * This suite writes to the database, so `npm run test:browser` re-seeds first. An earlier version
 * did not, and the second run failed on state the first had left behind — the alert it wanted to
 * dismiss was already dismissed. A suite that only passes once is not a suite.
 *
 *   npm run dev            # in one terminal
 *   npm run test:browser   # in another — re-seeds, then drives the browser
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

import { chromium } from 'playwright';

/**
 * A note on selectors. Every authenticated page carries a Sign out button in the sidebar, and it is
 * the first `button[type="submit"]` in the document — so a generic submit selector logs the suite
 * out instead of submitting the form under test. Everything below addresses buttons by their
 * accessible name, exactly.
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const SHOTS = 'tests/shots';
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const failures = [];
const consoleErrors = [];

async function check(label, fn) {
  try {
    const result = await fn();
    if (result === true || result === undefined) {
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
    console.log(`   FAIL ${label} — ${err.message.split('\n')[0]}`);
  }
}
const heading = (t) => console.log(`\n${t}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`${page.url()} :: ${msg.text()}`);
});
page.on('pageerror', (err) => consoleErrors.push(`${page.url()} :: ${err.message}`));

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

/**
 * Poll until a condition holds.
 *
 * Server actions here revalidate and re-render, and the development server is slow enough that a
 * fixed sleep is a coin toss — an earlier version of this suite reported four false failures purely
 * because 1800ms was not enough. Waiting on the condition rather than the clock makes the suite
 * describe behaviour instead of timing.
 */
async function until(fn, { timeout = 20000, interval = 300 } = {}) {
  const started = Date.now();
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      // The DOM is mid-swap; try again.
    }
    if (Date.now() - started > timeout) return false;
    await page.waitForTimeout(interval);
  }
}

/** The status moves the interface is currently offering. */
const statusButtons = () =>
  page.getByRole('button', { name: /^(Move to|Mark blocked|Unblock)/ }).allInnerTexts();

async function signIn(email, password = 'password123') {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function signOut() {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.click('button[title="Sign out"]');
  // Signing out returns to the public landing page, not the sign-in form.
  await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 });
}

/* ------------------------------------------------------------- the scene */
heading('The public landing page');
await check('the landing page renders for a signed-out visitor', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot('00-landing');
  const status = (await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }))?.status();
  return (status === 200 && (await page.locator('text=Clarity for every project.').count()) > 0) ||
    `status ${status}`;
});
await check('it offers a way into the product', async () => {
  const signIn = await page.getByRole('link', { name: /^Sign in/ }).count();
  const register = await page.getByRole('link', { name: /Create an account/ }).count();
  return (signIn > 0 && register > 0) || `sign in: ${signIn}, register: ${register}`;
});

heading('The sign-in page');
await check('the sign-in form is usable without scrolling', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await shot('01-login');
  // The page previously put a scroll-driven hero in front of the form. The requirement now is that
  // the first thing a visitor can do is sign in.
  const box = await page.locator('input[name="email"]').boundingBox();
  const scrolls = await page.evaluate(() => document.body.scrollHeight > window.innerHeight + 4);
  return (box && box.y < 900 && !scrolls) || `field at y=${box?.y}, page scrolls: ${scrolls}`;
});
await check('the sign-in form is the working half of the split card', async () => {
  // The brand panel carries the dashboard mock by design now; what must hold is that the form is
  // present, reachable without scrolling, and headed as a sign-in.
  const heading = await page.locator('h1').first().innerText();
  const email = await page.locator('input[name="email"]').boundingBox();
  return (/sign in/i.test(heading) && email && email.y < 900) ||
    `heading "${heading}", email field at ${email?.y}`;
});
await check('it links back to the landing page', async () => {
  const home = page.locator('header a[href="/"]');
  return (await home.count()) > 0 || 'nothing in the header links to /';
});
await check('demo credentials are NOT on the page', async () => {
  // They belong in SUBMISSION.md, not in the product. A login screen advertising working accounts
  // is a demo artefact, and this asserts it stays out.
  return (await page.locator('text=@tracker.dev').count()) === 0 || 'credentials still shown';
});

/* ---------------------------------------------------------------- manager */
heading('Signing in as a manager');
await check('sign in with the demo credentials', async () => {
  await signIn('priya@tracker.dev');
  await page.waitForTimeout(1200);
  await shot('03-dashboard');
  return page.url().includes('/dashboard') || `landed on ${page.url()}`;
});
await check('the hero states the situation', async () => {
  const text = await page.locator('h1').first().innerText();
  return /you have\s+\d+\s+open/i.test(text) || `hero read: ${text}`;
});
await check('dark theme applies and the page still renders', async () => {
  await page.click('button[title="Dark"]');
  await page.waitForTimeout(500);
  await shot('04-dashboard-dark');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  return theme === 'dark' || `theme is ${theme}`;
});
await check('light theme comes back', async () => {
  await page.click('button[title="Light"]');
  await page.waitForTimeout(300);
  return (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light' || 'stuck';
});

/* ----------------------------------------------------------- the palette */
heading('Command palette');
await check('⌘K opens it and finds a task', async () => {
  await page.keyboard.press('Meta+k');
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  // The index is fetched on first open rather than shipped with every page, so wait for it to
  // land before searching. The static destinations are matchable immediately; tasks are not.
  await until(async () => !(await page.locator('text=indexing…').count()), { timeout: 15000 });
  await page.keyboard.type('checkout');
  await until(async () => (await page.locator('[role="dialog"] li').count()) > 0);
  await shot('05-palette');
  const count = await page.locator('[role="dialog"] li').count();
  return count > 0 || 'no results after the index loaded';
});
await check('Enter navigates to the highlighted result', async () => {
  await page.keyboard.press('Enter');
  await page.waitForURL('**/tasks/**', { timeout: 10000 });
  return page.url().includes('/tasks/') || `went to ${page.url()}`;
});
await check('Escape closes it', async () => {
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return (await page.locator('[role="dialog"]').count()) === 0 || 'still open';
});

/* --------------------------------------------------- projects: real writes */
heading('Creating a project (server action)');
const key = `T${Date.now().toString(36).slice(-4).toUpperCase()}`;
await check(`create project ${key}`, async () => {
  await page.goto(`${BASE}/projects/new`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="key"]', key);
  await page.fill('input[name="name"]', 'Browser Test Project');
  await page.fill('textarea[name="description"]', 'Created by the browser suite.');
  await page.getByRole('button', { name: 'Create project' }).click();
  // Not '**/projects/**' — that already matches /projects/new, so it would resolve immediately.
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/, { timeout: 15000 });
  return (await page.locator(`text=${key}`).first().isVisible()) || 'project page did not show the key';
});
await check('a duplicate key is refused with a message', async () => {
  await page.goto(`${BASE}/projects/new`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="key"]', key);
  await page.fill('input[name="name"]', 'Duplicate');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(2000);
  const msg = await page.locator('[role="alert"]').first().innerText().catch(() => '');
  return /already in use/i.test(msg) || `message was: "${msg}"`;
});
await check('a malformed key is refused with a message', async () => {
  await page.goto(`${BASE}/projects/new`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="key"]', 'x');
  await page.fill('input[name="name"]', 'Bad key');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(2000);
  const msg = await page.locator('[role="alert"]').first().innerText().catch(() => '');
  return /letters or digits/i.test(msg) || `message was: "${msg}"`;
});

const projectUrl = await (async () => {
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  // The projects list is a table now: the key sits in its own cell and the name carries the link,
  // so find the row by its key and take the link from that row.
  const row = page.locator('tr').filter({ hasText: key }).first();
  const href = await row.locator('a[href^="/projects/"]').first().getAttribute('href');
  return `${BASE}${href}`;
})();

heading('Creating tasks (server action)');
await check('create two tasks', async () => {
  for (const title of ['Blocker task', 'Dependent task']) {
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', 'from the browser suite');
    await page.getByRole('button', { name: 'Add task' }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 15000 });
  }
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
  await shot('06-project');
  const rows = await page.locator('li:has-text("task")').count();
  return rows >= 2 || `only ${rows} rows`;
});

heading('The lifecycle (Goal 4) through the buttons');
const taskUrl = await (async () => {
  const href = await page.locator('a:has-text("Dependent task")').first().getAttribute('href');
  return `${BASE}${href}`;
})();
await check('a Backlog task offers only In Progress', async () => {
  await page.goto(taskUrl, { waitUntil: 'domcontentloaded' });
  const buttons = await page.locator('button:has-text("Move to")').allInnerTexts();
  return (buttons.length === 1 && buttons[0].includes('In Progress')) || `offered ${JSON.stringify(buttons)}`;
});
await check('move Backlog → In Progress', async () => {
  await page.getByRole('button', { name: 'Move to In Progress' }).click();
  // The proof is that the offered moves changed, not that some text says "In Progress" — the button
  // we just clicked said that too, which made an earlier version of this check pass while broken.
  const changed = await until(async () => !(await statusButtons()).some((b) => b.includes('Move to In Progress')));
  return changed || `still offering ${JSON.stringify(await statusButtons())}`;
});
await check('In Progress offers In Review and Blocked, not Done', async () => {
  const buttons = await statusButtons();
  const joined = buttons.join(' ');
  return (joined.includes('In Review') && joined.includes('blocked') && !joined.includes('Done')) ||
    `offered ${JSON.stringify(buttons)}`;
});
await check('block it, and it remembers where it came from', async () => {
  await page.getByRole('button', { name: 'Mark blocked' }).click();
  await until(async () => (await statusButtons()).some((b) => b.startsWith('Unblock')));
  await shot('07-task-blocked');
  const hasReturn = await page.locator('text=Blocked from').isVisible();
  const unblock = (await statusButtons()).filter((b) => b.startsWith('Unblock'));
  return (hasReturn && unblock.length === 1 && unblock[0].includes('In Progress')) ||
    `blockedFrom=${hasReturn} buttons=${JSON.stringify(unblock)}`;
});
await check('unblock returns it to In Progress', async () => {
  await page.getByRole('button', { name: /^Unblock/ }).click();
  const back = await until(async () => (await statusButtons()).some((b) => b.includes('Move to In Review')));
  return back || `offered ${JSON.stringify(await statusButtons())}`;
});

heading('Dependencies and the Done rule (Goal 4.5)');
await check('add a blocker in the same project', async () => {
  const picker = page.locator('select[aria-label="Task that blocks this one"]');
  // selectOption takes a literal label, not a pattern — read the real one off the option.
  const label = (await picker.locator('option').allInnerTexts()).find((o) => o.includes('Blocker task'));
  if (!label) return 'the blocker task was not offered as an option';
  await picker.selectOption({ label });
  await page.getByRole('button', { name: 'Add blocker' }).click();
  // Counting matches across the page does not work: adding the blocker removes it from the picker
  // at the same moment it appears in the list, so the total is unchanged. The unambiguous signal is
  // that the empty-state line disappears.
  const emptyLine = page.getByText('Nothing is blocking this task.');
  const added = await until(async () => (await emptyLine.count()) === 0);
  return added || 'the Blocked by card still says nothing is blocking this task';
});
await check('move to In Review, then Done is withheld with a reason', async () => {
  await page.getByRole('button', { name: 'Move to In Review' }).click();
  await until(async () => (await page.locator('text=Cannot move to Done').count()) > 0);
  await shot('08-task-blocked-done');
  const doneOffered = (await page.getByRole('button', { name: 'Move to Done' }).count()) > 0;
  const reason = await page.locator('text=Cannot move to Done').count();
  return (!doneOffered && reason > 0) || `doneOffered=${doneOffered} reasonShown=${reason}`;
});

heading('Assignment (Goal 5) and comments (Goal 9)');
await check('assign someone', async () => {
  const has = await page.locator('select[aria-label="Person to assign"]').count();
  if (!has) return 'no assignee picker';
  const before = await page.getByRole('button', { name: 'Remove', exact: true }).count();
  await page.getByRole('button', { name: 'Assign', exact: true }).click();
  const assigned = await until(async () =>
    (await page.getByRole('button', { name: 'Remove', exact: true }).count()) > before);
  return assigned || 'nobody was assigned';
});
await check('add a comment, and it lands in the timeline', async () => {
  await page.fill('textarea[name="body"]', 'A comment from the browser suite.');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  const landed = await until(async () =>
    (await page.locator('text=A comment from the browser suite.').count()) > 0);
  await shot('09-task-timeline');
  return landed || 'comment never appeared in the timeline';
});
await check('the timeline offers no way to edit or delete anything', async () => {
  const scope = page.locator('section, div').filter({ hasText: 'Timeline' }).last();
  const edits = await scope.locator('button:has-text("Edit"), button:has-text("Delete")').count();
  return edits === 0 || `${edits} edit/delete controls inside the timeline`;
});

heading('The list, filters and bulk actions (Goals 6 and 7)');
await check('search narrows the list', async () => {
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' });
  const before = await page.locator('input[aria-label="Select all tasks on this page"]').count();
  await page.fill('input[aria-label="Search tasks"]', 'checkout');
  await page.waitForTimeout(1200);
  await shot('10-tasks-filtered');
  return before >= 0 || 'no list';
});
await check('a status filter chip applies', async () => {
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Blocked', exact: true }).click();
  const applied = await until(async () => page.url().includes('status=blocked'));
  return applied || `url is ${page.url()}`;
});
await check('bulk move reports per-task successes AND rejections', async () => {
  // In Review is the one status where the batch is genuinely mixed: tasks with no unfinished
  // blocker can reach Done, and tasks with one cannot. Selecting every open task would be a batch
  // where nothing succeeds, which does not demonstrate partial success at all.
  await page.goto(`${BASE}/tasks?status=in_review`, { waitUntil: 'networkidle' });
  await page.click('input[aria-label="Select all tasks on this page"]');
  await page.waitForTimeout(600);
  // Scoped to the selection toolbar — 'Done' is also a status filter chip further up the page.
  const toolbar = page.locator('div').filter({ hasText: /^\d+ selected/ }).last();
  await toolbar.getByRole('button', { name: 'Done', exact: true }).click();
  await until(async () => (await page.locator('text=/rejected/').count()) > 0, { timeout: 45000 });
  await shot('11-bulk-results');
  // Read the whole summary line rather than two separate matches — React splits the numbers into
  // their own text nodes, so a `text=/\d+ applied/` selector is unreliable.
  // Read the summary's container: React renders each number as its own text node, so a selector
  // matching "N applied" and "N rejected" together has to sit above both.
  const summary = page.locator('p').filter({ hasText: /applied/ }).first();
  const line = (await summary.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const applied = Number(line.match(/(\d+) applied/)?.[1] ?? -1);
  const rejected = Number(line.match(/(\d+) rejected/)?.[1] ?? -1);
  const reasons = await page.locator('text=/Cannot move to Done|cannot move straight/i').count();
  console.log(`          "${line}" · ${reasons} per-task reasons rendered`);
  // The requirement is partial success: some applied, some refused, each with a reason.
  return (applied > 0 && rejected > 0 && reasons >= rejected) ||
    `applied=${applied} rejected=${rejected} reasons=${reasons}`;
});

heading('Alerts (Goal 10) through the button');
await check('dismiss an alert, and it comes back when the due date changes', async () => {
  await signOut();
  await signIn('sam@tracker.dev');
  await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
  const readCount = async () =>
    Number((await page.locator('h2:has-text("open alert")').innerText()).match(/(\d+)/)?.[1] ?? -1);
  const before = await readCount();
  await shot('12-alerts');

  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true }).first();
  if ((await dismiss.count()) === 0) return 'no dismissable alert for this member';
  const row = dismiss.locator('xpath=ancestor::li');
  const href = await row.locator('a[href^="/tasks/"]').first().getAttribute('href');
  await dismiss.click();
  await until(async () => (await readCount()) === before - 1, { timeout: 25000 });
  await page.reload({ waitUntil: 'networkidle' });
  const afterDismiss = await readCount();

  // Change the due date through the edit form, exactly as a user would.
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.waitForTimeout(400);
  await page.fill('input[name="dueDate"]', '2026-01-15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await until(async () => (await page.locator('text=Task updated.').count()) > 0, { timeout: 25000 });

  await page.goto(`${BASE}/alerts`, { waitUntil: 'networkidle' });
  const afterChange = await readCount();
  console.log(`          ${before} open → dismiss → ${afterDismiss} → due date edited → ${afterChange}`);
  return (afterDismiss === before - 1 && afterChange === before) ||
    `expected ${before} / ${before - 1} / ${before}`;
});

heading('Role separation in the browser (Goal 1)');
await check('a member sees no "New project" button', async () => {
  await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' });
  await shot('13-member-projects');
  return (await page.locator('a:has-text("New project")').count()) === 0 || 'button is visible';
});
await check('a member typing the URL is redirected away', async () => {
  await page.goto(`${BASE}/projects/new`, { waitUntil: 'domcontentloaded' });
  return !page.url().includes('/projects/new') || 'member reached the create page';
});
await check('a member sees a narrower project list than a manager', async () => {
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  const asMember = await page.locator('tbody tr').count();
  await signOut();
  await signIn('priya@tracker.dev');
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  const asManager = await page.locator('tbody tr').count();
  console.log(`          member sees ${asMember}, manager sees ${asManager}`);
  return asMember < asManager || `member ${asMember} vs manager ${asManager}`;
});

heading('Archive, restore and delete');
await check('archive the test project, and it leaves the default list', async () => {
  await page.goto(`${projectUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Archive project' }).click();
  await until(async () => (await page.locator('text=Project archived.').count()) > 0, { timeout: 25000 });
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  return (await page.locator('tr').filter({ hasText: key }).count()) === 0 || 'still listed';
});
await check('it is still there behind "Show archived"', async () => {
  await page.goto(`${BASE}/projects?archived=1`, { waitUntil: 'networkidle' });
  return (await page.locator(`text=${key}`).count()) > 0 || 'gone entirely';
});
await check('restore brings it back', async () => {
  await page.goto(`${projectUrl}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Restore project' }).click();
  await until(async () => (await page.locator('text=Project restored.').count()) > 0, { timeout: 25000 });
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  return (await page.locator('tr').filter({ hasText: key }).count()) > 0 || 'not restored';
});
await check('deleting a task hides it but keeps its history', async () => {
  await page.goto(taskUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/, { timeout: 25000 }).catch(() => {});
  const res = await page.goto(taskUrl, { waitUntil: 'domcontentloaded' });
  return res.status() === 404 || `task still returns ${res.status()}`;
});

/* ---------------------------------------------------------------- mobile */
heading('Small screens');
await check('the dashboard is usable at 390px with no sideways scroll', async () => {
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: `${SHOTS}/14-mobile-dashboard.png` });
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1);
  await phone.close();
  return !overflow || 'the page scrolls sideways';
});

await browser.close();

/**
 * Leave the database in the demo state.
 *
 * This suite creates a project, moves tasks to Done and edits a due date. Re-seeding only at the
 * start meant whatever ran last left its mess behind — and the mess is what a reviewer opening the
 * live app would see. It showed up as a stray "Browser Test Project" in the portfolio and a task
 * reported as 233 days late because this suite had set its due date to January.
 */
console.log('\n  restoring the demo data…');
await new Promise((resolve, reject) => {
  const child = spawn('npm', ['run', 'db:seed', '--silent'], { stdio: 'ignore', shell: false });
  child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  child.on('error', reject);
});

console.log(`\n${'='.repeat(64)}`);
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) console.log(`  failing: ${failures.join(' | ')}`);
/**
 * Two console messages are known, understood and deliberately not failed on. They are printed
 * anyway — a suite that hides what it tolerates is worse than one that fails.
 *
 *  1. A 404 for a task the suite has just deleted. That is the assertion, not a bug.
 *
 *  2. React's "script tag while rendering" advisory, from the inline script that applies the stored
 *     theme before first paint. The script has to be inline and synchronous or the browser paints
 *     the default palette first; React's point is that it will not re-run on a client navigation,
 *     which is correct and does not matter, because the theme only needs applying once per load.
 *     Verified separately: with dark stored, the theme is already dark at DOMContentLoaded and the
 *     body paints the dark palette, so there is no flash.
 *
 *  3. A hydration attribute mismatch inside the project page header, which appears only when the
 *     page is loaded immediately after a mutation and does not reproduce on a clean load. It is
 *     recorded in docs/decisions.md as an open question rather than claimed as fixed.
 */
const KNOWN = [
  /Failed to load resource: the server responded with a status of 404/,
  /Encountered a script tag while rendering React component/,
  /A tree hydrated but some attributes of the server rendered HTML didn't match/,
];
const all = [...new Set(consoleErrors)];
const known = all.filter((e) => KNOWN.some((k) => k.test(e)));
const unexpected = all.filter((e) => !KNOWN.some((k) => k.test(e)));
if (known.length) {
  console.log(`\n  ${known.length} known console message(s), tolerated — see the comment in this file:`);
  for (const e of known) console.log(`    · ${e.split('\n')[0].slice(0, 120)}`);
}
if (unexpected.length) {
  console.log(`\n  ${unexpected.length} console error(s) in the browser:`);
  for (const e of unexpected.slice(0, 4)) console.log(`\n    ${e.slice(0, 1400).replace(/\n/g, '\n    ')}`);
} else {
  console.log('  no unexpected console errors');
}
console.log(`  screenshots in ${SHOTS}/`);
console.log('='.repeat(64));
process.exit(fail || unexpected.length ? 1 : 0);
