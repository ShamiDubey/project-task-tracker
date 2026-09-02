/**
 * The transition rules — Goal 4.
 *
 * Pure, so it needs neither a database nor a server. The last check is the one that matters most:
 * for every context, the set of moves the interface offers is exactly the set the server accepts.
 * That is the property the single shared module exists to guarantee, and it is the one that would
 * silently rot if the rules were ever written twice.
 */
import type { TaskStatus } from '../src/db/schema';
import { allowedTransitions, validateTransition, type TransitionContext } from '../src/lib/task-status';

let pass = 0;
let fail = 0;

const ctx = (
  status: TaskStatus,
  blockedFrom: TaskStatus | null = null,
  blockers: string[] = [],
): TransitionContext => ({
  status,
  blockedFromStatus: blockedFrom,
  unfinishedBlockers: blockers.map((ref) => ({ ref, title: 'blocker', status: 'in_progress' })),
});

function allow(label: string, c: TransitionContext, to: TaskStatus) {
  const r = validateTransition(c, to);
  if (r.ok) { pass++; console.log(`   ok   ${label}`); }
  else { fail++; console.log(`   FAIL ${label} — refused: ${r.reason}`); }
}

function refuse(label: string, c: TransitionContext, to: TaskStatus, mustSay: string) {
  const r = validateTransition(c, to);
  if (r.ok) { fail++; console.log(`   FAIL ${label} — was allowed`); return; }
  if (!r.reason.toLowerCase().includes(mustSay.toLowerCase())) {
    fail++;
    console.log(`   FAIL ${label}\n          reason lacked "${mustSay}"\n          got: ${r.reason}`);
    return;
  }
  pass++;
  console.log(`   ok   ${label}\n          ↳ ${r.reason}`);
}

console.log('\n4.1 — the forward path');
allow('Backlog to In Progress', ctx('backlog'), 'in_progress');
allow('In Progress to In Review', ctx('in_progress'), 'in_review');
allow('In Review to Done', ctx('in_review'), 'done');

console.log('\n4.6 — any other jump is refused, with a reason');
refuse('Backlog straight to Done', ctx('backlog'), 'done', 'cannot move straight to');
refuse('Backlog to In Review', ctx('backlog'), 'in_review', 'next step is In Progress');
refuse('In Progress to Done, skipping review', ctx('in_progress'), 'done', 'next step is In Review');

console.log('\n4.2 — Blocked is reachable only from In Progress or In Review');
allow('In Progress to Blocked', ctx('in_progress'), 'blocked');
allow('In Review to Blocked', ctx('in_review'), 'blocked');
refuse('Backlog to Blocked', ctx('backlog'), 'blocked', 'only be blocked from');
refuse('Done to Blocked', ctx('done'), 'blocked', 'only be blocked from');

console.log('\n4.3 — unblocking returns to the state it was blocked from');
allow('Blocked from In Progress returns there', ctx('blocked', 'in_progress'), 'in_progress');
allow('Blocked from In Review returns there', ctx('blocked', 'in_review'), 'in_review');
refuse('Blocked from In Progress cannot go to In Review', ctx('blocked', 'in_progress'), 'in_review', 'state it was blocked from');
refuse('Blocked cannot go straight to Done', ctx('blocked', 'in_review'), 'done', 'state it was blocked from');
refuse('Blocked cannot fall back to Backlog', ctx('blocked', 'in_progress'), 'backlog', 'state it was blocked from');

console.log('\n4.4 — a finished task can be reopened');
allow('Done reopens to In Progress', ctx('done'), 'in_progress');
refuse('Done does not reopen to In Review', ctx('done'), 'in_review', 'next step is In Progress');

console.log('\n4.5 — no Done while a blocker is unfinished');
refuse('one unfinished blocker, named', ctx('in_review', null, ['ACME-3']), 'done', 'blocked by ACME-3');
refuse('two blockers, both named', ctx('in_review', null, ['ACME-3', 'ACME-9']), 'done', 'ACME-3 (In Progress), ACME-9');
refuse('five blockers, list truncated', ctx('in_review', null, ['A-1', 'A-2', 'A-3', 'A-4', 'A-5']), 'done', 'and 2 more');
refuse('singular wording for one', ctx('in_review', null, ['A-1']), 'done', 'Finish it first');
refuse('plural wording for several', ctx('in_review', null, ['A-1', 'A-2']), 'done', 'Finish them first');
allow('Done once the blockers are finished', ctx('in_review'), 'done');

console.log('\n4.7 — the interface offers exactly the legal moves');
const cases: [string, TransitionContext, TaskStatus[]][] = [
  ['Backlog', ctx('backlog'), ['in_progress']],
  ['In Progress', ctx('in_progress'), ['in_review', 'blocked']],
  ['In Review, nothing blocking', ctx('in_review'), ['blocked', 'done']],
  ['In Review, blocked by unfinished work', ctx('in_review', null, ['ACME-3']), ['blocked']],
  ['Blocked from In Progress', ctx('blocked', 'in_progress'), ['in_progress']],
  ['Blocked from In Review', ctx('blocked', 'in_review'), ['in_review']],
  ['Done', ctx('done'), ['in_progress']],
];
for (const [label, c, expected] of cases) {
  const got = allowedTransitions(c).slice().sort();
  const want = expected.slice().sort();
  if (JSON.stringify(got) === JSON.stringify(want)) {
    pass++;
    console.log(`   ok   ${label} offers [${got.join(', ') || 'nothing'}]`);
  } else {
    fail++;
    console.log(`   FAIL ${label} offered [${got.join(', ')}], expected [${want.join(', ')}]`);
  }
}

console.log('\nThe property that matters: the buttons and the server never disagree');
const every: TaskStatus[] = ['backlog', 'in_progress', 'in_review', 'blocked', 'done'];
let drift = 0;
for (const [, c] of cases) {
  for (const to of every) {
    if (allowedTransitions(c).includes(to) !== validateTransition(c, to).ok) drift++;
  }
}
if (drift === 0) { pass++; console.log('   ok   no disagreement across every context and target'); }
else { fail++; console.log(`   FAIL ${drift} disagreements`); }

console.log(`\n${'='.repeat(64)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(64)}`);
process.exit(fail ? 1 : 0);
