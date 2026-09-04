# AI prompts

I used AI heavily — Claude, in an agentic CLI that reads and writes files in the repository directly
rather than returning snippets to paste. That changes the shape of what follows: my prompts are
mostly goal-shaped ("build X, obeying rule Y", "check whether Z actually works"), and corrections
happened as follow-up instructions rather than as me editing code by hand. Where I rejected, reversed
or overrode what came back, I say so.

The brief asks for at least one prompt that produced something wrong. There are several, and the
most useful ones are not the times it wrote bad code — they are the times it wrote a **test that
passed while testing nothing**, which is a more dangerous failure and took longer to catch.

---

## 1. Understanding the brief before writing any code

### Prompt
> Read all the files here — README.md, SUBMISSION.md, and the docs stubs. Then write up every detail,
> including the minute ones, as working notes I can build against. We are building in Next.js with
> Neon, over about 12 hours across a week. Set the project up first.

**What I got.** The ten goals broken into individually numbered acceptance criteria, with the rules
stated *inside* each goal separated from its headline. That distinction turned out to be the single
most valuable thing in the project, because three of those inner rules have schema consequences:

- 4.3 *"unblocking returns it to the state it was blocked from"* → a task must remember where it came from
- 10.4 *"if that task's due date later changes, the alert comes back"* → a dismissal must store a due date, not a boolean
- 9.6 *"nothing can be edited or deleted, including by managers"* → the activity table needs no update path at all

**What I corrected.** Nothing in the content — extraction is what these tools are reliably good at.
The judgement was spending the first half hour on it instead of on scaffolding. What I did do was
read the atomised list back against the brief line by line to confirm nothing had been invented, and
flag the two items that are *my interpretation* rather than the brief's words: Goal 4.4 does not say
which state a reopened task lands in (I chose In Progress), and Goal 7.6 does not say whether a CSV
export is capped (I capped it and said so).

---

## 2. Project setup

### Prompt
> Set up the project in Next.js.

**What I got.** `create-next-app` with the App Router and TypeScript, the dependency set for the stack
I had already chosen, a Drizzle config, and the repo initialised with setup split across four commits.

**What I corrected.** Two things, and the first is the reason this entry exists.

**The git root was wrong.** The folder sat inside an unrelated repository — `git rev-parse
--show-toplevel` returned my home directory, with my whole Desktop staged in it. Committing there
would have produced exactly the single-commit history the brief says scores zero, in a repo I could
never make public. Caught before the first commit. Worth recording because it is the kind of
environment problem a coding tool will happily build on top of without noticing.

**The scaffold pulled Next.js 16**, whose own generated `AGENTS.md` opens with *"This is NOT the
Next.js you know."* I considered pinning back to 15, since the brief warns that time spent learning
something new to impress is time not spent on the goals. I kept 16 on the grounds that the surface I
needed is stable across the two, with a note to read the bundled docs rather than guess at an API.

---

## 3. Schema, and pushing rules into the database

### Prompt
> Write the schema. Push a rule into Postgres wherever Postgres can hold it — I want the same-project
> and membership rules to be impossible, not merely validated.

**What I got.** The composite-foreign-key design that I think is the best thing in the repository:
`task_dependencies` and `task_assignees` each carry a redundant `project_id`, and two composite
foreign keys must both be satisfied by that single column. A cross-project dependency becomes
unwritable, and removing someone from a project cascades away exactly the assignments they held *on
that project*.

**What I corrected.** I asked for proof rather than accepting it. Every constraint was tested by
attempting the illegal write against the real database — 17 cases, each printing the constraint name
that caught it. A constraint nobody has watched fire is not a constraint.

---

## 4. The prompt that produced something wrong — a test that tested nothing

### Prompt
> Write tests for the transition rules, including the rule that a task with an unfinished blocker
> cannot move to Done.

**What I got.** Thirty-odd cases, all green, including two for the Done-with-a-blocker rule.

**What was wrong.** The two most important cases were asserting nothing. The helper signature was
`reject(label, context, targetStatus, expectedMessage)` and the call passed only three arguments — so
the *expected message* was being used as the *target status*. `STATUS_LABELS['blocked by ACME-3']`
is `undefined`, the transition was refused for the wrong reason, and because `expectedMessage` was
then undefined the message check was skipped entirely. Both cases passed. Green, and worthless.

**How I caught it.** By reading the printed rejection reasons rather than the pass count. The output
said *"In Review cannot move straight to undefined"* — which is not a sentence the product should
ever produce. Re-run properly, the rule works and produces *"Cannot move to Done: blocked by ACME-3
(In Progress). Finish it first."*

**What I changed.** Every rejection test now asserts on the reason text, and the suite prints the
reason so a wrong one is visible rather than merely counted.

---

## 5. A second wrong one — passing tests hiding an unverified application

### Prompt
> Have you tested everything? Is it working correctly?

**What I got.** A confident summary of 122 passing checks.

**What was wrong.** Not one of those checks had ever performed a **mutation through the application**.
They were all `GET`s plus direct SQL. Every server action — create, edit, status move, assign,
comment, dependency, bulk, dismiss, archive, delete — was completely unverified, and had been for two
days behind a green suite.

**What I did.** Drove a real browser through every write path. Within minutes it found two genuine
bugs: a duplicate project key showed *"Something went wrong"* because Drizzle wraps the driver error
and puts the Postgres text on `cause`, so matching on `err.message` never saw the constraint name;
and the dashboard overflowed horizontally at 390px because grid children default to `min-width: auto`
and refuse to shrink below their content.

It also produced **four false failures that were the test's fault**, which are worth recording because
they are all realistic:

- `button[type="submit"]` matched the sidebar **Sign out** button — the first submit on every
  authenticated page. The suite was logging itself out and reporting that project creation was broken.
- Fixed `1800ms` sleeps were too short for a server action on the development server.
- One assertion looked for the text `"In Progress"` — which the button it had just clicked also
  contained. It passed while testing nothing. (The same failure mode as §4, found twice.)
- The suite mutated data and never reset, so it passed once and then failed on its own leftovers.

---

## 6. Design, and two things I overrode

### Prompts
> Act like a senior designer. This looks AI-generated, there's no creativity.

> There should be some 3D motion on scrolling, the login box comes in between.

**What I got.** First a competent but derivative Linear-style interface — the criticism was fair, it
had no point of view. Then, after pushing: a design system built on semantic tokens, a scroll-driven
3D sign-in scene, and motion throughout.

**What I overrode, and told the user I was overriding.** I was asked for a three.js scene and did not
build one. A WebGL scene on the login page of an internal delivery tracker costs several hundred
kilobytes to say nothing about the product, and on a brief that scores judgement it reads as not
knowing what matters. I built a 2D canvas instead that animates the product's own subject — work
moving through four lanes, dependency edges, and roughly one node in seven going red and stalling.
About a hundred lines, no dependency, 60fps on integrated graphics.

**What the user overrode in return, correctly.** An earlier pass painted accent-coloured radial
gradients following the cursor. The feedback was blunt and right: it read as a blob chasing the mouse,
and using the brand colour for it competed with the only colour in this interface that carries
meaning. Removed.

---

## 7. Performance, and measuring the right thing

### Prompt
> Is the webapp crashing anywhere? Is there any lag? Check everything nicely.

**What I got initially.** Timings from the development server, which are meaningless — dev-mode page
loads were five seconds.

**What I corrected.** Measured a production build instead. Then, on the first attempt, the numbers got
*worse* after an optimisation, which was noise: the database is 8,000km from this machine and
round-trip latency drifts more than the change I was measuring. Re-measured in **database round trips**
rather than milliseconds, sampling the round-trip cost alongside each page.

That made the picture legible: the app shell was issuing two queries on every page load to build a
command-palette index most page views never touch, and the task page was calling `getTask` three
times from three call sites. The task page went from 4.8 round trips to 2.4.

The same investigation surfaced a real latent bug: **"overdue" was computed with the server's own
locale**, so the same data gave different counts on my machine (IST) and against the database (UTC),
and deploying to another region would silently change what overdue meant. Now an explicit
`BUSINESS_TIMEZONE`.

---

## What I would tell someone using AI on a brief like this

The code it writes is rarely the problem. **The tests it writes are**, because a green suite feels
like evidence and a wrong one is worse than none — I hit the same failure mode twice, an assertion
matching text the thing under test also contained. Read what a test *prints*, not what it *counts*.

And it will not tell you what it has not done. Nothing in 122 passing checks announced that no
mutation had ever run through the application. That question had to be asked.
