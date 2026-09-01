# Project & Task Tracker

An internal tool for a services company running a dozen or so client projects at once. Managers set
up projects, decide who is on each one, and see the whole portfolio. Staff see what is theirs and
move it forward. Anyone can get a straight answer to **"what is overdue?"** and **"who is
overloaded?"** without asking around.

Built as a take-home submission — the original brief is preserved at [docs/brief.md](docs/brief.md).

> **Live URL and demo credentials:** see [SUBMISSION.md](SUBMISSION.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | Neon (serverless Postgres) |
| Data access | Drizzle ORM, checked-in SQL migrations |
| Auth | Hand-rolled — bcrypt password hashes, signed JWT session in an httpOnly cookie |
| Validation | Zod |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Hosting | Vercel (app) + Neon (database) |

Why each of these, and what was rejected, is in [docs/decisions.md](docs/decisions.md).

## Documentation

| File | What it covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | The moving pieces, where each runs, one request end to end, what was left out |
| [docs/schema.md](docs/schema.md) | Tables, relationships, where constraints live, what breaks at 100× |
| [docs/plan.md](docs/plan.md) | Session breakdown, build order, estimated vs actual, what was cut |
| [docs/decisions.md](docs/decisions.md) | The decisions that shaped the codebase, including one that was reversed |
| [docs/ai-prompts.md](docs/ai-prompts.md) | The prompts actually used, including one that produced something wrong |

## Running locally

Requires Node 20.9+ and a Neon database (the free tier is enough).

```bash
git clone <this repo>
cd takehome-01-project-task-tracker
npm install

cp .env.example .env
# Fill in DATABASE_URL from the Neon console and
# AUTH_SECRET from: openssl rand -base64 32

npm run db:migrate   # apply schema migrations
npm run db:seed      # load demo projects, people and tasks
npm run dev          # http://localhost:3000
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Drizzle Studio, for poking at the data |

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Session JWT signing secret, 32+ random bytes |

Neither is ever committed. `.env.example` holds placeholders only.
