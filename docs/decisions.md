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

---

## Decision 6 — Deleting a task is a soft delete

- **Chose:** `tasks.deleted_at`. The task disappears from every view, filtered once in the query
  layer, and its timeline survives with the deletion recorded as the last entry.
- **Rejected:** an actual `DELETE`, which is what I built first.
- **Why:** two goals collide and I did not notice until I re-read them together. Goal 1.3 lets
  managers delete tasks. Goal 9.6 says nothing in the timeline can be edited or deleted, *including
  by managers*. With a hard delete, `activity.task_id` cascades — so any manager could erase the
  audit trail by deleting the task it belonged to, which is precisely what Goal 9 exists to prevent.
  Archiving a project was already the sanctioned pattern for "hide it without destroying it"; this is
  the same idea one level down.
- **Later reversed:** yes — this entry *is* the reversal. The original implementation was a hard
  delete and it shipped that way for several sessions. What changed my mind was writing the goals
  out as individually numbered criteria and noticing that 1.3 and 9.6 could not both be true of the
  same code. Verified afterwards: 3 timeline rows before the delete, 3 after, task invisible to every
  query and 404 on its own page.

---

## Decision 7 — The interface only offers moves the server would accept, derived from one function

- **Chose:** `allowedTransitions()` computes the buttons by asking `validateTransition()` about every
  status and keeping the ones it accepts.
- **Rejected:** a hard-coded button list per status, which is the obvious and much faster thing.
- **Why:** Goal 4 asks the server to reject illegal moves *with a reason* and the interface to *only
  offer legal moves*. Those are easy to let drift, most obviously at the two hard edges — leaving
  Blocked, where the legal target depends on `blocked_from_status`, and reaching Done, where legality
  depends on the state of entirely different rows. Deriving the buttons from the validator makes
  disagreement impossible rather than unlikely. The state-machine test asserts exactly this property:
  for every context and every target, the offered set and the accepted set are identical.

---

## Decision 8 — The palette's index loads on first use, not with every page

- **Chose:** a route handler the palette fetches the first time it opens.
- **Rejected:** building the index in the application shell, which is what I did first.
- **Why:** it cost two queries on every single page load — one returning up to 300 rows — to populate
  a feature most page views never touch. At roughly 300ms per round trip that was most of a second
  of waste on pages that had nothing to do with search.
- **Later reversed:** yes. I only found it by measuring the production build rather than trusting the
  development server, and by expressing page cost in database round trips rather than milliseconds,
  because the database is 8,000km from this machine and wall-clock noise was larger than the change
  I was trying to measure. The task page went from 4.8 round trips to 2.4, helped also by wrapping
  `getTask`, `getBlockers` and `isProjectMember` in React's `cache()` — the task page was calling
  `getTask` three times from three call sites, each paying its own round trip.

---

## Decision 9 — "Overdue" is decided in one declared timezone, not the server's

- **Chose:** an explicit `BUSINESS_TIMEZONE`, defaulting to UTC, used by `todayISO()`.
- **Rejected:** the server's own locale (what it was), and each viewer's local timezone (the
  superficially friendlier option).
- **Why:** I found the same data producing different overdue counts on my machine (IST) and against
  the database (UTC) — for five and a half hours of every day they disagree, so deploying to a
  different region would silently change what "overdue" means. Per-viewer is worse, not better:
  overdue has to be one shared fact, because if two colleagues see different counts the dashboard no
  longer answers *"what is overdue"*, it answers *"what is overdue for you"* — and answering that
  question for the whole company is the reason this product exists.
- **Known gap:** week boundaries still use server-local time. It shifts a boundary by hours and
  affects two soft figures rather than the hard overdue answer. Stated in the code rather than left
  to be discovered.

---

## Decision 10 — A generative 2D canvas on the sign-in screen, not WebGL

- **Chose:** about a hundred lines of 2D canvas animating the product's own subject — work moving
  through four lanes, dependency edges between them, and roughly one node in seven going red and
  stalling.
- **Rejected:** a three.js scene, which was explicitly asked for.
- **Why:** the sign-in screen is the one surface here that is a poster rather than a tool, so it
  earns visual weight the rest of the application should not have. But a WebGL scene on the login
  page of an internal delivery tracker costs several hundred kilobytes to say nothing about the
  product, and on a brief that scores judgement it reads as not knowing what matters. The canvas
  holds 60fps on integrated graphics, adds no dependency, and is *about* the thing being built.
- **Also reversed here:** an earlier pass painted radial gradients that followed the cursor across
  cards and their borders. They read as a blob chasing the mouse rather than a surface responding to
  it, and the accent-coloured one competed with the only colour in this interface that carries
  meaning. Removed; the geometric lean stayed.

---

## Decision 11 — Loading skeletons are scoped with route groups

- **Chose:** each list page's `loading.tsx` lives inside an `(index)` route group.
- **Rejected:** a `loading.tsx` at the `projects/` and `tasks/` segments, which is where I put them
  first and looks more natural.
- **Why:** a `loading.tsx` wraps its segment *and everything nested under it* in a Suspense boundary.
  One level up, it also wrapped `/projects/[id]`, `/projects/new`, the settings page and
  `/tasks/[id]` — and once Next begins streaming the shell the HTTP status is already committed to
  200, so a later `notFound()` or `redirect()` can only be resolved on the client. Five
  authorisation responses silently became 200s.
- **Later reversed:** yes, within the hour. No data leaked — the pages still refused and rendered the
  not-found UI with none of the project's content — but they refused with the wrong status code,
  which anything checking status codes would have trusted and been wrong about. Caught by an HTTP
  test asserting that a member gets a 404 on a project they are not on, which I nearly did not re-run
  after a change that was "only styling".

