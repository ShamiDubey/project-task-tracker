/**
 * The single source of truth for the database.
 *
 * A note on how to read this file: several columns and constraints exist only because of a rule
 * stated *inside* one of the ten goals rather than in its headline. Those are marked with the goal
 * number, because they are the parts a reviewer is most likely to ask about.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ enums */

/**
 * Two roles, as the brief requires. Global rather than per-project: the brief describes managers as
 * people who run the portfolio, not people who happen to run one project, and a per-project role
 * would have made "can this person archive a project" a join instead of a field.
 */
export const userRole = pgEnum('user_role', ['manager', 'member']);

/**
 * Goal 4. Declaration order is meaningful in two ways:
 *  - it is the order of the happy path, which keeps the transition table readable;
 *  - Postgres sorts enums by declaration order, so `order by status` is already sensible.
 */
export const taskStatus = pgEnum('task_status', [
  'backlog',
  'in_progress',
  'in_review',
  'blocked',
  'done',
]);

/**
 * Ordered low → urgent so that Postgres's native enum ordering gives us Goal 6's "sort by priority"
 * for free: `order by priority desc` puts urgent first. Storing this as text would have meant either
 * a CASE expression in every sort or an extra integer column to sort on.
 */
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

/** Goal 9. Every kind of thing that can appear in a task's timeline. */
export const activityType = pgEnum('activity_type', [
  'created',
  'field_changed',
  'assigned',
  'unassigned',
  'commented',
  'dependency_added',
  'dependency_removed',
]);

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    /** bcrypt hash. The plaintext password never leaves the request handler. */
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    // Emails are stored lower-cased so the unique index above is genuinely case-insensitive.
    // Enforced in the database rather than only at the signup handler, because a second writer
    // (the seed script) also inserts users.
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
);

/* --------------------------------------------------------------- projects */

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Goal 2.1: the "short key". Uppercase, used to build human task refs like ACME-14. */
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /**
     * Goal 2.4/2.6: archive is a nullable timestamp, not a boolean and not a delete. Null means
     * active, so the default view filters on `archived_at is null`; a value records *when* it was
     * archived, which a boolean would throw away, and restoring is just setting it back to null.
     * Nothing is ever destroyed.
     */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    /**
     * Per-project counter for task numbers (ACME-1, ACME-2, ...). Incremented inside the same
     * transaction that inserts the task, so numbers are gapless per project. A global sequence
     * would have been simpler but would leak how many tasks exist across all clients' projects.
     */
    taskSeq: integer('task_seq').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('projects_key_unique').on(t.key),
    index('projects_owner_idx').on(t.ownerId),
    index('projects_archived_idx').on(t.archivedAt),
    // 2–10 uppercase alphanumerics, starting with a letter. In the database because the key ends up
    // in user-visible task references and a lowercase or punctuated key would be a permanent wart.
    check('projects_key_format', sql`${t.key} ~ '^[A-Z][A-Z0-9]{1,9}$'`),
  ],
);

/* -------------------------------------------------------- project_members */

/**
 * Many-to-many: a person is on many projects, a project has many people.
 *
 * This table is doing more work than it looks. It is the answer to Goal 1.5 (members only see
 * projects they belong to), and it is the FK target that makes Goal 5.2 and Goal 5.3 enforceable in
 * the database rather than in application code — see `taskAssignees` below.
 */
export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    // The PK covers project-first lookups ("who is on this project"). This covers the other
    // direction — "which projects is this person on" — which every member-scoped read starts with.
    index('project_members_user_idx').on(t.userId),
  ],
);

/* ------------------------------------------------------------------ tasks */

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Goal 3.1: exactly one project, non-null, and the task dies with the project. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Per-project number; rendered as `${project.key}-${number}`. */
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: taskStatus('status').notNull().default('backlog'),
    /**
     * Goal 4.3 — "unblocking returns it to the state it was blocked from".
     *
     * Written when the task enters Blocked, read when it leaves, null otherwise. The alternative was
     * to scan the activity timeline backwards for the last status change, which would have made a
     * correctness rule depend on a log query that gets slower with history and on the exact shape of
     * audit rows. Deliberate denormalisation; see docs/decisions.md #4.
     */
    blockedFromStatus: taskStatus('blocked_from_status'),
    priority: taskPriority('priority').notNull().default('medium'),
    /**
     * Goal 3.2: optional. A `date`, not a timestamp — "past its due date" is a calendar question,
     * and a timestamp would make overdue depend on the viewer's timezone at midnight.
     */
    dueDate: date('due_date', { mode: 'string' }),
    /**
     * Set when the task moves to Done, cleared when it is reopened. Derivable from the activity
     * timeline, so this is a denormalisation — it exists because Goal 8 asks for "completed this
     * week" and an eight-week completions chart, and both are one indexed range scan on this column
     * instead of an aggregate over the whole audit log.
     */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Goal 6.7 sorts on this. Bumped by every mutation, including assignment changes. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('tasks_project_number_unique').on(t.projectId, t.number),

    /**
     * Not redundant with the primary key. This is the FK target that lets `task_dependencies` and
     * `task_assignees` carry `project_id` and have Postgres verify that a related task really is in
     * the project it claims — which is how the same-project rules below become database
     * constraints rather than application checks somebody can forget.
     */
    unique('tasks_id_project_unique').on(t.id, t.projectId),

    index('tasks_project_status_idx').on(t.projectId, t.status),
    index('tasks_status_idx').on(t.status),
    index('tasks_due_date_idx').on(t.dueDate),
    index('tasks_updated_at_idx').on(t.updatedAt),
    index('tasks_completed_at_idx').on(t.completedAt),

    /**
     * Goal 4: `blocked_from_status` is set if and only if the task is Blocked. This makes the
     * "return to where you came from" rule impossible to corrupt — there is no way to write a
     * Blocked task with nowhere to return to, or a non-blocked task carrying stale return state.
     */
    check(
      'tasks_blocked_state_consistent',
      sql`(${t.status} = 'blocked') = (${t.blockedFromStatus} is not null)`,
    ),
    /** Goal 4.2: Blocked is only reachable from In Progress or In Review. */
    check(
      'tasks_blocked_from_valid',
      sql`${t.blockedFromStatus} is null or ${t.blockedFromStatus} in ('in_progress', 'in_review')`,
    ),
    /**
     * Keeps the denormalised `completed_at` honest: a Done task has one, anything else does not.
     * Without this, a reopen that forgot to clear the column would silently corrupt the dashboard's
     * completions chart, and nothing would ever surface it.
     */
    check(
      'tasks_completed_at_consistent',
      sql`(${t.status} = 'done') = (${t.completedAt} is not null)`,
    ),
  ],
);

/* ------------------------------------------------------- task_dependencies */

/**
 * Goal 3.3 — "any number of other tasks in the same project that block it".
 *
 * Many-to-many, tasks to tasks. `task_id` is the task that is blocked; `blocking_task_id` is the
 * blocker. `project_id` is carried redundantly so the two composite foreign keys below can force
 * both ends into the same project (Goal 3.4) — the database rejects a cross-project dependency
 * outright, rather than trusting every call site to check first.
 */
export const taskDependencies = pgTable(
  'task_dependencies',
  {
    taskId: uuid('task_id').notNull(),
    blockingTaskId: uuid('blocking_task_id').notNull(),
    projectId: uuid('project_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.blockingTaskId] }),
    foreignKey({
      name: 'task_dependencies_task_fk',
      columns: [t.taskId, t.projectId],
      foreignColumns: [tasks.id, tasks.projectId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'task_dependencies_blocking_fk',
      columns: [t.blockingTaskId, t.projectId],
      foreignColumns: [tasks.id, tasks.projectId],
    }).onDelete('cascade'),
    // "What is blocking me" is the Goal 4.5 check; this index serves the reverse direction,
    // "what am I blocking", which the task detail page shows.
    index('task_dependencies_blocking_idx').on(t.blockingTaskId),
    check('task_dependencies_no_self_block', sql`${t.taskId} <> ${t.blockingTaskId}`),
  ],
);

/* ---------------------------------------------------------- task_assignees */

/**
 * Goal 5.1 — many-to-many: a task has any number of assignees, a person holds many tasks.
 *
 * The two composite foreign keys are the interesting part, and they buy two goals outright:
 *
 *  - Goal 5.2, "only members of a task's project may be assigned to it": the FK into
 *    `project_members` cannot be satisfied unless the person is actually on the project.
 *  - Goal 5.3, "removing someone from a project unassigns them from that project's tasks": deleting
 *    the `project_members` row cascades to every assignment they held on that project — and only on
 *    that project. Their work on other projects is untouched.
 *
 * The application still performs the unassignment explicitly inside a transaction, because Goal 9.4
 * requires each unassignment to appear in the task's timeline and a database cascade writes no
 * activity rows. So the app writes the history and the constraint guarantees the outcome; the FK is
 * the floor, not the mechanism. This tension is discussed in docs/schema.md.
 */
export const taskAssignees = pgTable(
  'task_assignees',
  {
    taskId: uuid('task_id').notNull(),
    userId: uuid('user_id').notNull(),
    projectId: uuid('project_id').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedById: uuid('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.userId] }),
    foreignKey({
      name: 'task_assignees_task_fk',
      columns: [t.taskId, t.projectId],
      foreignColumns: [tasks.id, tasks.projectId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'task_assignees_membership_fk',
      columns: [t.projectId, t.userId],
      foreignColumns: [projectMembers.projectId, projectMembers.userId],
    }).onDelete('cascade'),
    // Goal 5.4 ("everything assigned to me across all projects") and Goal 8.6 (the by-assignee
    // breakdown that answers "who is overloaded") both start from a user id.
    index('task_assignees_user_idx').on(t.userId),
  ],
);

/* --------------------------------------------------------------- activity */

/**
 * Goal 9 — the timeline. One append-only stream per task.
 *
 * Comments live here too rather than in their own table, because Goal 9.5 says comments are *part
 * of* the timeline. One table means one `order by created_at` produces the whole history, with no
 * union and no chance of the two streams disagreeing about ordering.
 *
 * Goal 9.6 says nothing here can be edited or deleted after the fact, including by managers. That is
 * enforced by construction: there is no `updated_at` column, and no update or delete path for these
 * rows exists anywhere in the application. See docs/schema.md for why this is an application-level
 * guarantee here and what it would take to make the database enforce it.
 */
export const activity = pgTable(
  'activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    /**
     * Who did it. `set null` rather than cascade: if a user record ever goes away, the history of
     * what happened must survive it — deleting a person must not rewrite the past.
     */
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    type: activityType('type').notNull(),
    /** For `field_changed`: which field. e.g. 'status', 'title', 'priority', 'due_date'. */
    field: text('field'),
    /** Goal 9.3 wants the old and the new value. Stored as text so one table covers every field. */
    oldValue: text('old_value'),
    newValue: text('new_value'),
    /** For `assigned` / `unassigned`: who was assigned or unassigned. */
    subjectUserId: uuid('subject_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** For `commented`. */
    body: text('body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The timeline is always read as "this task, in order".
    index('activity_task_created_idx').on(t.taskId, t.createdAt),
  ],
);

/* ------------------------------------------------------- alert_dismissals */

/**
 * Goal 10.3/10.4 — a person can dismiss an overdue alert for a task they are assigned to, and
 * "if that task's due date later changes, the alert comes back".
 *
 * The dismissal records *the due date it was dismissed against*. An alert is suppressed only while
 * `dismissed_due_date = tasks.due_date`, so any change to the due date — from any writer, in either
 * direction — invalidates the dismissal automatically. No cleanup job, no cache to bust, and no
 * dependence on every future code path that touches `due_date` remembering to clear a flag.
 *
 * A boolean would also have got the "changed and then changed back" case wrong. See
 * docs/decisions.md #5.
 *
 * Not null, because a task with no due date can never be overdue and so can never be dismissed.
 */
export const alertDismissals = pgTable(
  'alert_dismissals',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    dismissedDueDate: date('dismissed_due_date', { mode: 'string' }).notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskId] })],
);

/* ------------------------------------------------------------------ types */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Activity = typeof activity.$inferSelect;
export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type TaskPriority = (typeof taskPriority.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
export type ActivityType = (typeof activityType.enumValues)[number];
