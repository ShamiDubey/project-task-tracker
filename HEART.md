# HEART.md — The Heart of This Project

> **What this file is.** Every requirement, rule, constraint and grading signal extracted from the
> assignment (`README.md`) and the five `docs/*.md` stubs, atomised into checkable items. This file is
> the single source of truth for *what must be true when we submit*. If something here is unticked,
> we are not done. If something is not here, it is not required.
>
> **Companion file:** `CLAUDE.md` = *how* we work (stack, conventions, commands, hard rules).
> This file = *what* we must build and *why it is graded*.
>
> Keep this file updated at the end of every session. Tick boxes only when the behaviour actually
> works against the real database, not when the code merely exists.

---

## 0. The one-paragraph brief

A services company runs ~a dozen client projects. People float between projects. Task lists live in
spreadsheets, status lives in chat, due dates live in people's heads. Nobody can answer **"what is
overdue across the portfolio?"** or **"who is overloaded?"** without asking around. We are building
the one internal tool that replaces all of it: **managers** set up projects, decide who is on each,
and see the whole portfolio; **staff** see what is theirs and move it forward.

Those two questions — *what is overdue* and *who is overloaded* — are the product thesis. Every
screen should make one of them easier to answer.

---

## 1. How this is graded (read this before writing code)

Verbatim from the brief, compressed:

| Signal | What they said | What that means for us |
|---|---|---|
| **Working app** | "table stakes… the floor, not the differentiator" | Necessary, not sufficient. Do not celebrate a running app. |
| **Record of thinking** | "what actually separates submissions" | `docs/decisions.md`, `docs/architecture.md`, `docs/plan.md` are **primary deliverables**, not paperwork. |
| **Judgement** | "We are hiring for judgement. The app is the evidence for that judgement, not the deliverable in itself." | Every non-obvious choice gets written down *with the rejected alternative*. |
| **Explainability** | "Submitting generated code you cannot explain is the single most common way candidates fail this round." | Never leave code in the repo we cannot defend line-by-line on a call. |
| **Git history** | "A repository whose entire history is a single 'initial commit' … **scores zero on git history**, and it colours how we read everything else" | Commit after every meaningful step. Small, honest, chronological commits. Include the messy ones. |
| **Code quality** | "structure and readability, which counts for a **small share**" | Clean, but do not gold-plate at the cost of goals or docs. |
| **Scope discipline** | "**Doing 8 goals well beats doing 10 goals badly.**" | Depth over breadth. Never leave ten things half-done. |
| **Follow-up call** | "We will ask about specific decisions we can see in your repository and its history" | Write `decisions.md` "for a version of yourself who has to explain it three weeks from now." |

### The trap to avoid
The brief says the exact rules inside each goal — *"what happens on an illegal move, what a bulk
action must report back, when a dismissed alert is allowed to reappear"* — **are the actual ask, not
just the bold headline in front of them.** Most candidates will build the headline and skip the rule.
We build the rule.

---

## 2. The ten goals, atomised

Each numbered item below is a separate acceptance test. `[ ]` → not done. `[x]` → verified working.

### Goal 1 — Accounts and roles
- [ ] 1.1 Sign in with **email and password**.
- [ ] 1.2 At least **two roles**: a **manager** role and a regular **member** role.
- [ ] 1.3 Managers **can**: create projects, archive projects, change who is on a project, delete tasks.
- [ ] 1.4 Members **cannot** do any of 1.3.
- [ ] 1.5 Members **only see projects they belong to**.
- [ ] 1.6 **All of the above enforced on the server, not just hidden in the interface.**
      → Test: hit the API directly as a member (curl with a member cookie) and confirm 403.
      → Every mutation handler re-checks authorisation from the session, never from client input.

### Goal 2 — Projects
- [ ] 2.1 Managers create a project with: **short key**, **name**, **description**, **owner**.
- [ ] 2.2 Project key is short, unique, human-typeable (e.g. `ACME`, `NOVA`). Uppercase, validated.
- [ ] 2.3 Projects can be **edited** later.
- [ ] 2.4 Projects can be **archived** and **restored**.
- [ ] 2.5 Archiving **hides the project from default views** …
- [ ] 2.6 … **without destroying its data or its tasks** (soft flag, never a delete).

### Goal 3 — Tasks inside projects
- [ ] 3.1 Every task belongs to **exactly one** project (non-null FK, never reparented casually).
- [ ] 3.2 A task carries: title, description, priority, **optional** due date.
- [ ] 3.3 A task can be blocked by **any number of other tasks** …
- [ ] 3.4 … and those blockers must be **in the same project** (enforced server-side).
- [ ] 3.5 Tasks can be created, edited, deleted (delete = manager only, per Goal 1).
- [ ] 3.6 Opening a project shows its tasks.

### Goal 4 — Task lifecycle with rules  ⚠️ highest-value goal
States: **Backlog → In Progress → In Review → Done**, plus **Blocked**.

- [ ] 4.1 Legal forward path: `Backlog → In Progress → In Review → Done`.
- [ ] 4.2 `Blocked` reachable **only from In Progress or In Review**. Not from Backlog. Not from Done.
- [ ] 4.3 **Unblocking returns the task to the state it was blocked from.**
      → Schema consequence: we must persist `blocked_from_status` on the task when it enters Blocked.
- [ ] 4.4 A **finished (Done) task can be reopened**. (Define and document the target state — we choose `In Progress`, and record why.)
- [ ] 4.5 A task with **an unfinished blocking task cannot move to Done — the server rejects the attempt.**
- [ ] 4.6 **Any other jump** (e.g. `Backlog → Done`) is **rejected by the server with a message explaining why.**
      → Not a bare 400. A human-readable reason, surfaced in the UI.
- [ ] 4.7 The **interface only offers the moves that are currently legal** (transitions computed from the same single source of truth as the server check — one shared function, no duplicated rules).

> **Design rule:** the transition table lives in exactly ONE module. The server imports it to
> validate; the UI imports it to render buttons. Duplicating this logic is the classic failure here.

### Goal 5 — Assignment
- [ ] 5.1 A task can have **any number** of assignees; a person can hold **many** tasks (many-to-many).
- [ ] 5.2 **Only members of the task's project may be assigned to it** (server-enforced).
- [ ] 5.3 **Removing someone from a project unassigns them from that project's tasks** (cascade, and it must be logged in the timeline as unassignment events).
- [ ] 5.4 Every user has **one list of everything assigned to them across all projects** ("My Tasks").

### Goal 6 — Finding things
One list, across **every project the viewer can see** (respects Goal 1.5).
- [ ] 6.1 **Text search** over **titles and descriptions**.
- [ ] 6.2 Filter: **project**.
- [ ] 6.3 Filter: **status**.
- [ ] 6.4 Filter: **assignee**.
- [ ] 6.5 Filter: **priority**.
- [ ] 6.6 Filter: **overdue**.
- [ ] 6.7 Sort by **due date**, **priority**, **last update**.
- [ ] 6.8 **Pagination showing the total number of matches.**
- [ ] 6.9 **All of this done by the server.** "Do not load every task into the browser and filter there."
      → Filters live in the URL query string; the server builds the SQL. Verify by checking the
        network payload only ever contains one page of rows.

### Goal 7 — Acting on many tasks at once
- [ ] 7.1 Select several tasks from the list.
- [ ] 7.2 Apply one change to all: **a status move**, **an assignee change**, or **a new due date**.
- [ ] 7.3 **The result reports, per task, what succeeded and what was rejected and why.**
- [ ] 7.4 **Not a whole-batch failure.** Partial success is the required behaviour.
      → Implementation consequence: each task is validated and committed in its own transaction (or
        savepoint); one rejection must not roll back the successes.
- [ ] 7.5 The per-task result is **shown in the UI**, not just returned in JSON.
- [ ] 7.6 **Export the currently filtered list as a CSV file** (same filters, same server-side query, no pagination cap — or a documented cap).

### Goal 8 — Dashboard
- [ ] 8.1 Headline number: **open tasks**.
- [ ] 8.2 Headline number: **overdue tasks**.
- [ ] 8.3 Headline number: **due this week**.
- [ ] 8.4 Headline number: **completed this week**.
- [ ] 8.5 Breakdown **by status**.
- [ ] 8.6 Breakdown **by assignee** (this is the "who is overloaded" answer).
- [ ] 8.7 **Chart of completions over the last eight weeks.**
- [ ] 8.8 All numbers computed by SQL aggregation, scoped to what the viewer can see.

### Goal 9 — History you cannot rewrite
- [ ] 9.1 Every task has a **timeline**.
- [ ] 9.2 Timeline shows **when it was created**.
- [ ] 9.3 Timeline shows **every field change with the old and new value and who made it**.
- [ ] 9.4 Timeline shows **every assignment and unassignment**.
- [ ] 9.5 Timeline shows **comments people have left**. Comments are **part of** the timeline (one stream, one table or one unioned view — not a separate comments tab).
- [ ] 9.6 **Nothing in the timeline can be edited or deleted after the fact, including by managers.**
      → No UPDATE or DELETE endpoint exists for activity rows. Enforce in the DB too where we can
        (revoke/omit update paths, append-only by construction). Document this in `schema.md` as an
        application-vs-database constraint decision.

### Goal 10 — Overdue alerts
- [ ] 10.1 Tasks **past their due date and not finished** appear in an **alerts area**.
- [ ] 10.2 A **count badge visible in the navigation**.
- [ ] 10.3 A person can **dismiss an alert for a task they are assigned to** (only their own; dismissal is per-user).
- [ ] 10.4 **If that task's due date later changes, the alert comes back.**
      → Schema consequence: the dismissal row stores **the due date it was dismissed against**. An
        alert is suppressed only while `dismissal.dismissed_due_date == task.due_date`. Changing the
        due date (in either direction) invalidates the dismissal automatically — no cleanup job.

---

## 3. Stretch ideas — optional, never a substitute
Only touch these if all ten are solidly done, and say so in `SUBMISSION.md`.
Drag-and-drop board · dependency **cycle detection** across chains · time tracking · saved filter
views · @-mentions · overdue email digest · per-project custom fields · cross-project activity feed ·
keyboard navigation.

> Best value-per-hour if we get there: **cycle detection** (we already need the dependency graph, and
> it demonstrates real thinking) and **keyboard navigation** (cheap, visible).

---

## 4. Non-negotiable deliverables

### 4.1 The five docs (must be committed, filled in **as we go, not from memory at the end**)

| File | Must answer |
|---|---|
| `docs/architecture.md` | The moving pieces; how they talk; **where each one runs**; the request path for **one representative user action end to end**; **what we decided not to build**. |
| `docs/schema.md` | Every table's columns and types; which relationships are **1-to-many vs many-to-many**; which constraints live in the **database vs the application** (and why the line is there); what we **deliberately denormalised**; **what would break first at 100× the data**. |
| `docs/plan.md` | How the work split into sessions; **what order and why**; **estimated vs actual**; **what we cut** when short. |
| `docs/decisions.md` | **At least five real decisions** — chose / rejected / why — including **at least one we later reversed**, marked with a `**Later reversed:**` line. |
| `docs/ai-prompts.md` | The prompts **actually used**, in order, grouped by goal — including **at least one that produced something wrong** and what we did about it. |

> `docs/ai-prompts.md` is not optional for us: we are using AI heavily. Log prompts **as they happen**.
> A reconstructed-at-the-end prompt log reads as fake and is worse than none.

### 4.2 Git discipline
- [ ] Public GitHub repository.
- [ ] **Commit incrementally, after each meaningful step** — never one pass at the end.
- [ ] History should show the order we built in, where we got stuck, and how the design changed.
- [ ] Docs commits interleave with code commits (evidence the docs were written as we went).

### 4.3 Hosting
- [ ] Working **live URL**, free tier only.
- [ ] **Seeded with enough demo data to show the system doing something, not an empty shell.**
- [ ] **Demo credentials for every role** in `SUBMISSION.md`.
- [ ] **Connection strings, keys and passwords in environment variables, never in the repository.**
- [ ] If the host sleeps when idle, **say so in `SUBMISSION.md`** so a slow first load isn't read as broken.
- [ ] If it can't be hosted: submit anyway and record what was tried and where it broke.

### 4.4 `SUBMISSION.md` — the first file they open
Repo URL · live URL · reviewer notes · demo credentials table (every role) · stack table with **why**
· honest goal checklist (Done/Partial/Not done + notes) · actual time spent · what we'd do with
another 12 hours · **what we're least happy with in this codebase, and why**.

> The "least happy with" answer is a judgement question. Answer it specifically and technically
> (name a module, name the shortcut), not with false modesty.

---

## 5. Chosen stack (locked)

| Layer | Choice | Why (goes in SUBMISSION.md) |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | User-specified. One deployable unit; Server Components let list pages query the DB directly, which makes "the server does the filtering" structurally true rather than a promise. |
| Database | **Neon (serverless Postgres)** | User-specified. Real Postgres — we need CTEs/window functions for the dashboard and recursive queries if we do cycle detection. Free tier, no card. |
| ORM | **Drizzle ORM** + `drizzle-kit` migrations | SQL-shaped, so the generated SQL is predictable and explainable in an interview; tiny cold-start cost vs Prisma's engine; migrations are plain checked-in `.sql` we can read. |
| Auth | **Hand-rolled**: `bcryptjs` password hashes + signed JWT session in an httpOnly cookie (`jose`) | Goal 1.6 demands *visible* server-side enforcement. A thin, explicit ~150-line auth layer is easier to defend on a call than NextAuth's abstractions. Rejected NextAuth — logged in `decisions.md`. |
| Validation | **Zod** | One schema per endpoint; parse at the boundary, trust after. |
| Styling | **Tailwind CSS** | Speed. No design-system yak-shaving. |
| Charts | **Recharts** | The 8-week completions chart only. |
| Hosting | **Vercel** (app) + **Neon** (database) | Both free, both zero-config for this stack. Neon's free tier **autosuspends after ~5 min idle** → first request can be slow → **must be noted in SUBMISSION.md**. |

---

## 6. Session plan — 12 hours, ~2 hours × 6 days

The brief: *"Budget about 12 hours total, spent roughly 2 hours a day across a week… pace yourself…
spend some of that time thinking and documenting, not only typing code."*

| # | Session | Target (≈2h) | Goals touched | Docs written in this session |
|---|---|---|---|---|
| **S1** | **Foundations** | Own git repo; Next.js + TS + Tailwind; Neon project; Drizzle wired; **full schema + first migration**; auth (register/login/logout/session); role middleware; hello-world deploy to Vercel to de-risk hosting early. | 1 | `schema.md` first draft, `decisions.md` #1–2, `ai-prompts.md` start, `plan.md` skeleton |
| **S2** | **Projects & membership** | Project CRUD, key validation, owner, archive/restore, membership add/remove, server-side authz on every route, project detail page listing tasks. | 2, 1.3–1.6 | `architecture.md` first draft, `decisions.md` #3 |
| **S3** | **Tasks & the state machine** | Task CRUD; dependencies (same-project enforced); **the single transition module**; server rejection with reasons; UI offering only legal moves; **activity-log write path** wired into every mutation. | 3, 4, 9 (write side) | `decisions.md` #4 (state machine shape) |
| **S4** | **Assignment & the big list** | Assignment m2m + project-membership guard + unassign-on-removal cascade; My Tasks; the global task list with search/filters/sort/**server-side pagination + total count**. | 5, 6 | `schema.md` update (indexes, 100× section) |
| **S5** | **Bulk ops & alerts** | Bulk status/assignee/due-date with **per-task success/failure reasons** surfaced in the UI; CSV export of the filtered set; overdue alerts + nav badge + per-user dismissal that **resurrects on due-date change**. | 7, 10 | `decisions.md` #5, the **reversed** decision |
| **S6** | **Dashboard, timeline UI, ship** | Dashboard metrics + by-status/by-assignee + 8-week chart; task timeline UI incl. comments; seed script with believable demo data; **deploy for real**; finish all five docs; fill `SUBMISSION.md`. | 8, 9 (read side) | All docs finalised + `SUBMISSION.md` |

**Buffer policy:** if a session overruns, cut *scope inside the session*, not the docs. Record the cut
in `plan.md` — "what did you cut when you ran short" is an explicitly graded question, so a recorded
cut is worth more than a rushed feature.

---

## 7. Progress log

> Append one entry per session. Estimated vs actual is a graded question in `plan.md` — capture it
> here in the moment, then transcribe.

### Session 1 — <date>
- **Estimated:** 2h — repo, scaffold, Neon, schema, auth, hello-world deploy.
- **Actual:**
- **Done:**
- **Stuck on / surprised by:**
- **Cut or deferred:**
- **Decisions made:**
- **Prompts worth logging:**

### Session 2 — <date>
### Session 3 — <date>
### Session 4 — <date>
### Session 5 — <date>
### Session 6 — <date>

---

## 8. Definition of done (final pre-submit checklist)

- [ ] All boxes in §2 ticked, or honestly marked Partial in `SUBMISSION.md` with a note.
- [ ] Every one of the five `docs/*.md` files answers **every question in its stub**.
- [ ] `docs/decisions.md` has ≥5 entries and ≥1 marked `**Later reversed:**`.
- [ ] `docs/ai-prompts.md` includes ≥1 prompt that produced something wrong + the correction.
- [ ] `git log` shows many small commits across multiple days, not one dump.
- [ ] Live URL works from a fresh browser profile.
- [ ] Demo login works for **both** roles, from `SUBMISSION.md`, copy-pasted.
- [ ] Seed data is believable: several projects, overdue tasks, blocked tasks, dependency chains, an
      uneven assignee load, completions spread over the last 8 weeks (so the chart isn't flat).
- [ ] `git grep` finds **no** connection string, password or secret in the repo.
- [ ] `.env*` is gitignored and stays gitignored.
- [ ] A member account genuinely cannot see a project they're not on — verified by direct API call.
- [ ] Every piece of code in the repo is code we can explain on a call.
