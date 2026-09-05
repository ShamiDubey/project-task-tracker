/**
 * Demo data.
 *
 * The brief asks for "enough demo data to show the system doing something, not an empty shell", so
 * this deliberately produces a portfolio that exercises every goal: overdue work, blocked tasks,
 * real dependency chains, an uneven assignee load so "who is overloaded" has an answer, an archived
 * project, and completions spread across the last eight weeks so the dashboard chart is not flat.
 *
 * Safe to re-run: it clears the tables first.
 */
import 'dotenv/config';

import { db } from './index';
import {
  activity,
  alertDismissals,
  projectMembers,
  projects,
  taskAssignees,
  taskDependencies,
  tasks,
  timeEntries,
  users,
  type TaskPriority,
  type TaskStatus,
} from './schema';
import { hashPassword } from '../lib/auth/password';
import { addDays, addWeeks, startOfWeek, toISODate } from '../lib/dates';

const PASSWORD = 'password123';

/** Deterministic pseudo-random so re-seeding gives the same demo, which makes the docs reliable. */
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

const today = new Date();

async function main() {
  console.log('Clearing existing data...');
  // Order matters only for readability — every dependent table cascades from these two.
  await db.delete(timeEntries);
  await db.delete(activity);
  await db.delete(alertDismissals);
  await db.delete(taskAssignees);
  await db.delete(taskDependencies);
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(users);

  console.log('Creating people...');
  const hash = await hashPassword(PASSWORD);
  const people = [
    { email: 'priya@tracker.dev', name: 'Priya Raman', role: 'manager' as const },
    { email: 'daniel@tracker.dev', name: 'Daniel Okoro', role: 'manager' as const },
    { email: 'sam@tracker.dev', name: 'Sam Whitfield', role: 'member' as const },
    { email: 'aisha@tracker.dev', name: 'Aisha Bello', role: 'member' as const },
    { email: 'marco@tracker.dev', name: 'Marco Ferrari', role: 'member' as const },
    { email: 'lena@tracker.dev', name: 'Lena Kowalski', role: 'member' as const },
    { email: 'tom@tracker.dev', name: 'Tom Baxter', role: 'member' as const },
    { email: 'yuki@tracker.dev', name: 'Yuki Tanaka', role: 'member' as const },
  ];
  const createdUsers = await db
    .insert(users)
    .values(people.map((p) => ({ ...p, passwordHash: hash })))
    .returning();
  const byEmail = Object.fromEntries(createdUsers.map((u) => [u.email, u]));
  const priya = byEmail['priya@tracker.dev'];
  const daniel = byEmail['daniel@tracker.dev'];

  console.log('Creating projects...');
  const projectSpecs = [
    {
      key: 'ACME',
      name: 'Acme Retail Replatform',
      description:
        'Migrating Acme from their legacy storefront onto a headless stack. Fixed-price, hard launch date before the Christmas trading period.',
      owner: priya,
      members: ['sam@tracker.dev', 'aisha@tracker.dev', 'marco@tracker.dev', 'lena@tracker.dev'],
      archived: false,
    },
    {
      key: 'NOVA',
      name: 'Nova Health Patient App',
      description:
        'React Native app for appointment booking and repeat prescriptions. Ongoing retainer, two-week cycles.',
      owner: priya,
      members: ['aisha@tracker.dev', 'tom@tracker.dev', 'yuki@tracker.dev'],
      archived: false,
    },
    {
      key: 'ORBIT',
      name: 'Orbit Payments Integration',
      description:
        'Replacing the in-house payment handling with Orbit. Short engagement, heavy on compliance sign-off.',
      owner: daniel,
      members: ['marco@tracker.dev', 'sam@tracker.dev'],
      archived: false,
    },
    {
      key: 'HELIO',
      name: 'Helio Brand Refresh',
      description: 'New visual identity, design system and marketing site. Design-led, light on engineering.',
      owner: daniel,
      members: ['lena@tracker.dev', 'yuki@tracker.dev'],
      archived: false,
    },
    {
      key: 'VERTEX',
      name: 'Vertex Data Migration',
      description:
        'One-off migration of fifteen years of records into the new warehouse. Mostly done; keeping a small team on for reconciliation.',
      owner: priya,
      members: ['tom@tracker.dev', 'marco@tracker.dev'],
      archived: false,
    },
    {
      key: 'PIXEL',
      name: 'Pixel Studio Website',
      description:
        'Delivered and signed off in the spring. Archived — kept for reference and for the invoice trail.',
      owner: daniel,
      members: ['lena@tracker.dev'],
      archived: true,
    },
  ];

  const createdProjects = await db
    .insert(projects)
    .values(
      projectSpecs.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        ownerId: p.owner.id,
        archivedAt: p.archived ? addDays(today, -40) : null,
      })),
    )
    .returning();
  const projectByKey = Object.fromEntries(createdProjects.map((p) => [p.key, p]));

  console.log('Adding project members...');
  const memberRows: { projectId: string; userId: string }[] = [];
  for (const spec of projectSpecs) {
    const project = projectByKey[spec.key];
    // The owner is always on their own project.
    memberRows.push({ projectId: project.id, userId: spec.owner.id });
    for (const email of spec.members) {
      memberRows.push({ projectId: project.id, userId: byEmail[email].id });
    }
  }
  await db.insert(projectMembers).values(memberRows);

  console.log('Creating tasks...');
  type TaskSpec = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    /** Days from today; negative is in the past. Null means no due date. */
    dueIn: number | null;
    assignees: string[];
    /** Titles of other tasks in the same project that block this one. */
    blockedBy?: string[];
    /** Weeks ago it was completed — only for done tasks. */
    completedWeeksAgo?: number;
  };

  const taskSpecs: Record<string, TaskSpec[]> = {
    ACME: [
      { title: 'Audit the legacy catalogue schema', description: 'Document every field currently in use, including the ones nobody admits to using.', status: 'done', priority: 'high', dueIn: -46, assignees: ['marco@tracker.dev'], completedWeeksAgo: 7 },
      { title: 'Agree the product data model', description: 'Sign-off needed from Acme merchandising before any import work starts.', status: 'done', priority: 'urgent', dueIn: -38, assignees: ['marco@tracker.dev', 'sam@tracker.dev'], blockedBy: ['Audit the legacy catalogue schema'], completedWeeksAgo: 6 },
      { title: 'Build the catalogue import pipeline', description: 'Batch import with resumable checkpoints. Must cope with the 400k SKU full load.', status: 'done', priority: 'high', dueIn: -24, assignees: ['marco@tracker.dev'], blockedBy: ['Agree the product data model'], completedWeeksAgo: 4 },
      { title: 'Storefront component library', description: 'Cards, grids, filters, cart drawer. Shared with the Helio design system where it makes sense.', status: 'done', priority: 'medium', dueIn: -17, assignees: ['lena@tracker.dev'], completedWeeksAgo: 3 },
      { title: 'Checkout flow — happy path', description: 'Basket through to confirmation, card payments only for now.', status: 'in_review', priority: 'urgent', dueIn: -4, assignees: ['sam@tracker.dev', 'aisha@tracker.dev'] },
      { title: 'Checkout flow — failure states', description: 'Declined cards, expired sessions, stock disappearing mid-checkout.', status: 'in_progress', priority: 'high', dueIn: 3, assignees: ['aisha@tracker.dev'], blockedBy: ['Checkout flow — happy path'] },
      { title: 'Search and faceted filtering', description: 'Typo tolerance and facet counts. Acme have opinions about the ordering.', status: 'in_progress', priority: 'high', dueIn: -2, assignees: ['sam@tracker.dev'] },
      { title: 'Migrate customer accounts', description: 'Including password rehashing on first login so nobody has to reset.', status: 'blocked', priority: 'urgent', dueIn: -9, assignees: ['marco@tracker.dev'], blockedBy: ['Build the catalogue import pipeline'] },
      { title: 'Performance budget for category pages', description: 'Target is LCP under 2s on a mid-range Android over 4G.', status: 'backlog', priority: 'medium', dueIn: 12, assignees: ['lena@tracker.dev'] },
      { title: 'Christmas trading readiness review', description: 'Load test, on-call rota, rollback plan. Cannot slip.', status: 'backlog', priority: 'urgent', dueIn: 26, assignees: ['sam@tracker.dev'], blockedBy: ['Checkout flow — failure states', 'Migrate customer accounts'] },
      { title: 'Decommission the legacy storefront', description: 'Only after two clean weeks on the new platform.', status: 'backlog', priority: 'low', dueIn: 45, assignees: [], blockedBy: ['Christmas trading readiness review'] },
      { title: 'Write the handover runbook', description: 'For Acme’s internal team to take over in the new year.', status: 'backlog', priority: 'low', dueIn: null, assignees: ['aisha@tracker.dev'] },
    ],
    NOVA: [
      { title: 'Appointment booking — pick a slot', description: 'Calendar view with the clinic’s availability rules baked in.', status: 'done', priority: 'high', dueIn: -30, assignees: ['tom@tracker.dev'], completedWeeksAgo: 5 },
      { title: 'Appointment booking — confirm and remind', description: 'Push notification 24h before, SMS fallback.', status: 'done', priority: 'medium', dueIn: -16, assignees: ['yuki@tracker.dev'], blockedBy: ['Appointment booking — pick a slot'], completedWeeksAgo: 2 },
      // Deliberately In Review *and* blocked by unfinished work: this is the shape Goal 4.5
      // describes, so the demo has to contain one or the rule is invisible to anyone clicking around.
      { title: 'Accessibility audit against WCAG 2.2 AA', description: 'Screen reader pass on the booking journey. This is contractual.', status: 'in_progress', priority: 'urgent', dueIn: -6, assignees: ['yuki@tracker.dev'] },
      { title: 'Repeat prescriptions request flow', description: 'Patient selects from their active medication list and submits to the practice. Cannot ship until the accessibility audit passes.', status: 'in_review', priority: 'high', dueIn: 2, assignees: ['aisha@tracker.dev', 'tom@tracker.dev'], blockedBy: ['Accessibility audit against WCAG 2.2 AA'] },
      { title: 'Offline mode for the medication list', description: 'Read-only cache so patients can see their list without signal.', status: 'blocked', priority: 'medium', dueIn: 9, assignees: ['tom@tracker.dev'], blockedBy: ['Repeat prescriptions request flow'] },
      { title: 'NHS login integration', description: 'Waiting on sandbox credentials from the trust.', status: 'backlog', priority: 'high', dueIn: 20, assignees: ['aisha@tracker.dev'] },
      { title: 'Cycle 14 planning', description: 'Nothing controversial, just needs writing up.', status: 'backlog', priority: 'low', dueIn: 6, assignees: [] },
    ],
    ORBIT: [
      { title: 'Map the existing payment states', description: 'Every state the old system can be in, including the three that should be impossible.', status: 'done', priority: 'high', dueIn: -22, assignees: ['marco@tracker.dev'], completedWeeksAgo: 3 },
      { title: 'Orbit sandbox integration', description: 'Auth, capture, refund, partial refund.', status: 'in_progress', priority: 'urgent', dueIn: -1, assignees: ['marco@tracker.dev'], blockedBy: ['Map the existing payment states'] },
      { title: 'Idempotency and retry handling', description: 'A retried capture must never take the money twice.', status: 'in_progress', priority: 'urgent', dueIn: 4, assignees: ['sam@tracker.dev'] },
      { title: 'PCI scope review with compliance', description: 'External reviewer booked. Their window is fixed.', status: 'backlog', priority: 'high', dueIn: 15, assignees: ['marco@tracker.dev'], blockedBy: ['Orbit sandbox integration', 'Idempotency and retry handling'] },
      { title: 'Reconciliation report for finance', description: 'Daily CSV, matching Orbit settlements against our ledger.', status: 'backlog', priority: 'medium', dueIn: 21, assignees: ['sam@tracker.dev'] },
    ],
    HELIO: [
      { title: 'Brand territory exploration', description: 'Three directions, presented as boards rather than finished comps.', status: 'done', priority: 'medium', dueIn: -40, assignees: ['lena@tracker.dev'], completedWeeksAgo: 6 },
      { title: 'Typography and colour system', description: 'Including the accessible contrast pairs Helio kept asking about.', status: 'done', priority: 'medium', dueIn: -20, assignees: ['lena@tracker.dev'], blockedBy: ['Brand territory exploration'], completedWeeksAgo: 1 },
      { title: 'Component library in Figma', description: 'Handoff-ready, with the tokens named to match the code.', status: 'in_progress', priority: 'high', dueIn: 8, assignees: ['lena@tracker.dev'], blockedBy: ['Typography and colour system'] },
      { title: 'Marketing site build', description: 'Five pages, CMS-driven copy.', status: 'backlog', priority: 'medium', dueIn: 30, assignees: ['yuki@tracker.dev'], blockedBy: ['Component library in Figma'] },
      { title: 'Photography art direction', description: 'Brief for the shoot in October.', status: 'backlog', priority: 'low', dueIn: -3, assignees: [] },
    ],
    VERTEX: [
      { title: 'Migrate 2009–2015 records', description: 'The oldest and worst-formatted batch.', status: 'done', priority: 'high', dueIn: -50, assignees: ['tom@tracker.dev'], completedWeeksAgo: 7 },
      { title: 'Migrate 2016–2024 records', description: 'Cleaner data, much larger volume.', status: 'done', priority: 'high', dueIn: -28, assignees: ['tom@tracker.dev', 'marco@tracker.dev'], blockedBy: ['Migrate 2009–2015 records'], completedWeeksAgo: 4 },
      { title: 'Row-count reconciliation', description: 'Source versus destination, per table, per year.', status: 'in_review', priority: 'high', dueIn: -7, assignees: ['tom@tracker.dev'], blockedBy: ['Migrate 2016–2024 records'] },
      { title: 'Spot-check 500 records by hand', description: 'Vertex want a human to have looked at a sample.', status: 'in_progress', priority: 'medium', dueIn: 5, assignees: ['marco@tracker.dev'] },
      { title: 'Decommission the old warehouse', description: 'Needs written sign-off from Vertex before anything is switched off.', status: 'backlog', priority: 'medium', dueIn: 35, assignees: [], blockedBy: ['Row-count reconciliation', 'Spot-check 500 records by hand'] },
    ],
    PIXEL: [
      { title: 'Homepage build', description: 'Delivered in the spring.', status: 'done', priority: 'medium', dueIn: -120, assignees: ['lena@tracker.dev'], completedWeeksAgo: 15 },
      { title: 'Case study template', description: 'Delivered in the spring.', status: 'done', priority: 'low', dueIn: -110, assignees: ['lena@tracker.dev'], completedWeeksAgo: 14 },
    ],
  };

  const taskIdByKeyTitle = new Map<string, string>();
  const allTaskRows: { id: string; projectId: string; title: string; key: string }[] = [];

  for (const [key, specs] of Object.entries(taskSpecs)) {
    const project = projectByKey[key];
    let number = 0;
    for (const spec of specs) {
      number += 1;
      const completedAt =
        spec.status === 'done'
          ? addDays(addWeeks(startOfWeek(today), -(spec.completedWeeksAgo ?? 1)), Math.floor(rand() * 5))
          : null;

      const [row] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          number,
          title: spec.title,
          description: spec.description,
          status: spec.status,
          // Goal 4.2 / the check constraint: Blocked tasks must record where they came from.
          blockedFromStatus: spec.status === 'blocked' ? pick(['in_progress', 'in_review']) : null,
          priority: spec.priority,
          dueDate: spec.dueIn === null ? null : toISODate(addDays(today, spec.dueIn)),
          completedAt,
          createdById: project.ownerId,
          createdAt: addDays(today, -(60 - number * 2)),
          updatedAt: addDays(today, -Math.floor(rand() * 10)),
        })
        .returning();

      taskIdByKeyTitle.set(`${key}::${spec.title}`, row.id);
      allTaskRows.push({ id: row.id, projectId: project.id, title: spec.title, key });
    }
    await db.update(projects).set({ taskSeq: number }).where(eqProject(project.id));
  }

  console.log('Linking dependencies...');
  for (const [key, specs] of Object.entries(taskSpecs)) {
    const project = projectByKey[key];
    for (const spec of specs) {
      for (const blockerTitle of spec.blockedBy ?? []) {
        const taskId = taskIdByKeyTitle.get(`${key}::${spec.title}`)!;
        const blockingTaskId = taskIdByKeyTitle.get(`${key}::${blockerTitle}`)!;
        await db.insert(taskDependencies).values({
          taskId,
          blockingTaskId,
          projectId: project.id,
          createdById: project.ownerId,
        });
      }
    }
  }

  console.log('Assigning people...');
  for (const [key, specs] of Object.entries(taskSpecs)) {
    const project = projectByKey[key];
    for (const spec of specs) {
      const taskId = taskIdByKeyTitle.get(`${key}::${spec.title}`)!;
      for (const email of spec.assignees) {
        await db.insert(taskAssignees).values({
          taskId,
          userId: byEmail[email].id,
          projectId: project.id,
          assignedById: project.ownerId,
        });
      }
    }
  }

  console.log('Writing timelines...');
  for (const [key, specs] of Object.entries(taskSpecs)) {
    const project = projectByKey[key];
    for (const spec of specs) {
      const taskId = taskIdByKeyTitle.get(`${key}::${spec.title}`)!;
      const rows: (typeof activity.$inferInsert)[] = [
        { taskId, actorId: project.ownerId, type: 'created', createdAt: addDays(today, -55) },
      ];
      for (const email of spec.assignees) {
        rows.push({
          taskId,
          actorId: project.ownerId,
          type: 'assigned',
          subjectUserId: byEmail[email].id,
          createdAt: addDays(today, -50),
        });
      }
      // A plausible status history, so the timeline is not just "created".
      const path: TaskStatus[] = ['in_progress', 'in_review', 'done'];
      let prev: TaskStatus = 'backlog';
      for (const step of path) {
        const reached =
          (spec.status === 'in_progress' && step === 'in_progress') ||
          (spec.status === 'in_review' && step !== 'done') ||
          (spec.status === 'blocked' && step === 'in_progress') ||
          spec.status === 'done';
        if (!reached) break;
        rows.push({
          taskId,
          actorId: byEmail[spec.assignees[0] ?? 'sam@tracker.dev'].id,
          type: 'field_changed',
          field: 'status',
          oldValue: prev,
          newValue: step,
          createdAt: addDays(today, -30 + path.indexOf(step) * 4),
        });
        prev = step;
      }
      if (spec.status === 'blocked') {
        rows.push({
          taskId,
          actorId: project.ownerId,
          type: 'field_changed',
          field: 'status',
          oldValue: prev,
          newValue: 'blocked',
          createdAt: addDays(today, -12),
        });
      }
      if (rand() > 0.55) {
        rows.push({
          taskId,
          actorId: byEmail[pick(Object.keys(byEmail))].id,
          type: 'commented',
          body: pick([
            'Client came back on this — no changes needed, we can proceed.',
            'Parked this until the sandbox credentials land. Nothing we can do our end.',
            'Rewrote the approach after the review. Much simpler now.',
            'Worth a second pair of eyes before this goes to review.',
            'Confirmed with the client on the call today. Written up in the shared doc.',
            'This took longer than estimated — the legacy data was worse than we thought.',
          ]),
          createdAt: addDays(today, -Math.floor(rand() * 10) - 1),
        });
      }
      await db.insert(activity).values(rows);
    }
  }

  console.log('Logging time...');
  // A handful of entries on tasks that are underway or done, so the demo shows real totals.
  const timeRows: (typeof timeEntries.$inferInsert)[] = [];
  for (const [key, specs] of Object.entries(taskSpecs)) {
    for (const spec of specs) {
      if (spec.status === 'backlog') continue;
      const taskId = taskIdByKeyTitle.get(`${key}::${spec.title}`)!;
      const who = spec.assignees[0] ? byEmail[spec.assignees[0]].id : null;
      const sessions = spec.status === 'done' ? 3 : spec.status === 'in_review' ? 2 : 1;
      for (let i = 0; i < sessions; i++) {
        timeRows.push({
          taskId,
          userId: who,
          minutes: 30 + Math.floor(rand() * 8) * 15, // 30–135 min in 15-min steps
          spentOn: toISODate(addDays(today, -(2 + Math.floor(rand() * 20)))),
          note: pick(['', '', 'Pairing session', 'Review and fixes', 'Investigation', 'Client call']),
        });
      }
    }
  }
  await db.insert(timeEntries).values(timeRows);

  const counts = {
    users: createdUsers.length,
    projects: createdProjects.length,
    tasks: allTaskRows.length,
    timeEntries: timeRows.length,
  };
  console.log('\nSeed complete:', counts);
  console.log(`\nSign in with any of these — password: ${PASSWORD}`);
  for (const p of people) console.log(`  ${p.role.padEnd(8)} ${p.email}`);
  process.exit(0);
}

// Tiny local helper so the file does not need a drizzle import just for one update.
import { eq } from 'drizzle-orm';
function eqProject(id: string) {
  return eq(projects.id, id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
