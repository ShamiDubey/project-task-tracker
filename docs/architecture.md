# Architecture

## The shape of it, in one paragraph

One Next.js application, deployed as a single unit, talking to one Postgres database. There is no
separate API server and no client-side data layer. Pages are React Server Components that query the
database directly; mutations are Server Actions that run on the same server. The browser receives
rendered HTML and a small amount of JavaScript for the parts that are genuinely interactive.

That is a deliberate choice and the main architectural decision in the project. It is discussed under
*Why one deployable unit* below.

---

## The moving pieces, and where each one runs

| Piece | What it is | Where it runs |
|---|---|---|
| **Next.js app** (App Router) | Pages, Server Actions, two route handlers | Vercel, Node runtime, one region |
| **Postgres** | All state: users, projects, tasks, assignments, dependencies, the timeline, alert dismissals | Neon, serverless Postgres, same region as the app |
| **Drizzle** | Query builder and migrations. Not a service — a library inside the app | in-process |
| **Session** | A signed JWT in an httpOnly cookie | issued by the app, held by the browser |
| **Browser JavaScript** | Filters, the bulk toolbar, the command palette, the theme toggle, the sign-in scene | the viewer's browser |

Nothing else. No queue, no cache layer, no background worker, no separate auth provider, no
websocket. Every one of those was considered and rejected — see *What I decided not to build*.

### How they talk

```
Browser ──HTTP──> Next.js on Vercel ──WebSocket (pg wire)──> Neon Postgres
   │                     │
   │  httpOnly cookie    │  DATABASE_URL, AUTH_SECRET
   │  (signed JWT)       │  (environment variables, never in the repo)
```

Two details worth naming:

**The database driver is Neon's WebSocket pool, not its HTTP driver.** The HTTP driver is simpler and
has a lower cold-start cost, but it cannot hold an interactive transaction across statements. Almost
every mutation here is genuinely multi-statement — a status change writes the task row, its activity
row, and sometimes `completed_at`, and Goal 9 makes "a change without its timeline entry" a bug
rather than a stale read. One extra dependency (`ws`) buys atomicity.

**The session carries the user id and nothing else that matters.** The role is re-read from the
database on every request rather than trusted from the token, so a manager who is demoted loses
their powers on the next request instead of at token expiry.

---

## A representative request, end to end

**A member drags a task to Done, and the server refuses because something is blocking it.**

This path is worth tracing because it touches authentication, authorisation, the state machine, the
timeline, and the interface's own knowledge of what is legal.

1. **Before the click.** The task page rendered on the server. It called `transitionContext(taskId)`,
   which loads the task and its unfinished blockers, then handed that to `allowedTransitions()`.
   That function asks `validateTransition()` about every status and keeps the ones it accepts. Because
   this task has an unfinished blocker, **Done is not among them, so no Done button was rendered** —
   and underneath the buttons the page prints the reason: *"Cannot move to Done: blocked by ACME-6
   (In Progress). Finish it first."* The interface cannot offer a move the server would refuse,
   because both read the same function.

2. **The click.** The user presses *Move to In Review* instead. A client component calls the
   `changeTaskStatus` Server Action inside a React transition. No `fetch`, no endpoint, no JSON —
   Next.js posts to the current route with an action id.

3. **On the server: who is asking.** `requireUser()` reads the httpOnly cookie, verifies the JWT
   signature with `AUTH_SECRET`, and loads the user row by id. No session, no user: redirect to
   `/login`. The actor is derived here and **never from anything the request supplied**.

4. **On the server: may they.** `loadTaskForActor` fetches the task, then `requireProjectAccess`
   checks visibility — managers see everything, members only projects they belong to. A member
   probing another project's task id gets the same "not found" as a task that does not exist, so ids
   cannot be used to discover that a project exists. Then `requireTaskWriteAccess` confirms they can
   write.

5. **On the server: is the move legal.** Inside a transaction, `applyStatusChange` rebuilds the
   transition context from the database — not from the client's idea of it — and calls the same
   `validateTransition`. On refusal it returns the reason string and the transaction rolls back.

6. **The write.** Legal, so in one transaction: update `status`; set `blocked_from_status` if entering
   Blocked and clear it otherwise; set or clear `completed_at`; insert one `activity` row recording
   the old and new value and who made the change. Three database check constraints make the
   inconsistent combinations impossible to write even if this code were wrong.

7. **The response.** `revalidatePath` marks the route stale, the action returns, and Next re-renders
   the page on the server and streams it back. The buttons come back recomputed from the new state —
   the client never decided what the new legal moves were.

The same rules run for one task or twenty: the bulk operation calls `applyStatusChange` per task, so
a batch rejection is worded identically to an individual one.

---

## Where the work happens, and why there

The organising rule is **the server decides, the browser presents**. Concretely:

| Concern | Where | Why there |
|---|---|---|
| Authentication, authorisation, visibility | Server, every request | The brief requires it enforced on the server, not hidden in the interface. A hidden button is a courtesy; the refusal is the feature. |
| Search, filters, sorting, pagination | SQL | The brief bans loading every task into the browser. Filters live in the URL, so the server receives them with the request and answers with one page plus a count. |
| Dashboard aggregates | SQL | Four headline figures are one pass with four conditional counts, not four scans or a `rows.filter().length`. |
| Transition rules | One shared module | The server imports it to reject, the interface imports it to decide which buttons exist. Written twice they would drift. |
| Timeline writes | Same transaction as the change | A change without its history is a bug, not a stale read. |
| Filter chips, bulk selection, palette, theme | Browser | Genuinely interactive; a round trip per keystroke would be worse. |

Client components are the exception rather than the default. Everything that can be a Server
Component is one.

---

## What I decided not to build

Each of these was a real option, and each was declined for a reason rather than skipped.

**A separate API server.** The brief's suggested split is database / server / browser on three hosts.
One Next.js app is fewer moving parts, one deployment, one place for authorisation, and no
serialisation boundary to keep in sync. The cost is that the browser cannot talk to a public API —
which nothing here needs. If a mobile client ever did, the query layer is already separated from the
pages and would lift out behind route handlers.

**A client-side data layer** (React Query, SWR, a store). Server Components already fetch on the
server; adding a cache in the browser would mean two sources of truth for the same rows and a class
of staleness bug the application currently cannot have.

**Row-level security in Postgres.** Genuinely tempting for Goal 1.5. Rejected because it needs a
per-request database role or a session variable set on a pooled connection, which is fragile on
serverless, and because it would move the visibility rule out of the code a reviewer reads and into
database configuration they would have to be told about. It lives in one SQL predicate instead.

**Database triggers for the timeline.** Harder to bypass than application code, and I considered it
for Goal 9.6. Rejected because a trigger cannot see *who* made the change without smuggling the actor
through a session variable, and the goal explicitly requires the actor.

**Full-text search.** Search is `ILIKE '%term%'`, which no index can serve. At a few thousand tasks
it is instant; it is also the first thing that breaks at scale, which `docs/schema.md` says plainly.
Adding `pg_trgm` now would be an index nobody needs, and knowing precisely which query dies first is
worth more than pre-optimising it.

**Real-time updates.** No websockets, no polling. Overdue work does not change second by second, and
a page refresh is an honest interaction for this product.

**Email, password reset, OAuth, invitations.** Out of scope for the ten goals, and each drags in a
provider, a template, and a delivery failure mode.

**Optimistic UI.** Mutations wait for the server. For a tool where the server is the arbiter of what
is legal, showing a move as applied before it is accepted would be lying to the user — the exact
thing Goal 4 is testing.

---

## Two things I would change

**The command palette ships a task index.** It fetches up to 300 task titles on first ⌘K. The list
itself is genuinely server-paged, so Goal 6 is satisfied — but a reviewer would be right to ask why
one feature ships rows to the browser at all. The answer is that matching locally responds within a
frame and the cap is stated in the code; the honest caveat is that it is the wrong design past a few
thousand tasks, at which point it becomes a debounced server search.

**Week boundaries use the server's local time.** `todayISO()` was moved to an explicit
`BUSINESS_TIMEZONE` after I found the same data producing different overdue counts on my machine
(IST) and on Vercel (UTC). "Due this week" and the chart buckets still use server-local time. It only
shifts a boundary by hours and affects two soft figures rather than the hard overdue answer, but it
is inconsistent and I would finish the job.
