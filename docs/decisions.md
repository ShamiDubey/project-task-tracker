# Decisions

The decisions that actually shaped this thing — the ones where a real alternative existed and I
picked one. Written as they happened, not reconstructed at the end. At least one of them I later
reversed; those are marked.

---

## Decision 1 — Roll my own session auth instead of NextAuth

- **Chose:** about 150 lines of my own — `bcryptjs` for hashing, a signed JWT in an httpOnly,
  `sameSite=lax`, `secure` cookie via `jose`, and two helpers (`getCurrentUser()`,
  `requireManager()`) that every route calls.
- **Rejected:** NextAuth / Auth.js with the credentials provider. Also a hosted provider (Clerk,
  Supabase Auth).
- **Why:** Goal 1 doesn't just ask for login — it asks that the manager/member split be *enforced on
  the server, not hidden in the interface*, and the brief warns that submitting code you can't explain
  is the top way to fail this round. With NextAuth, "where's the role checked?" routes through a
  callback chain I'd be explaining second-hand. Rolled by hand, the answer is a file I wrote, and the
  failure mode — a handler that forgot `requireManager()` — is greppable. Email-and-password with no
  OAuth, no magic links, no reset flow is small enough that rolling it is genuinely *less* code than
  configuring a library to do it. To be clear, this isn't a general recommendation — for a real
  product with real users I'd take the library and the security review that comes with it.

---

## Decision 2 — Drizzle over Prisma

- **Chose:** Drizzle, with `drizzle-kit` generating plain `.sql` migrations that get committed.
- **Rejected:** Prisma. Also raw SQL with a thin helper.
- **Why:** three reasons, in order of weight. (1) Goal 6 bans client-side filtering and Goal 8 wants
  real aggregation, so I'm writing group-bys, a date-bucketed series, and a paginated count in one
  round trip. Drizzle stays close enough to SQL that I can predict and defend the statement it emits;
  with Prisma I'd have dropped to `$queryRaw` for the dashboard anyway, which is two mental models
  instead of one. (2) The migrations are readable SQL in the repo, so `docs/schema.md` is something a
  reviewer can check against the code. (3) It runs on Neon's serverless driver with no query-engine
  binary, which keeps cold starts honest on Vercel's free tier. Raw SQL I turned down for the opposite
  reason — I wanted the schema to be one TypeScript file the types flow out of, so a renamed column is
  a compile error, not a runtime one.

---

## Decision 3 — One transition module, imported by both the server and the UI

- **Chose:** `src/lib/task-status.ts` holds the transition table and a single `validateTransition`
  that returns either success or a human-readable reason. The API imports it to reject; the UI imports
  the same function to decide which buttons to draw.
- **Rejected:** validating on the server, and separately hard-coding the button list in the component
  — the obvious, faster thing.
- **Why:** Goal 4 asks for two things that love to drift apart — the server rejecting any illegal jump
  *with a reason*, and the interface *only offering legal moves*. If those are two implementations
  they'll disagree, most likely at the two hard edges: leaving Blocked (where the legal target lives
  in `blocked_from_status`) and reaching Done (where legality depends on other rows entirely).
  Deriving the buttons from the same function that does the rejecting makes disagreement impossible by
  construction, and gives the "why" string exactly one author. The test suite checks exactly this: for
  every context and target, the offered set equals the accepted set.

---

## Decision 4 — Store `blocked_from_status` instead of deriving it

- **Chose:** a nullable `blocked_from_status` column, written when a task enters Blocked and read when
  it leaves.
- **Rejected:** reconstructing the return state by scanning the activity timeline for the last status
  change before it was blocked.
- **Why:** the timeline's being built anyway, so deriving was tempting and would've kept `tasks`
  narrower. But it makes a correctness-critical rule — Goal 4.3, "unblocking returns it to the state it
  was blocked from" — depend on a log query that slows as history grows, and it couples a business
  rule to the exact shape of audit rows, which I don't want to be bound by if the activity format ever
  changes. So it's a deliberate, documented denormalisation: one small column to make one important
  rule a direct read.

---

## Decision 5 — A dismissed alert stores the due date it was dismissed against

- **Chose:** `alert_dismissals(user_id, task_id, dismissed_due_date, dismissed_at)`. An alert is
  suppressed for a user only while `dismissed_due_date` still equals the task's current `due_date`.
- **Rejected:** a boolean `dismissed` flag, cleared by the due-date update handler (or a background
  job) whenever the date changes.
- **Why:** Goal 10.4 needs "if that task's due date later changes, the alert comes back." With a
  boolean, that behaviour lives in whichever code paths happen to write `due_date` — the edit form,
  the bulk operation, the seed, at least — and the day someone adds a fourth writer, resurrection
  silently stops working. Comparing against the value that was dismissed makes it a property of the
  *query* instead of every writer: any change to the date, from anywhere, in either direction,
  invalidates the dismissal with no cleanup at all. It also gets the changed-and-changed-back case
  right, which a boolean plus "clear on write" gets wrong.

---

## Decision 6 — Deleting a task is a soft delete

- **Chose:** a `deleted_at` column. The task vanishes from every view — filtered once in the query
  layer — and its timeline survives, with the deletion recorded as the last entry.
- **Rejected:** an actual `DELETE`, which is what I built first.
- **Why:** two goals collide and I didn't spot it until I read them side by side. Goal 1.3 lets
  managers delete tasks. Goal 9.6 says nothing in the timeline can be edited or deleted, *including by
  managers*. With a hard delete, `activity.task_id` cascades — so any manager could wipe the audit
  trail just by deleting the task it belonged to, which is exactly what Goal 9 exists to prevent.
  Archiving a project was already the sanctioned "hide it without destroying it" pattern; this is the
  same idea one level down.
- **Later reversed:** yes — this entry *is* the reversal. The first implementation was a hard delete
  and shipped that way for a few sessions. What changed my mind was writing the goals out as numbered
  criteria and noticing 1.3 and 9.6 couldn't both be true of the same code. Checked afterwards: 3
  timeline rows before the delete, 3 after, task invisible everywhere and 404 on its own page.

---

## Decision 7 — The palette's index loads on first use, not with every page

- **Chose:** a route handler the palette fetches the first time it opens.
- **Rejected:** building the index in the app shell, which is what I did first.
- **Why:** it cost two queries on every single page load — one returning up to 300 rows — to populate
  a feature most page views never touch. At ~300ms a round trip, that's most of a second of waste on
  pages that have nothing to do with search.
- **Later reversed:** yes. I only found it by measuring the production build rather than trusting the
  dev server, and by expressing page cost in database round trips rather than milliseconds, because
  the database is 8,000km from my machine and the wall-clock noise was bigger than the change I was
  measuring. The task page went from 4.8 round trips to 2.4, helped also by wrapping `getTask`,
  `getBlockers` and `isProjectMember` in React's `cache()` — the task page was calling `getTask`
  three times from three call sites, each paying its own round trip.

---

## Decision 8 — "Overdue" is decided in one declared timezone, not the server's

- **Chose:** an explicit `BUSINESS_TIMEZONE`, defaulting to UTC, used by `todayISO()`.
- **Rejected:** the server's own locale (what it was), and each viewer's local timezone (the
  friendlier-looking option).
- **Why:** I found the same data giving different overdue counts on my machine (IST) and against the
  database (UTC) — for five and a half hours of every day they disagree, so deploying to a different
  region would silently change what "overdue" means. Per-viewer is worse, not better: overdue has to
  be one shared fact, because if two colleagues see different counts the dashboard stops answering
  *"what is overdue"* and starts answering *"what is overdue for you"* — and answering that for the
  whole company is the reason this product exists.
- **Known gap:** week boundaries still use server-local time. It shifts a boundary by hours and touches
  two soft figures, not the hard overdue answer. Stated in the code rather than left to be found.

---

## Decision 9 — Loading skeletons scoped with route groups

- **Chose:** each list page's `loading.tsx` lives inside an `(index)` route group.
- **Rejected:** a `loading.tsx` at the `projects/` and `tasks/` segments, which is where I put them
  first and looks more natural.
- **Why:** a `loading.tsx` wraps its segment *and everything nested under it* in a Suspense boundary.
  One level up, it also wrapped `/projects/[id]`, `/projects/new`, the settings page and `/tasks/[id]`
  — and once Next starts streaming the shell, the HTTP status is already committed to 200, so a later
  `notFound()` or `redirect()` can only be handled on the client. Five authorisation responses
  silently became 200s.
- **Later reversed:** yes, within the hour. No data leaked — the pages still refused and rendered the
  not-found UI with none of the project's content — but they refused with the wrong status code, which
  anything checking status codes would have trusted and been wrong about. Caught by an HTTP test
  asserting a member gets a 404 on a project they're not on, which I nearly didn't re-run after a
  change that was "only styling".

---

## Decision 10 — Route parameters are validated before they reach the database

- **Chose:** an `isUuid()` guard at the top of every dynamic route, and the same check when parsing
  `project` and `assignee` out of the query string. A malformed id is *not found*, not an error.
- **Rejected:** catching the driver error and translating it — would've worked, but leaves the bad
  value travelling one layer further than it should.
- **Why:** `/projects/not-a-uuid` returned a **500**. The parameter went straight into a comparison
  against a `uuid` column, Postgres raised *invalid input syntax for type uuid*, and nothing caught it
  — so a mistyped or stale link crashed the page instead of returning "not found". Found by sweeping
  every route with hostile input, which is the whole point of sweeping. It's the same rule the rest of
  the code follows — parse at the boundary, trust afterwards. Route parameters were the one boundary I
  hadn't guarded, because they *look* like they come from the app rather than from a person typing in
  the address bar. They don't.
