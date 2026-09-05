# Submission

## Links

- **GitHub repository:** https://github.com/ShamiDubey/project-task-tracker
- **Live application:** https://cadence-a-project-task-tracker.vercel.app

## Notes for the reviewer

The product is called **Cadence**. It's the internal delivery tool the brief describes: managers set
up client projects and see the whole portfolio, staff see their own work, and anyone can get a
straight answer to **"what's overdue"** and **"who's overloaded"** without asking around. Those two
questions drove everything — the dashboard is ordered by them, and the by-assignee breakdown exists
because "who's overloaded" is half the reason the tool exists.

**Please sign in as both roles** — the difference is the whole of Goal 1, and it's enforced on the
server, not hidden in the UI. As `sam@tracker.dev` you'll find three of the six projects missing, no
"New project" button, and no Delete on any task — and typing those URLs directly gives you a 404 or a
redirect, not the page.

**Three things worth trying,** because they're the rules stated *inside* the goals rather than the
headlines:

1. **`NOVA-4` — Repeat prescriptions request flow.** It's In Review *and* blocked by unfinished work,
   so there's **no Done button at all**, and the page tells you why: *"Cannot move to Done: blocked by
   NOVA-3 (In Progress). Finish it first."*
2. **All tasks → filter to In Review → select all → Move to Done.** You get *"2 applied · 2 rejected"*
   with a per-task reason for each refusal, not a failed batch.
3. **Alerts → dismiss one → open that task → change its due date → back to Alerts.** It's come back.
   No code does that; the dismissal stores the date it was dismissed against, so any change to the
   date invalidates it on its own.

**And two stretch features:** the **Board** (`/board`) is drag-and-drop — but a dropped card goes
through the same rules, so drag a Backlog card onto Done and the server refuses it with a reason and
the card snaps back. And each task detail page has **time tracking**.

**On verification.** `npm test` runs 163 checks across four suites — the transition rules, the database
constraints (every illegal write attempted and confirmed refused), the ten goals against a running
server, and a real browser driven through every write path. The browser suite is there because the
first three never performed a single mutation *through the application*, which I didn't notice for two
days.

## Demo credentials

Password is the same for every account: `password123`

| Role | Email | What they see |
|------|-------|---------------|
| **Manager** | `priya@tracker.dev` | The whole portfolio — 5 active projects, 1 archived |
| **Manager** | `daniel@tracker.dev` | Same, owns a different set |
| **Member** | `sam@tracker.dev` | Only ACME and ORBIT. No project creation, no task deletion |
| **Member** | `yuki@tracker.dev` | Only NOVA and HELIO — handy for seeing two members with different portfolios |

Four more members exist (`aisha@`, `marco@`, `lena@`, `tom@`) with the same password.

## Stack

| Layer | What I used | Why |
|-------|-------------|-----|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 | Server Components let list pages query the database directly, which makes "the server does the filtering" structurally true rather than a promise. One deployable unit, no serialisation boundary to keep in sync. |
| **Backend** | The same Next.js app — Server Actions plus two route handlers | No separate API server. Fewer moving parts, one place for authorisation. The route handlers exist because CSV needs a real file download and the palette index wants to be fetched on demand. |
| **Database** | Neon (serverless Postgres 18) | I needed real SQL: conditional aggregates for the dashboard, a date-bucketed eight-week series, and composite foreign keys that make three of the goals impossible to violate. |
| **Data access** | Drizzle ORM, migrations committed as plain SQL | Close enough to SQL that I can predict and defend the statement it emits. A higher-level ORM would've had me dropping to raw SQL for the dashboard anyway. |
| **Auth** | Hand-rolled: bcrypt (cost 12) + signed JWT in an httpOnly cookie | Goal 1 wants the role split *visibly* enforced server-side. With a library, "where's the role checked?" routes through a callback chain I'd be explaining second-hand; here it's a file I wrote and the failure mode is greppable. **Not a general recommendation** — for real users I'd take the library and its security review. |
| **Validation** | Zod, one schema per boundary | Parse at the edge; after that the data's trusted, before it nothing is. |
| **Charts** | Recharts | One chart. Not worth more. |
| **Hosting** | Vercel + Neon | Both free, both zero-config for this stack, and co-locating them matters — see the hosting note. |

Twelve runtime dependencies, each justifiable. `ws` is there because Neon's HTTP driver can't hold an
interactive transaction, and a status change has to write its timeline row atomically.

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | **Done** | Server-enforced. Verified over HTTP with a real session cookie: a member gets 404 on a project they're not on and 307 off the manager-only pages. Self-registration can't grant the manager role — that was a bug I found and fixed. |
| 2 | Projects | **Done** | Key/name/description/owner, editable, archive and restore. Archived projects leave the default views but stay reachable by link, data intact. |
| 3 | Tasks inside projects | **Done** | Any number of blockers, and **the same-project rule is a database constraint**, not a check — composite FKs make a cross-project dependency unwritable. |
| 4 | Lifecycle with rules | **Done** | The UI and the server read the same `validateTransition`. The suite asserts they can't disagree: for every context and target, the offered set equals the accepted set. Rejections carry a sentence, not a status code. |
| 5 | Assignment | **Done** | Membership enforced by a foreign key, and removing someone from a project cascades away exactly their assignments *on that project*. The app still does it explicitly so each unassignment lands in the timeline. |
| 6 | Finding things | **Done** | All filtering, sorting and paging in SQL, filters in the URL. Total match count shown. One caveat below. |
| 7 | Bulk actions and CSV | **Done** | One transaction *per task*, so a rejection rolls back only that task. Reasons come from the same validator as the single-task path. CSV runs the same query builder as the list. |
| 8 | Dashboard | **Done** | Four headline figures as one pass with four conditional counts. By status, by assignee, eight-week completions with empty weeks plotted so the trend's honest. |
| 9 | Immutable history | **Done, with one honest gap** | No update or delete path for activity rows anywhere, and deleting a task is a soft delete so its history survives. **The gap:** it's guaranteed by construction, not by Postgres — anyone with the connection string could still rewrite a row. Closing it needs a trigger plus revoked grants, which needs a privileged role Neon's free tier makes awkward. Written up in `docs/schema.md` rather than glossed. |
| 10 | Overdue alerts | **Done** | Count badge in the nav. Dismissal is per person and stores the due date it was dismissed against, so the alert comes back on any change — including the changed-and-changed-back case a boolean gets wrong. Proved end to end: `3 open → dismiss → 2 → move due date → 3 → move it back → 2`. |

**Stretch:** keyboard navigation via a ⌘K command palette; a drag-and-drop board that respects the
lifecycle rules; and time tracking, in its own table so it disturbs nothing. Nothing else — the ten
came first.

**One caveat on Goal 6, because a reviewer would be right to ask.** The task list is genuinely
server-paged: 25 rows plus a count, whatever the filters. The command palette, separately, fetches up
to 300 task *titles* on first ⌘K so it can match within a frame. That's rows in the browser. It's
capped, commented, and the comment says where the trade stops working — but it's a real tension with
"don't load every task into the browser" and I'd rather name it than have it found.

## Hosting

**Vercel + Neon, same region, on purpose.** Almost every page here is two or three database round
trips, and at ~300ms a round trip (what it costs from my machine to Neon's US region) those pages take
over a second. Co-located, they're tens of milliseconds.

**Neon's free tier autosuspends after ~5 minutes idle**, so the very first request after a quiet
period can take a couple of seconds while the database wakes. Everything after that is fast. If the
first load feels slow, that's the database waking, not a broken deployment.

**Verified against the live URL, not just locally.** The 74 goal checks were re-run against production
with a real session cookie — all ten goals pass there, including the alert that returns when a due date
changes. No secrets are in the repo; `DATABASE_URL`, `AUTH_SECRET` and `BUSINESS_TIMEZONE` are set in
Vercel's project settings, and the production signing secret is a different value from the one I use
locally.

## How much time did you actually spend?

**About 15 hours across six days** (31 Aug – 5 Sep), which the commit history shows.

The split wasn't what I planned. Features took a fraction of the estimate; roughly half the total went
into verification, design, and correcting my own work. `docs/plan.md` has the honest table, including
the sessions that collapsed and the ones that ran over.

## What would you do next, with another 12 hours?

1. **Close the Goal 9 gap properly** — a `BEFORE UPDATE OR DELETE` trigger on `activity` plus revoked
   grants for the app's role, so immutability is the database's promise rather than mine.
2. **Dependency cycle detection.** The stretch goal I most wanted. The graph's there, a recursive CTE
   would do it, and it catches a real failure: a chain of blockers that can never reach Done.
3. **Replace the palette's shipped index with a debounced server search**, removing the Goal 6 caveat.
4. **Finish the timezone job** — `startOfWeek()` still uses server-local time while `todayISO()` uses
   the declared business timezone. Inconsistent, and I know it.
5. **`pg_trgm` + GIN on title and description**, once there's enough data to justify it.

## What are you least happy with in this codebase, and why?

**That I shipped three passing test suites for two days without any of them exercising a single write
through the application.** Everything was `GET`s plus direct SQL. Every server action was unverified
behind a green suite — and green is worse than red, because it stops you looking. When I finally drove
a browser through the write paths it found two real bugs inside ten minutes, and four of my own tests
were wrong, two of them asserting on text the thing under test also contained. The same failure mode,
twice, in a suite I'd been quoting as evidence.

Second: **`src/app/actions/tasks.ts` is doing too much.** Task CRUD, status transitions, assignment,
dependencies, comments, alert dismissal and now time logging all live in one file because each needs
the same `loadTaskForActor` guard. It's grown past the point where one file is the right answer, and
the seam's obvious — the guard should be a wrapper and the actions should be four files.

Third, smaller: a commit on 1 Sep titled **"some frontend changes"**, which describes a real change
uselessly. I left it. Rewriting published history to look tidier would misrepresent how the work
actually happened, which is the thing the history's there to show.
