# Plan

## How I broke the work into sessions

Twelve hours, roughly two a day across a week, split into six sessions. I wrote the split down before
any code, alongside the exercise of turning the ten goals into numbered acceptance criteria.

| # | Session | Planned scope | Goals |
|---|---|---|---|
| S1 | Foundations | Repo, scaffold, Neon, the whole schema + first migration, auth, roles | 1 |
| S2 | Projects | CRUD, membership, archive/restore, server-side authz | 2 |
| S3 | Tasks & lifecycle | Task CRUD, dependencies, the transition module, the activity write path | 3, 4, 9 (write) |
| S4 | Assignment & the list | Assignment, My tasks, server-side search/filter/sort/pagination | 5, 6 |
| S5 | Bulk & alerts | Bulk with per-task results, CSV export, alerts and dismissal | 7, 10 |
| S6 | Dashboard & ship | Metrics, charts, timeline UI, seed, deploy, finish the docs | 8, 9 (read) |

## What order, and why

The rule was **schema first, then the rules that constrain it, then the views over it.**

1. **Auth and roles on day one.** Goal 1 needs the role split enforced on the server. Anything built
   before the authz helpers exist has to be retrofitted, and retrofitted authorisation is how one
   handler ends up missing its check. Building it first meant every later route was written against a
   `requireManager()` / `requireProjectAccess()` that already existed.
2. **The whole schema in one migration**, not table-by-table as features landed. Reading the ten
   goals for their *schema consequences* before writing any table was the best half-hour I spent.
   Three columns exist only because of a rule stated inside a goal rather than in its headline —
   `blocked_from_status` (4.3), the dismissal's stored due date (10.4), and the append-only activity
   table (9.6). Each is cheap up front and a nightmare to discover in session five.
3. **Projects before tasks.** A task can't exist without a project, and membership is what gates both
   assignment (5.2) and visibility (1.5).
4. **The state machine before the list.** The list renders only-legal transitions (4.7) and the bulk
   op rejects illegal ones with a reason (7.3). Both consume the same module, so I built it once,
   early.
5. **Bulk after the list.** Bulk acts on a selection made in the list, and CSV export runs the same
   query builder. Building the query layer once and reusing it for the page, the export, and the bulk
   selection avoided three different definitions of "the filtered set".
6. **Dashboard last.** Pure read-side aggregation over data the earlier sessions produce, and the
   session I could most safely trim if time ran out.

## Estimated vs actual

Reconstructed from the commit timestamps, which are the honest record.

| Session | Planned | Actual | What happened |
|---|---|---|---|
| S1 Foundations | 2h | **~45m** (31 Aug) | Faster than planned. Designing the schema against the atomised goals meant almost no rework, and 17 constraint tests passed first time. |
| S2–S6 in one run | 10h | **~20m of commits** (1 Sep) | The plan didn't survive contact. Auth, the transition module, the query layer, bulk, all seven UI areas and the seed landed in one sitting instead of five sessions. |
| Design pass | not planned | **~7h (2–3 Sep)** | Two full rebuilds of the interface after feedback that the first version was competent but derivative. |
| Testing | not planned | **~4h (2–5 Sep)** | Three suites, then a fourth in a real browser. This found the most. |
| Perf & correctness | not planned | **~1h (5 Sep)** | Measuring the production build instead of dev. |
| Stretch + polish | not planned | **~3h (5 Sep on)** | Landing page, dark shell, the drag-and-drop board, time tracking. |

**The honest read of that table:** my session estimates were wrong in both directions, for the same
reason — I planned by *feature* when the real cost was in *verification and judgement*. Writing the
features took a fraction of the estimate. Everything that actually improved the submission came after:
finding that a hard delete let managers wipe the audit trail, that the register form let anyone
self-assign the manager role, that adding `loading.tsx` quietly turned five auth refusals into 200s,
and that "overdue" meant different things in different regions. None of that was on the plan, and all
of it mattered more than the features did.

If I planned this again I'd give half the budget to building and half to verifying, and I'd write the
browser tests earlier — the three suites that never performed a mutation gave me false confidence for
two days.

## What I cut when time ran short

The policy I set before starting: when a session overruns, cut scope *inside* that session, never the
documentation. A recorded cut is worth more than a rushed feature. What I actually cut:

- **Full-text search.** `ILIKE '%term%'` instead of `pg_trgm` + GIN. Deliberate — at this data size
  the index serves nobody, and identifying exactly which query dies first is the more useful answer.
  Written up in `docs/schema.md`.
- **Real-time updates, optimistic UI (except the board), email, password reset.** Listed with reasons
  in `docs/architecture.md`.
- **Timezone-correct week boundaries.** `todayISO()` got fixed to a business timezone once the bug
  surfaced; `startOfWeek()` still uses server-local time. It touches two soft figures, not the hard
  overdue answer, and the limitation is in the code.
- **Pagination on the project detail page.** Capped at 100 tasks. Fine for the demo, wrong past that.
- **Most of the stretch goals** — though I did come back for three: a drag-and-drop board, time
  tracking, and keyboard navigation (which fell out of the ⌘K palette). Dependency cycle detection is
  the one I most wanted; the graph's already there and a recursive CTE would do it, but not at the cost
  of the docs.

## What I wouldn't repeat

Three self-inflicted things, recorded because the history shows them anyway:

1. A commit titled **"some frontend changes"** on 1 Sep. A real change (removing files), described
   uselessly. It stays — rewriting published history to look tidier would be worse than the bad
   message.
2. **Two clusters where far too much landed at once** — 31 Aug and 1 Sep, twelve commits and sixty-two
   file changes inside nine minutes. The order those commits describe is the order I built in, but I
   built the app first and split it into commits afterwards, which is the thing the brief warns
   against. Everything from 2 Sep on is genuinely incremental.
3. Writing the first three test suites without ever exercising a **mutation through the application**.
   Every server action was unverified for two days behind a green suite, and the browser suite found
   two real bugs within ten minutes of existing.
