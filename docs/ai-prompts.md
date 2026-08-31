# AI prompts

I used AI heavily on this build — Claude, in an agentic CLI that could read and write files in the
repo directly. This log is written **as the prompts happen**, in order, grouped by what I was trying
to achieve. Where output was wrong, the wrong output and the correction are recorded rather than
quietly dropped.

A note on how I worked, since it affects how these read: because the tool edits files rather than
returning snippets to paste, my prompts are usually goal-shaped ("build X, obeying rule Y") and the
correction usually happened as a follow-up instruction rather than as me rewriting code by hand. Where
I rejected or rewrote what came back, I say so.

---

## Session 1 — Understanding the brief and setting up

### Prompt 1 — Extract the requirements before writing any code

> Read all the files here — README.md, SUBMISSION.md, and docs/architecture.md, schema.md, plan.md,
> ai-prompts.md, decisions.md. Then create a CLAUDE.md and a HEART.md holding every detail, including
> the minute ones, from those files. We are building in Next.js with Neon for the database, over about
> 12 hours spread across a week at roughly two hours a day. Set the project up first.

**What I got:** Two files. `HEART.md` broke the ten goals into individually numbered acceptance
criteria and — the part I actually wanted — separated the *rules stated inside* each goal from the
headline. The brief warns explicitly that those inner rules ("what happens on an illegal move, what a
bulk action must report back, when a dismissed alert is allowed to reappear") *"are the actual ask,
not just the bold headline in front of them"*, and three of them turned out to have schema
consequences I would otherwise have discovered in session 5:

- Goal 4.3 "unblocking returns it to the state it was blocked from" → a task needs to remember where
  it was blocked from.
- Goal 10.4 "if that task's due date later changes, the alert comes back" → a dismissal has to be
  stored against a due date, not as a boolean.
- Goal 9.6 "nothing in the timeline can be edited or deleted after the fact, including by managers"
  → the activity table needs no update or delete path at all.

`CLAUDE.md` was the working-rules half: stack, conventions, and a "what not to do" list.

**What I corrected:** Nothing yet in the content — but I want to be honest that this was the cheap
part. Extracting requirements is the thing language models are reliably good at. The value was in
deciding to spend the first half-hour on it rather than on scaffolding, and the check that mattered
was reading `HEART.md` §2 back against the brief line by line to confirm nothing had been invented
or silently dropped. Two items in the atomised list are *my* interpretation, not the brief's words,
and are flagged as such: Goal 4.4 does not say which state a reopened task lands in (I chose
In Progress), and Goal 7.6 does not say whether a CSV export is capped (I intend to cap it and say so).

### Prompt 2 — Project setup

> Set up the project in Next.js.

**What I got:** `create-next-app` with the App Router, TypeScript, Tailwind and a `src/` directory,
plus the dependency set for the stack I had already chosen — Drizzle, the Neon serverless driver,
bcryptjs, jose, Zod, Recharts — a `drizzle.config.ts`, a `.env.example`, a project README, and the
repository initialised with the setup split across four commits rather than one.

**What I corrected:** Two things.

1. **The git root was wrong.** The folder was sitting inside an unrelated repository at
   `~` — `git rev-parse --show-toplevel` returned my home directory, with my whole Desktop staged in
   it. Committing there would have produced exactly the "single initial commit" history the brief
   says scores zero, in a repo I could never make public. Caught before the first commit; the fix was
   to initialise a repo in the project folder itself. Worth recording because it is the kind of
   environment problem that a coding tool will happily build on top of without noticing.
2. **The scaffold pulled Next.js 16**, whose own generated `AGENTS.md` opens with "This is NOT the
   Next.js you know — this version has breaking changes." I considered pinning back to 15, since the
   brief warns that time spent learning something new to impress is time not spent on the goals. I
   kept 16 on the grounds that the App Router surface I actually need here (server components, route
   handlers, cookies, `middleware`) is stable across the two, and noted that if I hit an unfamiliar
   breaking change I should read the bundled docs rather than guess — guessing at an API is the
   failure mode that produces code I cannot explain.

---

_Appended to as each session happens._
