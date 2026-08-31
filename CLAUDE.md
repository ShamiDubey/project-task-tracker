# CLAUDE.md — Working instructions for this repository

> Read this and `HEART.md` at the start of every session, before touching code.
> **`HEART.md`** = *what* must be built and how it is graded (the requirement spec).
> **`CLAUDE.md`** (this file) = *how* we build it — stack, conventions, commands, hard rules.

---

## 1. What this repository is

A take-home submission: an internal **project & task tracking tool** for a services company running
~12 client projects. Managers set up projects and see the portfolio; staff see their own work and
move it forward. Anyone can answer *"what is overdue?"* and *"who is overloaded?"* without asking around.

**The full requirement list lives in `HEART.md` §2. Do not re-derive requirements from memory — read them.**
The original brief is `README.md` (preserved verbatim) and mirrored at `docs/brief.md`.

**Budget:** ~12 hours, ~2h/day across a week, six sessions. Plan in `HEART.md` §6.

---

## 2. Stack (locked — do not change without logging a decision)

- **Next.js (App Router) + TypeScript** — one deployable unit, `src/` directory, `@/*` import alias.
- **Neon** serverless Postgres.
- **Drizzle ORM** + `drizzle-kit` for schema and migrations (migrations are checked-in `.sql`).
- **Auth:** hand-rolled. `bcryptjs` password hashing + a signed JWT session in an **httpOnly, secure,
  sameSite=lax** cookie via `jose`. No NextAuth.
- **Zod** for request validation at every boundary.
- **Tailwind CSS** for styling.
- **Recharts** for the one chart (8-week completions).
- **Hosting:** Vercel (app) + Neon (database).

Rationale for each of these belongs in `docs/decisions.md` and the `SUBMISSION.md` stack table.

---

## 3. Directory layout (target)

```
/
├── README.md                 # project README (the brief moves to docs/brief.md)
├── CLAUDE.md                 # this file
├── HEART.md                  # the requirement spec + progress log
├── SUBMISSION.md             # the first file the reviewer opens
├── .env.local                # NEVER committed
├── .env.example              # committed, placeholder values only
├── drizzle.config.ts
├── drizzle/                  # generated SQL migrations — committed
├── docs/
│   ├── brief.md              # the original assignment, preserved
│   ├── architecture.md
│   ├── schema.md
│   ├── plan.md
│   ├── decisions.md
│   └── ai-prompts.md
└── src/
    ├── app/
    │   ├── (auth)/           # login, register — unauthenticated
    │   ├── (app)/            # everything behind a session
    │   │   ├── dashboard/
    │   │   ├── projects/
    │   │   ├── tasks/        # the global cross-project list
    │   │   ├── my-tasks/
    │   │   └── alerts/
    │   └── api/              # route handlers (REST-ish), all server-authorised
    ├── db/
    │   ├── index.ts          # Neon + Drizzle client
    │   ├── schema.ts         # single source of truth for tables
    │   └── seed.ts           # demo data
    ├── lib/
    │   ├── auth/             # hashing, sessions, getCurrentUser, requireRole
    │   ├── authz.ts          # can-this-user-do-this-thing predicates
    │   ├── task-status.ts    # ⚠️ THE single transition table — shared by server AND UI
    │   ├── activity.ts       # append-only timeline writer
    │   ├── queries/          # server-side list/filter/sort/paginate query builders
    │   └── validation/       # Zod schemas
    └── components/
```

---

## 4. Hard rules — the things that lose marks

### 4.1 Authorisation
1. **Every mutation re-derives the actor from the session cookie on the server.** Never trust a
   `userId` or `role` sent from the client. Not once, not "just for this internal call".
2. **Role checks live in the route handler / server action**, not only in the component that hides a
   button. Hiding the button is a *courtesy*; the 403 is the *feature*. (Goal 1.6 says this explicitly.)
3. **Every project-scoped read filters by membership** for members, in SQL. A member must not be able
   to fetch a project they're not on by guessing an ID. Test this with curl before ticking the box.
4. Managers: create/archive projects, change membership, delete tasks. Members: none of those.

### 4.2 The task state machine
5. **`src/lib/task-status.ts` is the only place transition rules exist.** The API imports it to
   validate; the UI imports it to decide which buttons to render. If you ever find yourself writing
   `status === 'in_progress' && ...` outside that file, stop.
6. **Rejections carry a human-readable reason**, returned to the client and shown to the user —
   e.g. *"Cannot move to Done: blocked by TASK-14 (In Progress)."* A bare 400 fails Goal 4.6.
7. **Blocked remembers where it came from.** `blocked_from_status` is written on entering Blocked and
   consumed on unblock. Never guess the return state.

### 4.3 Server-side work
8. **Filtering, sorting, searching and pagination happen in SQL.** The brief bans loading every task
   into the browser. The API returns one page plus a total count — never the full set.
9. **The dashboard is SQL aggregation**, not `rows.filter().length` in JavaScript.
10. **CSV export runs the same query builder as the list**, so the export always matches what's on screen.

### 4.4 The timeline
11. **Activity rows are append-only.** There is no update handler and no delete handler for them.
    Not for managers, not for the owner, not "just admin". Goal 9.6 is absolute.
12. **Every mutation writes its activity row inside the same transaction as the change.** A change
    without a timeline entry is a bug.
13. Field changes record **old value, new value, and who**. Assignment/unassignment are events too.
    Comments are rows in the same stream.

### 4.5 Alerts
14. A dismissal stores **the due date it was dismissed against**. Suppress the alert only while that
    stored date still equals the task's current due date. This is what makes "the alert comes back"
    fall out for free — no cron, no cleanup job. Do not implement it any other way.

### 4.6 Secrets and git
15. **Never commit `.env`, `.env.local`, a Neon connection string, a JWT secret, or a password.**
    `.env.example` holds placeholders only. Before every push: `git grep -nEi 'postgres://|neon\.tech|SECRET='`.
16. **Commit after every meaningful step**, with a message describing the step. A single squashed
    "initial commit" **scores zero** on git history (the brief says so in those words).
17. Commit the docs alongside the code they describe — the interleaving is the evidence they were
    written as we went.

### 4.7 Scope
18. **Ten goals first. Stretch goals never substitute for a goal.** "Doing 8 goals well beats doing
    10 goals badly."
19. **Do not add code we cannot explain on a call.** If a generated block isn't understood, rewrite it
    simpler rather than keep it.
20. Do not install a dependency to save five lines. Every package in `package.json` must be justifiable.

---

## 5. What NOT to do

- ❌ Do not squash, amend or rewrite history to make it look tidy. The mess is the evidence.
- ❌ Do not write the five `docs/*.md` files at the end from memory. Write them in the session they belong to.
- ❌ Do not fabricate `docs/ai-prompts.md`. Log prompts as they actually happen, including the bad ones.
- ❌ Do not duplicate the transition rules between client and server.
- ❌ Do not hard-delete a project or a task's history. Archive is a flag; timelines are permanent.
- ❌ Do not fail a whole bulk operation because one task was illegal. Per-task results are the requirement.
- ❌ Do not `SELECT *` a table into memory and filter in TypeScript.
- ❌ Do not add auth libraries, state managers, component libraries or a GraphQL layer "because it's nicer".
- ❌ Do not build stretch goals before all ten are solid.
- ❌ Do not leave TODO comments in the submitted code. Either do it or write it in `SUBMISSION.md` as a known gap.
- ❌ Do not touch the user's home-directory git repository at `/Users/shamidubey`. This project has its own repo.

---

## 6. Conventions

- **Naming:** `snake_case` in the database, `camelCase` in TypeScript. Drizzle maps between them.
- **IDs:** UUID primary keys generated by the database (`gen_random_uuid()`), plus a human-readable
  per-project task reference (`ACME-14`) derived from project key + a per-project sequence.
- **Timestamps:** `timestamptz`, always UTC in the database; format for display only at the edge.
  Every table gets `created_at`; mutable tables get `updated_at`.
- **Enums:** Postgres enums for `role`, `task_status`, `task_priority`, `activity_type` — the database
  is the constraint, so bad data cannot exist even if a bug ships.
- **Errors:** API handlers return `{ error: { code, message } }`. `message` is safe to show a user.
- **Validation:** one Zod schema per endpoint, parsed at the top of the handler. After the parse, the
  data is trusted; before it, nothing is.
- **Queries:** anything list-shaped goes in `src/lib/queries/` and takes a `viewer` argument so the
  visibility rule is applied in one place.
- **Components:** Server Components by default; `'use client'` only where there is interaction.

### Commit message style
```
<area>: <what changed>

feat(tasks): reject Done when a blocker is unfinished
fix(auth): re-check role on the server for project archive
docs(schema): record why blocked_from_status is a column, not derived
chore(db): add index on tasks(project_id, status, due_date)
```

---

## 7. Commands

```bash
npm run dev              # local dev server
npm run build            # production build — run before every deploy
npm run lint             # eslint
npx drizzle-kit generate # generate a migration from src/db/schema.ts
npx drizzle-kit migrate  # apply migrations to the database in DATABASE_URL
npm run db:seed          # populate demo data
```

### Environment variables
| Name | Purpose | Where |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | `.env.local`, Vercel project settings |
| `AUTH_SECRET` | JWT signing secret (32+ random bytes) | `.env.local`, Vercel project settings |

Both are placeholders in `.env.example`. Neither is ever committed with a real value.

---

## 8. Session ritual

**Start of a session**
1. Read `HEART.md` §2 (goals) and §6 (which session are we in).
2. Note the start time — `plan.md` asks for estimated vs actual.

**During**
3. Commit after each meaningful step, not at the end.
4. When a real choice is made with a real alternative → write it into `docs/decisions.md` immediately.
5. When a prompt is used → append it to `docs/ai-prompts.md` immediately, including bad output.

**End of a session**
6. Fill in that session's entry in `HEART.md` §7 (actual time, done, stuck on, cut, decisions).
7. Tick any newly-verified boxes in `HEART.md` §2 — only if verified against the real database.
8. Commit the docs. Push.

---

## 9. Current state

- **Session:** 1 (foundations) — in progress.
- **Repo:** initialised in this folder. *(The parent `/Users/shamidubey` is a separate, unrelated git
  repo — never commit this project into it.)*
- **Next up:** Neon project + `DATABASE_URL`, then `src/db/schema.ts` and the first migration.
