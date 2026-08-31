# Decisions

The decisions that actually shaped this codebase — the ones where a real alternative existed. Added
as they were made, not reconstructed at the end.

---

## Decision 1 — Hand-rolled session auth instead of NextAuth

- **Chose:** ~150 lines of my own auth: `bcryptjs` for password hashing, a signed JWT in an httpOnly,
  `sameSite=lax`, `secure` cookie via `jose`, and two helpers — `getCurrentUser()` and
  `requireManager()` — that every route handler calls.
- **Rejected:** NextAuth / Auth.js with the credentials provider. Also rejected: a hosted identity
  provider (Clerk, Supabase Auth).
- **Why:** Goal 1 does not just ask for login, it asks that the manager/member split be *"enforced on
  the server, not just hidden in the interface"* — and the brief warns that submitting code you
  cannot explain is the most common way to fail this round. With NextAuth, the answer to "where is
  the role checked?" routes through a callback chain and a session-shape contract I would have to
  explain second-hand. With a hand-rolled layer the answer is a file I wrote, and the failure mode
  (a handler that forgot to call `requireManager()`) is greppable. Email-and-password with no OAuth,
  no magic links and no password reset is a small enough surface that rolling it is a genuinely
  smaller amount of code than configuring a library to do it. This is not a general recommendation —
  for a product with real users I would take the library and the security review that comes with it.

---

## Decision 2 — Drizzle ORM over Prisma

- **Chose:** Drizzle, with `drizzle-kit` generating plain `.sql` migration files that are committed.
- **Rejected:** Prisma. Also rejected: raw SQL with a thin query helper.
- **Why:** Three reasons, in order of weight. (1) Goal 6 bans client-side filtering and Goal 8 wants
  real aggregation — I will be writing group-bys, a date-bucketed eight-week series, and a paginated
  query with a total count in the same round trip. Drizzle's query builder stays close enough to SQL
  that I can predict and defend the statement it emits; Prisma's higher-level API would have me
  dropping to `$queryRaw` for the dashboard anyway, which means two mental models instead of one.
  (2) The migrations are readable SQL in the repo, which makes `docs/schema.md` something a reviewer
  can check against the code. (3) It runs on the serverless Neon HTTP driver without a query engine
  binary, which keeps cold starts on Vercel's free tier honest. Raw SQL was rejected for the opposite
  reason — I wanted the schema to be one TypeScript file that the types flow out of, so a renamed
  column is a compile error rather than a runtime one.

---

## Decision 3 — One transition module, imported by both the server and the UI

- **Chose:** `src/lib/task-status.ts` holds the transition table and a single
  `validateTransition(from, to, context)` function returning either success or a human-readable
  reason. The API imports it to reject illegal moves; the UI imports the same function to decide
  which buttons to render.
- **Rejected:** Validating on the server and separately hard-coding the button list in the component
  (the obvious, faster thing).
- **Why:** Goal 4 asks for two things that are easy to let drift apart: the server must reject any
  illegal jump *with a message explaining why*, and the interface must *only offer the moves that are
  currently legal*. If those are two implementations, they will disagree — most likely at the
  Blocked-and-back edge, where the legal move depends on `blocked_from_status`, and at the
  Done-with-an-unfinished-blocker rule, where legality depends on other rows entirely. Deriving the
  buttons from the same function that does the rejecting makes disagreement impossible by
  construction, and it means the "why" string has exactly one author.

---

## Decision 4 — Store `blocked_from_status` on the task rather than deriving it from history

- **Chose:** A nullable `blocked_from_status` column on `tasks`, written when a task enters Blocked
  and read when it leaves.
- **Rejected:** Reconstructing the return state by scanning the task's activity timeline for the last
  status change before it was blocked.
- **Why:** The timeline is being built anyway (Goal 9), so deriving it was tempting and would have
  kept `tasks` narrower. But it makes a correctness-critical rule — Goal 4.3, *"unblocking returns it
  to the state it was blocked from"* — depend on a log-scanning query that gets slower as history
  grows, and it couples a business rule to the exact shape of audit rows, which is a coupling I do
  not want to be bound by if the activity format ever changes. This is a deliberate, documented
  denormalisation: one small column to make one important rule a direct read. Noted as such in
  `docs/schema.md`.

---

## Decision 5 — A dismissed alert stores the due date it was dismissed against

- **Chose:** `alert_dismissals(user_id, task_id, dismissed_due_date, dismissed_at)`. An overdue alert
  is suppressed for a user only while a dismissal exists whose `dismissed_due_date` still equals the
  task's current `due_date`.
- **Rejected:** A boolean `dismissed` flag, cleared by the due-date update handler (or by a
  background job) whenever the date changes.
- **Why:** Goal 10.4 requires that *"if that task's due date later changes, the alert comes back."*
  With a boolean, that behaviour lives in whichever code paths happen to write `due_date` — the task
  edit form, the bulk due-date operation in Goal 7, and the seed script, at minimum — and the day
  someone adds a fourth writer, the resurrection silently stops working. Comparing against the value
  that was dismissed makes the rule a property of the query rather than of every writer: any change
  to `due_date`, from anywhere, in either direction, invalidates the dismissal with no cleanup at
  all. It also gives the correct behaviour on a due date that is changed and then changed back, which
  a boolean plus a "clear on write" rule gets wrong.

---

_Further decisions appended as they are made. At least one entry will carry a **Later reversed:**
line once something is actually reversed — that will be recorded honestly when it happens, not
manufactured._
