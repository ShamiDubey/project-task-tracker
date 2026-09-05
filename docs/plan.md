# Plan

## How the work was broken into sessions

Six sessions of roughly two hours, one a day. The plan was written before any code, alongside the
exercise of turning the ten goals into individually numbered acceptance criteria.

| # | Session | Planned scope | Goals |
|---|---|---|---|
| S1 | Foundations | Repo, scaffold, Neon, whole schema + migration, auth, roles | 1 |
| S2 | Projects | CRUD, membership, archive/restore, server-side authorisation | 2 |
| S3 | Tasks & lifecycle | Task CRUD, dependencies, the transition module, activity write path | 3, 4, 9 (write) |
| S4 | Assignment & the list | Assignment, My tasks, server-side search/filter/sort/pagination | 5, 6 |
| S5 | Bulk & alerts | Bulk with per-task results, CSV export, alerts and dismissal | 7, 10 |
| S6 | Dashboard & ship | Metrics, charts, timeline UI, seed, deploy, finish the docs | 8, 9 (read) |

## What order, and why that order

The rule was **schema first, then the rules that constrain it, then the views over it.**

1. **Auth and roles on day one.** Goal 1 requires the role split enforced on the server. Anything
   written before the authorisation helpers exists would need retrofitting, and retrofitted
   authorisation is how one handler ends up missing its check. Building it first meant every later
   route was written against `requireManager()` / `requireProjectAccess()` that already existed.

2. **The whole schema in one migration, not table-by-table as features landed.** Reading the ten
   goals for their *schema consequences* before writing any table was the highest-leverage half hour
   in the project. Three columns exist only because of a rule stated inside a goal rather than in its
   headline — `blocked_from_status` (4.3), the dismissal's stored due date (10.4), and the
   append-only activity table (9.6). Each is cheap to design up front and expensive to discover in
   session five.

3. **Projects before tasks.** A task cannot exist without a project, and membership is what gates
   both assignment (5.2) and visibility (1.5).

4. **The state machine before the list.** The list renders only-legal transitions (4.7) and the bulk
   operation rejects illegal ones with a reason (7.3). Both consume the same module, so it was built
   once, early.

5. **Bulk after the list.** Bulk acts on a selection made in the list, and CSV export runs the same
   query builder. Building the query layer once and reusing it for the page, the export and the bulk
   selection avoided three divergent definitions of "the filtered set".

6. **Dashboard last.** Pure read-side aggregation over data the earlier sessions produce, and the
   session most safely trimmed if time ran out.

## Estimated versus actual

Reconstructed from the commit timestamps, which are the honest record.

| Session | Planned | Actual | What happened |
|---|---|---|---|
| S1 Foundations | 2h | **~45m** (31 Aug, 15:23–16:08) | Faster than planned. Designing the schema against the atomised goals meant almost no rework, and 17 constraint tests passed first time. |
| S2–S6 in one run | 10h | **~20m of commits** (1 Sep, 16:49–17:09) | The plan did not survive contact. Auth, the transition module, the query layer, bulk, all seven UI areas and the seed landed in one sitting rather than five sessions. |
| Design pass | not planned | **~7h across 2–3 Sep** | Two full rebuilds of the interface after feedback that the first version was competent but derivative. |
| Testing | not planned | **~4h across 2–5 Sep** | Three suites, then a fourth in a real browser. This found the most. |
| Performance & correctness | not planned | **~1h (5 Sep)** | Measuring the production build rather than dev. |

**The honest read of that table:** my session estimates were wrong in both directions and for the same
reason — I planned by *feature* when the real cost was in *verification and judgement*. Writing the
features took a fraction of the estimate. Everything that actually improved the submission came after:
finding that a hard delete let managers erase the audit trail, that the register form let anyone
self-assign the manager role, that adding `loading.tsx` silently turned five authorisation refusals
into 200s, and that "overdue" quietly meant something different depending on which region the app ran
in. None of those were on the plan, and all of them mattered more than the features were.

If I planned this again I would allocate **half the budget to building and half to verifying**, and I
would write the browser tests earlier — the three suites that never performed a mutation gave me
false confidence for two days.

## What was cut when time ran short

The policy set before starting was: when a session overruns, cut scope *inside* that session, never
the documentation — a recorded cut is worth more than a rushed feature. What was actually cut:

- **Full-text search.** `ILIKE '%term%'` instead of `pg_trgm` + GIN. Deliberate: at this data size the
  index would serve nobody, and identifying precisely which query dies first is the more useful
  answer. Recorded in `docs/schema.md`.
- **Real-time updates, optimistic UI, email, password reset.** Listed with reasons in
  `docs/architecture.md` under *What I decided not to build*.
- **Timezone-correct week boundaries.** `todayISO()` was fixed to use an explicit business timezone
  after the bug surfaced; `startOfWeek()` still uses server-local time. It affects two soft figures
  rather than the hard overdue answer, and the limitation is stated in the code.
- **Pagination on the project detail page.** Capped at 100 tasks. Fine for the demo, wrong past that.
- **Every stretch goal except keyboard navigation**, which arrived free with the command palette.
  Cycle detection across dependency chains was the one I most wanted; the graph is already there and
  a recursive CTE would do it, but not at the cost of the documentation.

## The git history, and where it falls short

The brief is explicit that the history should show work committed *"after each meaningful step, not
in one pass at the end"*, and that it is how the order of the build, the sticking points and the
design changes get assessed. Mine is partly that and partly not, and the gap is visible in the
timestamps, so I would rather state it than have it found.

**What holds up.** Thirty-four commits across five real days. The messages carry the reasoning, not
just the change. The genuine course corrections are all there and dated — a hard delete becoming a
soft delete once I saw Goals 1.3 and 9.6 collide, the cursor-following gradients added and then
removed, `loading.tsx` silently turning five authorisation refusals into 200s and being moved into
route groups, the command-palette index moving out of the shell after I measured it.

**What does not.** Two clusters where far too much landed at once:

| When | Commits | What it really was |
|---|---|---|
| 31 Aug 15:23 | 4 in one minute | Scaffold and setup, split afterwards |
| **1 Sep 16:49** | **4 in one minute** | The entire backend — auth, transitions, query layer, bulk |
| **1 Sep 16:58** | **8 in one minute** | The entire interface — all seven areas, plus the seed |
| 2 Sep 11:31 | 3 in one minute | The design system, split afterwards |

Twelve commits and sixty-two file changes inside nine minutes on 1 Sep. The *order* those commits
describe is the order I actually built in, and each one stands alone and compiles — but I built the
whole application first and divided it into commits afterwards, which is the thing the brief warns
against, just wearing twelve hats instead of one. A reviewer reading timestamps will see that
immediately, and they would be right to.

**Why I have not fixed it.** Rewriting the author dates to look spread out would fake the exact
signal being assessed, on a submission where the history is the evidence and I would be asked about
it in an interview. Force-pushing over published history to look tidier is worse than an honest
history with a visible flaw. The later commits — 2 Sep onward, and everything after — are genuinely
incremental, because by then I was committing as each step finished rather than in batches.

Also on the list, and for the same reason left alone: a commit titled **"some frontend changes"** on
1 Sep. It is a real change, described uselessly.

## What else I would not repeat

Writing the first three test suites without ever exercising a **mutation through the application**.
Every server action was unverified for two days behind a green suite, and the browser suite found two
genuine bugs within ten minutes of existing.
