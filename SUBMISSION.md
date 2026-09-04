# Submission

## Links

- **GitHub repository:** https://github.com/ShamiDubey/project-task-tracker
- **Live application:** _not yet deployed — see “Hosting” below_

## Notes for the reviewer

The product is called **Cadence**. It is the internal delivery tool the brief describes: managers set
up client projects and see the portfolio, staff see their own work, and anyone can get a straight
answer to **“what is overdue”** and **“who is overloaded”** without asking around. Those two questions
drove the design — the dashboard is ordered by them, and the by-assignee breakdown exists because
“who is overloaded” is half the reason the tool exists.

**Please sign in as both roles.** The difference is the whole of Goal 1, and it is enforced on the
server, not hidden in the interface. As `sam@tracker.dev` you will find three of the six projects
missing, no “New project” button, and no Delete on any task — and typing those URLs directly returns
404 or a redirect rather than the page.

**Three things worth trying,** because they are the rules stated *inside* the goals rather than the
headlines:

1. **`NOVA-4` — Repeat prescriptions request flow.** It is In Review *and* blocked by unfinished work,
   so there is **no Done button at all**, and the page says why: *“Cannot move to Done: blocked by
   NOVA-3 (In Progress). Finish it first.”*
2. **All tasks → filter to In Review → select all → Move to Done.** You get *“2 applied · 2 rejected”*
   with a per-task reason for each refusal, not a failed batch.
3. **Alerts → dismiss one → open that task → change its due date → back to Alerts.** It has returned.
   No code does that; the dismissal stores the due date it was dismissed against, so any change to
   the date invalidates it automatically.

**Verification.** `npm test` runs 158 checks in four suites: the transition rules, the database
constraints (every illegal write attempted and confirmed refused), the ten goals against a running
server, and a real browser driven through every write path. The browser suite is there because the
first three never performed a single mutation *through the application*, which I did not notice for
two days.

## Demo credentials

Password is the same for every account: `password123`

| Role | Email | What they can see |
|------|-------|-------------------|
| **Manager** | `priya@tracker.dev` | The whole portfolio — 5 active projects, 1 archived |
| **Manager** | `daniel@tracker.dev` | Same, owns a different set of projects |
| **Member** | `sam@tracker.dev` | Only ACME and ORBIT. No project creation, no task deletion |
| **Member** | `yuki@tracker.dev` | Only NOVA and HELIO — useful for confirming two members see different portfolios |

Six more members exist (`aisha@`, `marco@`, `lena@`, `tom@`) with the same password.

## Stack

| Layer | What I used | Why |
|-------|-------------|-----|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 | Server Components let list pages query the database directly, which makes “the server does the filtering” structurally true rather than a promise. One deployable unit, no serialisation boundary to keep in sync. |
| **Backend** | The same Next.js app — Server Actions plus two route handlers | No separate API server. Fewer moving parts, one place for authorisation. The two route handlers exist because CSV needs a real file download and the palette index needs to be fetchable on demand. |
| **Database** | Neon (serverless Postgres 18) | Real SQL was needed: conditional aggregates for the dashboard, a date-bucketed eight-week series, and composite foreign keys that make three of the goals impossible to violate. |
| **Data access** | Drizzle ORM, migrations committed as plain SQL | Close enough to SQL that I can predict and defend the statement it emits. With a higher-level ORM I would have dropped to raw SQL for the dashboard anyway — two mental models instead of one. |
| **Auth** | Hand-rolled: bcrypt (cost 12) + signed JWT in an httpOnly cookie | Goal 1 wants the role split *visibly* enforced server-side. With a library, “where is the role checked?” routes through a callback chain I would be explaining second-hand; here it is a file I wrote and the failure mode is greppable. **Not a general recommendation** — for real users I would take the library and its security review. |
| **Validation** | Zod, one schema per boundary | Parse at the edge; after that the data is trusted, before it nothing is. |
| **Charts** | Recharts | One chart. Not worth more. |
| **Hosting** | Vercel + Neon (planned) | Both free, both zero-config for this stack, and co-locating them matters — see the performance note below. |

Eleven runtime dependencies. Each one is justifiable; `ws` is there because Neon’s HTTP driver cannot
hold an interactive transaction, and a task status change must write its timeline row atomically.

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | **Done** | Server-enforced. Verified by direct HTTP with a real session cookie: a member gets 404 on a project they are not on and 307 off the manager-only pages. Self-registration cannot grant the manager role — that was a bug I found and fixed. |
| 2 | Projects | **Done** | Key/name/description/owner, editable, archive and restore. Archived projects leave the default views but stay reachable by link with data intact. |
| 3 | Tasks inside projects | **Done** | Any number of blockers, and **the same-project rule is a database constraint**, not a check — composite foreign keys make a cross-project dependency unwritable. |
| 4 | Lifecycle with rules | **Done** | The interface and the server read the same `validateTransition`. The test suite asserts they can never disagree: for every context and target, the offered set equals the accepted set. Rejections carry a sentence, not a status code. |
| 5 | Assignment | **Done** | Membership is enforced by a foreign key, and removing someone from a project cascades away exactly their assignments *on that project*. The app still does it explicitly so each unassignment appears in the timeline. |
| 6 | Finding things | **Done** | All filtering, sorting and paging in SQL, filters in the URL. Total match count shown. One caveat below. |
| 7 | Bulk actions and CSV | **Done** | One transaction *per task*, so a rejection rolls back only that task. Reasons come from the same validator as the single-task path. CSV runs the same query builder as the list. |
| 8 | Dashboard | **Done** | Four headline figures as one pass with four conditional counts. By status, by assignee, eight-week completions with empty weeks plotted so the trend is honest. |
| 9 | Immutable history | **Done, with one honest gap** | No update or delete path for activity rows exists anywhere, and deleting a task is a soft delete so its history survives. **The gap:** it is guaranteed by construction, not by Postgres — anyone with the connection string could still rewrite a row. Closing it needs a trigger plus revoked grants, which needs a second privileged role Neon’s free tier makes awkward. Written up in `docs/schema.md` rather than glossed. |
| 10 | Overdue alerts | **Done** | Count badge in the nav. Dismissal is per person and stores the due date it was dismissed against, so the alert returns on any change — including the changed-and-changed-back case a boolean gets wrong. Proved end to end: `3 open → dismiss → 2 → move due date → 3 → move it back → 2`. |

**Stretch:** keyboard navigation, via a ⌘K command palette. Nothing else — the ten came first.

**One caveat on Goal 6, stated because a reviewer would be right to ask.** The task list is genuinely
server-paged: 25 rows plus a count, whatever the filters. The command palette, separately, fetches up
to 300 task *titles* on first ⌘K so it can match within a frame. That is rows in the browser. It is
capped, it is commented, and the comment says where the trade stops working — but it is a real
tension with “do not load every task into the browser” and I would rather name it than have it found.

## Hosting

**Not deployed yet.** Everything else is finished; this is the remaining task, and I would rather say
so than claim a URL that does not work.

What is ready: no secrets in the repository (verified across all 32 commits), `.env.example`
documents all three variables, migrations are committed and idempotent, and `npm run db:seed` is
deterministic.

**Note for when it is live:** Neon’s free tier autosuspends after ~5 minutes idle, so the first
request after a quiet period can take a few seconds. That is the database waking, not a broken
deployment.

## How much time did you actually spend?

**About 13 hours across five days** (31 Aug – 5 Sep), which the commit history shows.

The split was not what I planned. Features took a fraction of the estimate; roughly **half the total
went into verification, design and correcting my own work**. `docs/plan.md` has the honest table,
including the sessions that collapsed and the ones that expanded.

## What would you do next, with another 12 hours?

1. **Deploy.** First and non-negotiable.
2. **Close the Goal 9 gap properly** — a `BEFORE UPDATE OR DELETE` trigger on `activity` plus revoked
   grants for the application role, so immutability is the database’s promise rather than mine.
3. **Cycle detection across dependency chains.** The stretch goal I most wanted. The graph exists, a
   recursive CTE would do it, and it protects a real failure: a chain of blockers that can never
   reach Done.
4. **Replace the palette’s shipped index with a debounced server search**, removing the Goal 6 caveat.
5. **Finish the timezone job** — `startOfWeek()` still uses server-local time while `todayISO()` uses
   the declared business timezone. Inconsistent, and I know it.
6. **`pg_trgm` + GIN on title and description**, once there is enough data to justify it.

## What are you least happy with in this codebase, and why?

**That I shipped three passing test suites for two days without any of them exercising a single write
through the application.** Everything was `GET`s plus direct SQL. Every server action was unverified
behind a green suite — and green is worse than red, because it stops you looking. When I finally drove
a browser through the write paths it found two real bugs inside ten minutes, and four of my own tests
were wrong, two of them asserting on text the thing under test also contained. The same failure mode,
twice, in a suite I had been quoting as evidence.

Second: **`src/app/actions/tasks.ts` is doing too much.** Task CRUD, status transitions, assignment,
dependencies, comments and alert dismissal all live in one file because each needs the same
`loadTaskForActor` guard. It has grown past the point where one file is the right answer, and the
seam is obvious — the guard should be a wrapper and the actions should be four files.

Third, smaller: a commit on 1 Sep titled **“some frontend changes”**, which describes a real change
uselessly. I left it. Rewriting published history to look tidier would misrepresent how the work
happened, which is the thing the history is there to show.
