# AI prompts

I leaned on AI a lot for this project, mainly using Claude through the CLI because it could inspect the repository and edit files directly. Most of my prompts were short and focused on a particular task. I would let it implement something, check the result myself, and then go back with corrections when something was wrong.

## Reading the brief first

### Prompt

> Read all the docs and turn the ten goals into numbered acceptance criteria I can build against.
>
> Include the detailed rules inside each goal, not just the main requirement. Do not invent requirements. If something is ambiguous, flag it separately instead of making a decision silently.
>
> Do not change any code yet. I want to use the acceptance criteria as the checklist for implementation and testing.

### What I got

It turned the ten goals into a more detailed checklist and pulled out a few rules that were easy to miss from the main descriptions.

Three useful ones were that a task needs to remember the state it was blocked from, a dismissal needs to be tied to a due date rather than just being a boolean, and the activity table should not have an update path.

It also flagged two things that were not completely clear in the brief: what state a reopened task should return to and whether the CSV export should have a cap.

### What I corrected

I went back through the original brief and separated the explicit requirements from my own interpretation. I kept the two ambiguous points documented rather than treating them as requirements.

## Setting up the project

### Prompt

> Set up the project in Next.js.
>
> Before doing anything, check the current directory and git root. I do not want the project accidentally created inside an unrelated repository.
>
> After the setup, show me the important files and versions that were created so I can check them before we continue.

### What I got

The project was scaffolded with Next.js, but while checking the git setup I noticed that the folder was inside an unrelated repository where my whole Desktop was being tracked.

The scaffold also pulled in Next 16, which had a warning about the changes from older Next.js versions.

### What I corrected

I fixed the repository location before making the first commit. Otherwise the git history for the assignment would have been wrong.

I kept Next 16, but checked its documentation and the generated warnings rather than changing the version just because it was unfamiliar.

## Designing the database

### Prompt

> Design the PostgreSQL schema from the acceptance criteria.
>
> Find all the rules that can be enforced at the database level instead of relying only on application validation.
>
> In particular, make project boundaries impossible to violate. A task should not be able to reference a member from another project even if someone bypasses the application and writes directly to the database.
>
> Look at composite foreign keys, unique constraints and check constraints where they make sense.
>
> After implementing the migrations, write tests that attempt the important illegal writes against a real PostgreSQL database. I want the tests to prove that PostgreSQL rejects them, not just that application validation catches them.

### What I got

The most useful part was the use of composite foreign keys for the project and membership relationships. This allowed PostgreSQL itself to reject certain cross-project relationships.

Other straightforward data rules were handled with unique and check constraints, while more complicated business rules stayed in application code.

### What I corrected

I did not treat the presence of a constraint as proof that it worked.

I added tests that actually attempted invalid writes against PostgreSQL. This resulted in 20 database constraint cases covering the important illegal writes.

## Implementing the task transitions

### Prompt

> Implement the task state transitions from the brief as explicit transition rules.
>
> The task can move through Backlog, In Progress, In Review and Done, with Blocked possible from the appropriate working states.
>
> When a blocked task is unblocked, it needs to return to the state it was in before being blocked.
>
> A task cannot move to Done while any blocker is unfinished. Invalid transitions should be rejected by the server with a useful reason.
>
> Keep the transition logic in one place so it can be tested independently. The UI should also only expose transitions that are actually valid.

### What I got

Claude implemented the transition logic and the server-side checks around it.

The transition rules were kept together, which made it easier to test individual cases instead of testing everything through the UI.

### What I corrected

I checked the transition behavior against the acceptance criteria rather than assuming the generated implementation covered every case.

I also made the rejection tests check the actual reason returned by the server, since checking only that a transition failed was not enough.

## Writing the transition tests

### Prompt

> Write tests for the task transition rules.
>
> Cover all valid and invalid transitions, including the rule that a task cannot move to Done while a blocker is unfinished.
>
> For every rejected transition, assert both that the transition is rejected and that the returned reason is correct.
>
> Include cases for blocked tasks and reopening tasks.

### What I got

The tests were green, but two of the cases were wrong.

The transition helper expected four arguments, while the generated test passed three. This meant the expected error message was being passed as the target status.

The transition was still rejected, so the test passed, but it was being rejected for the wrong reason.

### What I corrected

I noticed the problem by reading the actual printed rejection reasons instead of only looking at the test count. One result was effectively saying that a task could not move to In Review to `undefined`.

I fixed the argument order and changed the rejection tests so that every case checks the actual reason returned by the transition function.

## Checking what the tests actually covered

### Prompt

> Review the existing test suite and tell me what it actually exercises.
>
> Do not assume that the number of passing tests means the application is fully tested.
>
> Separate direct database tests, server-side tests, GET requests and actual application write flows.
>
> I specifically want to know whether a real user action has been tested from the browser through the server and into the database.

### What I got

The test suite reported 122 passing checks, but the review showed that none of the important write operations had been exercised through the actual application.

There were direct SQL tests and server-side tests, but no real browser-to-database write flow.

### What I corrected

I stopped treating the passing test count as sufficient evidence and started testing the write paths through the running application.

That found two actual bugs fairly quickly. One was an unhelpful error message for a duplicate key. The other was a mobile layout that overflowed.

It also exposed four tests that were passing without checking the behavior I originally thought they were checking.

## Testing through the browser

### Prompt

> Test the running application as a real user instead of relying only on the existing automated tests.
>
> Go through the main write flows and try both normal and invalid actions.
>
> Check task creation, editing, assignment, state changes, duplicate submissions, invalid transitions and mobile layouts.
>
> For every problem you find, give me the reproduction steps and likely cause before changing anything.

### What I got

The browser testing exposed issues that were not visible in the existing test suite.

The duplicate submission produced a poor error message instead of useful feedback, and the layout overflowed at smaller widths.

### What I corrected

I fixed the error handling so the duplicate case produced a useful message.

I also fixed the mobile layout and repeated the browser checks after the changes rather than assuming the fixes were correct because the code compiled.

## Reviewing the design

### Prompt

> Review the current interface as a product, not just as a frontend implementation.
>
> Tell me where it feels generic or like a copy of another productivity tool. Look at hierarchy, spacing, typography, information density, navigation, color usage and the relationship between different screens.
>
> Do not add gradients, animations, 3D or other effects just to make it look impressive. Any visual element should have a reason to exist.
>
> I want the interface to have its own point of view while still being practical for a task management tool.

### What I got

The first version was functional and polished, but it looked too much like a generic Linear-style task manager.

There was also a tendency to add more visual effects because the brief mentioned a 3D element.

### What I corrected

I decided not to put a WebGL experience into the login page just because it was technically possible. It did not add anything useful to the product and would have made the screen feel more like a demo than part of an internal tool.

I also removed some cursor-following gradients. They looked interesting at first but ended up distracting from the interface.

The final design was kept more restrained, with the focus on hierarchy, readability and the actual task workflow.

## Checking performance

### Prompt

> Audit the application's performance using a production build, not the development server.
>
> Do not rely only on page-load milliseconds because the database is remote and network latency can affect those numbers.
>
> Look for unnecessary database round trips, duplicate queries, repeated data fetching and unnecessary server requests.
>
> For every optimization, explain what was happening before, why it was unnecessary, what you changed and how you verified the result.
>
> Make sure the optimization does not change the application behavior.

### What I got

The first measurements were not very useful because they were affected by network latency. One of the measurements even became worse after an optimization.

Looking at database round trips instead made the actual problem clearer. The application shell was making two extra queries on pages that did not use the related feature, and the task page was fetching the same task three times.

### What I corrected

I removed the unnecessary queries and consolidated the repeated task fetch.

During this investigation I also found another issue with overdue tasks. The calculation was using the server's timezone, so the same task could be considered overdue differently depending on where the server was running.

## Checking timezone handling

### Prompt

> Audit all date and overdue calculations in the application.
>
> Do not assume the server timezone is the user's timezone.
>
> Check due dates, overdue status, task completion dates and date comparisons.
>
> Look specifically for logic that can behave differently around midnight or when the application is running in a different timezone.
>
> If the result depends on server-local time, fix it and add a test that would catch the problem again.

### What I got

The audit found that overdue status was being calculated using the server's local timezone.

### What I corrected

I changed the calculation so that overdue status was not dependent on the timezone of the machine running the application.

I also added coverage for the date comparison so the same issue would be easier to catch if the logic changed later.

## Final audit

### Prompt

> Re-read the original brief and audit the finished project against all ten goals.
>
> Do not mark a requirement complete just because there is code for it or because a test is green.
>
> For every requirement, identify the evidence that it works. This can be a database constraint, automated test, integration test, browser test or manual verification.
>
> Explicitly list anything that is implemented but not properly verified, anything tested only through mocks or direct SQL, and anything that still has an ambiguity or risk.

### What I got

It produced a final checklist mapping the requirements to the implementation and tests.

It also separated the areas that had proper automated coverage from those that still needed browser or manual verification.

### What I corrected

I used the checklist as a final review rather than treating Claude's assessment as proof that the project was complete.

The main thing I wanted to avoid was repeating the earlier mistake of equating a green test suite with a verified application. I checked the important flows through the actual running application and used the original brief as the final source of truth.
