# Plan

## How the work was broken into sessions

Twelve hours, roughly two per day across a week, split into six sessions:

| # | Session | Goals |
|---|---|---|
| S1 | Foundations — repo, scaffold, Neon, schema, migrations, auth, roles | 1 |
| S2 | Projects, membership, archive/restore, server-side authorisation | 2 |
| S3 | Tasks, dependencies, the lifecycle state machine, activity-log write path | 3, 4, 9 (write) |
| S4 | Assignment, My Tasks, the global list with server-side search/filter/sort/pagination | 5, 6 |
| S5 | Bulk operations with per-task results, CSV export, overdue alerts and dismissal | 7, 10 |
| S6 | Dashboard and charts, task timeline UI, seed data, deploy, finish the docs | 8, 9 (read) |

## What order, and why that order

The ordering rule was **schema first, then the rules that constrain it, then the views over it.**

1. **Auth and roles before anything else (S1).** Goal 1 says role separation must be enforced on the
   server, not hidden in the interface. If the session and the authorisation helpers do not exist on
   day one, every route written before them gets retrofitted later — and retrofitted authorisation is
   how you end up with one handler that forgot the check. Building it first means every route
   afterwards is written against a `requireManager()` / `requireProjectMember()` helper that already
   exists.

2. **The whole schema in one migration in S1, not table-by-table as features land.** Three columns in
   the schema exist only because of a rule stated inside a goal — `blocked_from_status` (Goal 4.3,
   "unblocking returns it to the state it was blocked from"), the dismissal's stored due date
   (Goal 10.4, "if that task's due date later changes, the alert comes back"), and the append-only
   activity table (Goal 9.6). Each of those is cheap to design up front and expensive to discover
   halfway through S5. Reading the ten goals for their *schema consequences* before writing any table
   was the highest-leverage half-hour in the plan.

3. **Projects before tasks (S2 before S3).** A task cannot exist without a project, and the
   membership rule that gates assignment (Goal 5.2) and visibility (Goal 1.5) is a project concept.

4. **The state machine before the list (S3 before S4).** The list has to render only-legal
   transitions (Goal 4.7) and the bulk operation in S5 has to reject illegally-moved tasks with a
   reason (Goal 7.3). Both consume the same transition module, so it is built once, early, and
   imported by everything downstream.

5. **Bulk operations after the list (S5 after S4).** Bulk acts on a selection made in the list, and
   CSV export runs the same query builder as the list. Building the query layer once and reusing it
   for the page, the export and the bulk selection avoids three divergent definitions of "the
   filtered set".

6. **Dashboard last (S6).** It is pure read-side aggregation over data the earlier sessions produce.
   It is also the session most safely cut down if time runs short, which is why it is not first.

7. **Deploy early, not last.** A throwaway deployment goes up at the end of S1, before there is
   anything worth deploying, so that hosting problems surface on day one rather than in the last
   hour. Only the seed data and the final deploy are left for S6.

## Estimated versus actual

Filled in per session as the work happens.

| Session | Estimated | Actual | Notes |
|---|---|---|---|
| S1 Foundations | 2h | | |
| S2 Projects | 2h | | |
| S3 Tasks & lifecycle | 2h | | |
| S4 Assignment & list | 2h | | |
| S5 Bulk & alerts | 2h | | |
| S6 Dashboard & ship | 2h | | |

## What was cut when time ran short

The policy set before starting: **when a session overruns, cut scope inside that session — never the
documentation.** "What did you cut when you ran short" is an explicitly graded question, so a cut
that is recorded is worth more than a feature that is rushed. All ten goals come before any stretch
idea; eight goals done solidly beats ten done badly.

Recorded here as it happens:

- _(nothing cut yet — S1 in progress)_
