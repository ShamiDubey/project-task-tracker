# Schema

Eight tables, all in `public`, defined in [`src/db/schema.ts`](../src/db/schema.ts) and materialised
by the committed migration in [`drizzle/`](../drizzle). Postgres 18 on Neon.

The organising idea: **push a rule into the database whenever the database is capable of holding it.**
Several of the ten goals state a rule inside the goal rather than in its headline, and those rules are
exactly the ones that rot when they live in application code, because they have to be re-remembered by
every future writer. Where a constraint below looks unusual, that is why, and the goal number is cited.

---

## Table by table

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `email` | `text` NOT NULL | unique index; check `email = lower(email)` |
| `name` | `text` NOT NULL | |
| `password_hash` | `text` NOT NULL | bcrypt, cost 12. Plaintext never leaves the request handler |
| `role` | `user_role` NOT NULL | `manager` \| `member`, default `member` |
| `created_at` / `updated_at` | `timestamptz` NOT NULL | default `now()` |

Roles are **global, not per-project**. The brief describes managers as people who run the portfolio,
not people who happen to run one project. A per-project role would have turned "can this person
archive a project" from a field read into a join, and nothing in the ten goals asks for it.

Emails are stored lower-cased and the database checks it, rather than the signup handler lower-casing
and everyone trusting that it did — there is a second writer (the seed script), and a case-varying
duplicate would defeat the unique index silently.

### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `key` | `text` NOT NULL | unique; check `~ '^[A-Z][A-Z0-9]{1,9}$'` |
| `name` | `text` NOT NULL | |
| `description` | `text` NOT NULL | default `''` — empty, not null, so readers never branch |
| `owner_id` | `uuid` NOT NULL → `users.id` | `ON DELETE RESTRICT` |
| `archived_at` | `timestamptz` NULL | **null = active** |
| `task_seq` | `integer` NOT NULL | per-project task counter, default 0 |
| `created_at` / `updated_at` | `timestamptz` NOT NULL | |

**Archive is a nullable timestamp, not a boolean and never a delete** (Goal 2.4–2.6). Default views
filter on `archived_at is null`; restoring sets it back to null; the value records *when*, which a
boolean throws away. No project row and no task row is ever destroyed.

`owner_id` is `RESTRICT`, not `CASCADE` or `SET NULL`: a project must always have an owner, so
deleting a person who owns projects should fail loudly and force a reassignment rather than quietly
orphan a dozen clients' work.

`task_seq` gives human-readable references like `ACME-14`. A single global sequence would have been
simpler, but task numbers are visible to whoever opens the app, and a global one leaks the total
volume of work across every other client's project.

### `project_members` — join table

| Column | Type |
|---|---|
| `project_id` | `uuid` → `projects.id` `ON DELETE CASCADE` |
| `user_id` | `uuid` → `users.id` `ON DELETE CASCADE` |
| `added_at` | `timestamptz` NOT NULL |

PK `(project_id, user_id)`, plus a secondary index on `user_id` alone.

This table does more work than its three columns suggest. It is the answer to Goal 1.5 (members only
see projects they belong to), and it is the foreign-key target that makes Goals 5.2 and 5.3
enforceable by Postgres — see `task_assignees`.

The PK serves *"who is on this project"*. The extra index on `user_id` serves the other direction,
*"which projects is this person on"*, which is the first clause of every member-scoped read in the
application and would otherwise be a sequential scan.

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` NOT NULL → `projects.id` cascade | Goal 3.1 — exactly one project |
| `number` | `integer` NOT NULL | unique with `project_id` |
| `title` | `text` NOT NULL | |
| `description` | `text` NOT NULL | default `''` |
| `status` | `task_status` NOT NULL | `backlog`, `in_progress`, `in_review`, `blocked`, `done` |
| `blocked_from_status` | `task_status` NULL | see below |
| `priority` | `task_priority` NOT NULL | `low`, `medium`, `high`, `urgent` |
| `due_date` | `date` NULL | Goal 3.2 — optional |
| `completed_at` | `timestamptz` NULL | see below |
| `created_by_id` | `uuid` NULL → `users.id` `SET NULL` | |
| `created_at` / `updated_at` | `timestamptz` NOT NULL | |

**`due_date` is a `date`, not a `timestamptz`.** "Past its due date" is a calendar question. A
timestamp would make whether a task is overdue depend on the viewer's timezone at midnight, and would
invite a time-of-day nobody ever means.

**Enums are Postgres enums, not text.** Two reasons. Bad data cannot exist even if a bug ships. And
Postgres orders enums by declaration order, so `priority` declared `low → urgent` gives Goal 6.7's
"sort by priority" natively — text would have needed a `CASE` in every sort or a second column.

Three check constraints, and each exists because of a specific rule:

| Constraint | Guarantees |
|---|---|
| `(status = 'blocked') = (blocked_from_status is not null)` | Goal 4.3. There is no way to write a Blocked task with nowhere to return to, and no way to leave stale return-state on a task that is no longer blocked. |
| `blocked_from_status is null or in ('in_progress','in_review')` | Goal 4.2 — Blocked is only reachable from those two states, so the memory of where it came from can only ever hold one of them. |
| `(status = 'done') = (completed_at is not null)` | Keeps the denormalisation honest. |

Indexes: `(project_id, status)`, `(status)`, `(due_date)`, `(updated_at)`, `(completed_at)` — these
map onto Goal 6's filters and sorts and Goal 8's aggregates. Plus a second unique on `(id, project_id)`
which is not redundant with the PK: it is the FK target the two tables below need.

### `task_dependencies` — join table, tasks to tasks

| Column | Type |
|---|---|
| `task_id` | `uuid` — the blocked task |
| `blocking_task_id` | `uuid` — the blocker |
| `project_id` | `uuid` — carried redundantly, deliberately |
| `created_at`, `created_by_id` | |

PK `(task_id, blocking_task_id)`; index on `blocking_task_id`; check `task_id <> blocking_task_id`.

Two **composite** foreign keys, both into `tasks (id, project_id)`. Because a single `project_id`
column has to satisfy both, Postgres can only accept the row if the blocked task and the blocker are
in the same project. That is Goal 3.4 — *"any number of other tasks **in the same project** that block
it"* — enforced by the database, not by a check every call site has to remember to perform.

The extra index is on `blocking_task_id` because the PK already serves *"what is blocking me"* (the
Goal 4.5 check) and the task page also asks the reverse, *"what am I blocking"*.

### `task_assignees` — join table, tasks to users

| Column | Type |
|---|---|
| `task_id` | `uuid` |
| `user_id` | `uuid` |
| `project_id` | `uuid` — carried redundantly, deliberately |
| `assigned_at`, `assigned_by_id` | |

PK `(task_id, user_id)`; index on `user_id`.

This is the table I am happiest with. Two composite foreign keys —
`(task_id, project_id) → tasks(id, project_id)` and
`(project_id, user_id) → project_members(project_id, user_id)`, both `ON DELETE CASCADE` — buy two
goals outright:

- **Goal 5.2**, *"only members of a task's project may be assigned to it"*: the membership FK cannot
  be satisfied by someone who is not on the project. Not a validation, an impossibility.
- **Goal 5.3**, *"removing someone from a project unassigns them from that project's tasks"*: deleting
  the `project_members` row cascades away exactly the assignments they held **on that project**, and
  leaves their work on every other project alone. The scoping falls out of the composite key.

The index on `user_id` is what makes Goal 5.4 ("everything assigned to me across all projects") and
Goal 8.6 (the by-assignee breakdown that answers *"who is overloaded"*) index scans.

### `activity` — the timeline

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `task_id` | `uuid` NOT NULL → `tasks.id` cascade | |
| `actor_id` | `uuid` NULL → `users.id` **`SET NULL`** | who did it |
| `type` | `activity_type` NOT NULL | `created`, `field_changed`, `assigned`, `unassigned`, `commented`, `dependency_added`, `dependency_removed` |
| `field`, `old_value`, `new_value` | `text` NULL | Goal 9.3 |
| `subject_user_id` | `uuid` NULL → `users.id` `SET NULL` | for `assigned` / `unassigned` |
| `body` | `text` NULL | for `commented` |
| `created_at` | `timestamptz` NOT NULL | |

Index on `(task_id, created_at)` — the timeline is only ever read as "this task, in order".

**Comments are rows in this table, not a separate table**, because Goal 9.5 says comments are *part
of* the timeline. One table means one `ORDER BY created_at` yields the whole history: no union, no
two streams that can disagree about ordering, no second thing to paginate.

`actor_id` is `SET NULL` rather than `CASCADE`. If a user record ever goes away, the record of what
happened has to survive them — deleting a person must not rewrite the past.

`old_value`/`new_value` are `text` for every field, including dates and enums. That is a deliberate
loss of typing: it lets one table describe a change to any field without a column per type or a JSON
blob, and nothing reads these values except to render them.

There is **no `updated_at` column**, and that is the point — see the constraints section below.

### `alert_dismissals`

| Column | Type |
|---|---|
| `user_id` | `uuid` → `users.id` cascade |
| `task_id` | `uuid` → `tasks.id` cascade |
| `dismissed_due_date` | `date` **NOT NULL** |
| `dismissed_at` | `timestamptz` NOT NULL |

PK `(user_id, task_id)` — dismissal is per person, per task (Goal 10.3).

`dismissed_due_date` is the whole design. An alert is suppressed for a user only while
`dismissed_due_date = tasks.due_date`. So Goal 10.4 — *"if that task's due date later changes, the
alert comes back"* — is a property of the read query rather than a behaviour every writer has to
implement. Any change to `due_date`, from the edit form, from the Goal 7 bulk operation, from the
seed script, or from a writer that does not exist yet, invalidates the dismissal with no cleanup job
and no cache to bust. It also gets the *changed-and-changed-back* case right, which a boolean plus a
"clear the flag on write" rule does not.

`NOT NULL` because a task with no due date can never be overdue, and so can never be dismissed.

---

## Relationships

**One-to-many**

- `users` → `projects` (as owner, via `projects.owner_id`)
- `projects` → `tasks` (Goal 3.1: a task belongs to exactly one project)
- `tasks` → `activity`
- `users` → `activity` (as actor, and as subject of an assignment event)
- `users` → `tasks` (as creator)

**Many-to-many**, each with its own join table

- `users` ↔ `projects`, via `project_members` — membership
- `users` ↔ `tasks`, via `task_assignees` — assignment (Goal 5.1)
- `tasks` ↔ `tasks`, via `task_dependencies` — blocking (Goal 3.3), a self-referencing many-to-many

**One-to-one-ish**: `alert_dismissals` is at most one row per `(user, task)` pair.

---

## Which constraints live where, and why the line is there

**In the database** — anything that is a property of the data itself, and anything more than one
writer has to respect:

- every foreign key and cascade rule
- both composite FKs (same-project dependencies; assignment implies membership)
- the three `tasks` check constraints (blocked-state consistency, valid blocked-from, `completed_at`)
- format checks: project key shape, email lower-casing
- uniqueness: email, project key, `(project_id, number)`

The test is *"could a second writer get this wrong?"* — the seed script, a bulk operation and a normal
handler all insert tasks, so an invariant that only the normal handler upholds is not upheld. All of
the above were verified by attempting the illegal write against the real Neon database and confirming
it was rejected: 17 cases, all rejected.

**In the application** — anything that needs context the row does not carry:

- **The transition table** (Goal 4). *Which* move is legal depends on the current status, on
  `blocked_from_status`, and on the state of other rows entirely (Goal 4.5: no Done while a blocker is
  unfinished). A check constraint sees one row and cannot see its blockers. It lives in one module,
  `src/lib/task-status.ts`, imported by both the API and the UI so the two cannot drift.
- **Role authorisation** (Goal 1). Depends on the session, which the database does not have.
- **Visibility** (Goal 1.5). Applied as a predicate in the query layer. Postgres row-level security
  was the alternative and was rejected: it would have required a per-request database role or a
  session variable set on a pooled connection, which is fragile on serverless, and it would have
  hidden the rule from the code a reviewer reads.
- **Writing the timeline.** Every mutation writes its activity row in the same transaction as the
  change. Database triggers were the alternative — they would be harder to bypass — but they cannot
  see *who* made the change without smuggling the actor through a session variable, and Goal 9.3
  requires the actor.

**The honest gap.** Goal 9.6 says nothing in the timeline can be edited or deleted after the fact,
*including by managers*. Today that is guaranteed by construction, not by Postgres: the `activity`
table has no `updated_at`, and no UPDATE or DELETE path for those rows exists anywhere in the
application. Anyone holding the `DATABASE_URL` could still rewrite a row by hand. Closing that
properly means a `BEFORE UPDATE OR DELETE` trigger that raises, plus revoking `UPDATE`/`DELETE` on the
table from the application role — which needs a second, more privileged migration role that Neon's
free tier makes awkward. It is a real limitation and it is recorded here rather than glossed over.

There is also a deliberate overlap on Goal 5.3: the database cascade *and* explicit application code
both unassign people when they leave a project. The application does it because the cascade writes no
activity rows and Goal 9.4 requires the unassignment to appear in the timeline. The FK is the floor,
not the mechanism.

---

## What was deliberately denormalised

1. **`tasks.completed_at`** — derivable by scanning `activity` for the last change to `done`. It
   exists because Goal 8 wants "completed this week" and an eight-week completions chart, and both
   become one indexed range scan instead of an aggregate over the whole audit log. Guarded by the
   `(status = 'done') = (completed_at is not null)` check, because an unguarded denormalisation is
   just a bug waiting for a reopen that forgets to clear it.

2. **`tasks.blocked_from_status`** — derivable by scanning the timeline backwards for the last status
   change before the task was blocked. Storing it keeps a correctness rule (Goal 4.3) as a direct
   read instead of a log query that slows as history grows, and stops a business rule from being
   coupled to the exact shape of audit rows.

3. **`project_id` on `task_dependencies` and `task_assignees`** — strictly redundant, since it is
   reachable through `task_id`. It is there so the composite foreign keys can exist at all. This one
   is the clearest trade in the schema: one duplicated `uuid` per row buys three goals as database
   guarantees.

4. **`projects.task_seq`** — a counter that could be `max(number) + 1`. A counter is O(1) and, held
   under the same transaction as the insert, gapless; the `max()` is a scan and races.

5. **`activity.old_value` / `new_value` as `text`** — denormalising every field's type into strings so
   one table covers all of them.

---

## What would break first at 100× the data

Sizing the current shape at roughly 12 projects, ~50 people, a few thousand tasks. 100× is ~1,200
projects, ~5,000 people, several hundred thousand tasks and — the number that actually matters —
**millions of activity rows**, since history only ever grows.

In the order I expect them to break:

1. **The text search in Goal 6.1, first and by a distance.** Search over titles *and* descriptions is
   `ILIKE '%term%'`, which no B-tree can serve; it is a sequential scan over every task the viewer can
   see. It is fine at a few thousand rows and it is the first thing to fall over. The fix is known and
   cheap — `pg_trgm` with a GIN index on `title` and `description`, or a `tsvector` column with a GIN
   index if we want ranking and stemming. I have deliberately not built it: at this data size it would
   be an index nobody needs, and knowing precisely which query dies first is worth more here than
   pre-optimising it.

2. **`COUNT(*)` for Goal 6.8's total match count.** The brief requires showing the total number of
   matches, which means an exact count over the full filtered set on every page load — the same scan
   as the search, run twice. At 100× this doubles the cost of the most-used screen. The usual fixes
   are an approximate count from the planner, or a "1,000+" cap, both of which change what the UI can
   honestly claim.

3. **`activity` outgrowing everything else.** It is the only append-only table and it takes several
   rows per task mutation, so at 100× it is easily the largest table by an order of magnitude. Reads
   stay fine — `(task_id, created_at)` is exactly the access pattern and the working set is one task's
   history. What degrades is total size, backups, and any future cross-project activity feed (a stretch
   idea), which would want `(created_at)` and time-based partitioning.

4. **The dashboard's by-assignee breakdown.** A group-by across every task visible to the viewer, with
   no time bound. For a manager who can see everything, that is a scan over the whole table on every
   dashboard load. The eight-week chart is fine because `completed_at` bounds it; the open-task
   breakdown has no such bound. It wants either a covering index or a periodically-refreshed
   materialised view, and the fact that it is exactly the query answering *"who is overloaded"* — the
   product's whole reason to exist — means it is the one I would fix second.

5. **`projects.task_seq` under contention.** Incrementing one row per project serialises concurrent
   task creation *within* a project. At this scale it is invisible; it would only matter with an
   importer creating thousands of tasks into one project at once, and I would rather have gapless,
   per-project numbers than optimise for a load this application does not have.

What does *not* worry me: the joins. Every many-to-many access path has an index in the direction it
is actually read, and the composite foreign keys mean the planner has real statistics on the columns
that scope every query.
