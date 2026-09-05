# AI prompts

I leaned on AI a lot for this — Claude, in a CLI that edits files in the repo directly instead of
handing back snippets. So my prompts were mostly "build X, follow rule Y" or "check whether Z actually
works," and I corrected things by telling it what was wrong rather than editing by hand.

The brief wants at least one prompt that went wrong. There are a few. The interesting ones aren't when
it wrote bad code — they're when it wrote a **test that passed while checking nothing**. That's worse,
and it took me longer to notice.

Here are the ones that mattered, roughly in order.

---

### Reading the brief first

> Read all the docs and turn the ten goals into numbered acceptance criteria I can build against.

Best half-hour I spent. Pulling the rules *inside* each goal out from the headline is what caught three
schema decisions early — a task needing to remember where it was blocked from (4.3), a dismissal
storing a due date instead of a boolean (10.4), and the activity table needing no update path at all
(9.6). I didn't fix anything here; I just read the list back against the brief to make sure nothing was
invented. Two items are my own reading and I flagged them: which state a reopened task lands in, and
whether the CSV export is capped.

### Setting up the project

> Set up the project in Next.js.

Two catches. The git root was wrong — the folder was inside an unrelated repo with my whole Desktop
staged, so committing there would've made the exact single-commit history the brief says scores zero.
Caught it before the first commit. And the scaffold pulled Next 16, whose own file warns "this is NOT
the Next.js you know" — I kept it but made a note to read the docs rather than guess.

### The schema

> Push a rule into Postgres wherever it can hold one. I want the same-project and membership rules to
> be impossible, not just validated.

This gave me the composite-foreign-key trick that's the best thing in the repo. The one thing I added:
I asked it to *prove* the constraints work by attempting every illegal write against the real database.
20 of them now, all refused. A constraint you've never seen fail isn't a constraint.

### The test that tested nothing

> Write tests for the transition rules, including "no Done while a blocker is unfinished."

All green. But the two cases I cared about were checking nothing — the helper took four arguments and
the call passed three, so the expected *message* was being used as the target *status*. The move got
refused for the wrong reason and the message check silently skipped. I only caught it by reading the
printed reasons instead of the pass count: one said "cannot move to In Review to *undefined*," which
the product should never say. Now every rejection test asserts on the reason text.

### "Have you tested everything?"

It said yes — 122 passing checks. None of them had ever done a **write through the app**. All GETs and
direct SQL. Every server action was unverified for two days behind a green suite. So I drove a real
browser through the write paths, and within ten minutes it found two real bugs (a useless error
message on a duplicate key, a mobile layout that overflowed) plus four of my own broken tests. Green is
worse than red — it stops you looking.

### The design

> This looks AI-generated, there's no point of view.

Fair. The first pass was a competent Linear knock-off. I overrode one thing it and I both drifted
toward: I was asked for a 3D scene and didn't build one — a WebGL login page on an internal tool says
nothing about the product and reads as not knowing what matters. And feedback overrode *me*, correctly,
when I'd added gradients that followed the cursor: they looked like a blob chasing the mouse and stole
the one colour that's supposed to mean something.

### Performance

> Is there any lag?

My first measurements were off the dev server, which is meaningless. On the production build the
numbers even got *worse* after an optimisation — that was network noise, since the database is 8,000km
away. Measuring in database round trips instead of milliseconds made it clear: the shell was doing two
extra queries per page for a feature most pages don't use, and the task page was fetching the same task
three times. That dig also turned up a real bug — "overdue" was computed in the server's timezone, so
it meant different things in different regions.

---

**What I'd tell anyone doing this with AI:** the code is rarely the problem, the tests are. A green
suite feels like proof, and a wrong one is worse than none — I hit the same failure (asserting on text
the thing under test already contained) twice. Read what a test *prints*, not what it *counts*. And it
won't volunteer what it hasn't done: nothing in 122 green checks said "no write has ever run through
the app." I had to ask.
