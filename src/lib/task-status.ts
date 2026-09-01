/**
 * THE TASK LIFECYCLE — Goal 4.
 *
 * This module is the only place in the codebase where transition rules exist. The server imports it
 * to reject illegal moves; the interface imports the same function to decide which buttons to
 * render. That is deliberate: Goal 4 asks the server to reject any illegal jump *with a message
 * explaining why*, and asks the interface to *only offer the moves that are currently legal*. If
 * those were two implementations they would drift — most obviously at the two hard edges, where
 * legality depends on `blockedFromStatus` and on the state of other rows entirely.
 *
 * Deriving the buttons from the same function that does the rejecting makes disagreement impossible
 * by construction, and gives every "why" message exactly one author.
 *
 * Safe to import from client components: no database access, no server-only imports.
 */
import type { TaskStatus } from '@/db/schema';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  in_review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
};

export const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'in_progress',
  'in_review',
  'blocked',
  'done',
];

/** Statuses that count as "open" — everything that is not finished. */
export const OPEN_STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'in_review', 'blocked'];

/**
 * The base transition table, before the dependency rule is applied.
 *
 * The brief enumerates the legal moves: forward along Backlog → In Progress → In Review → Done,
 * Blocked from either In Progress or In Review, unblocking back to wherever it came from, and
 * reopening a finished task. It then says "any other jump ... must be rejected".
 *
 * I read that strictly: only the enumerated moves are legal. In particular there is no In Review →
 * In Progress step backwards, because the brief does not describe one and "any other jump must be
 * rejected" is the governing sentence. A real tracker would probably want backward steps; adding
 * them here would have meant inventing rules the brief did not ask for, and the interface would then
 * offer moves that the specification does not sanction.
 *
 * `blocked` is absent from this table because its single legal move is computed — it returns to
 * whichever status it was blocked from, which is stored on the task itself.
 */
const BASE_TRANSITIONS: Record<Exclude<TaskStatus, 'blocked'>, TaskStatus[]> = {
  backlog: ['in_progress'],
  in_progress: ['in_review', 'blocked'],
  in_review: ['done', 'blocked'],
  // Goal 4.4: "a finished task can be reopened". The brief does not say to which state. In Progress
  // is the choice: someone reopening a task is saying there is more work to do, which is what In
  // Progress means. Backlog would be the alternative and would discard the fact that it was worked
  // on; it also reads as demotion rather than reopening.
  done: ['in_progress'],
};

/** A blocker that is standing in the way of Done, described well enough to name in an error. */
export type BlockerRef = {
  ref: string; // human reference, e.g. "ACME-14"
  title: string;
  status: TaskStatus;
};

/**
 * Everything `validateTransition` needs. Assembled by the caller — the server loads the real
 * blockers from the database; a client component is handed the same shape by its server parent.
 */
export type TransitionContext = {
  status: TaskStatus;
  blockedFromStatus: TaskStatus | null;
  /** Blockers of this task that are not yet Done. Empty when there are none. */
  unfinishedBlockers: BlockerRef[];
};

export type TransitionResult = { ok: true } | { ok: false; reason: string };

function formatBlockers(blockers: BlockerRef[]): string {
  return blockers
    .slice(0, 3)
    .map((b) => `${b.ref} (${STATUS_LABELS[b.status]})`)
    .join(', ')
    .concat(blockers.length > 3 ? `, and ${blockers.length - 3} more` : '');
}

/**
 * Is this move legal right now? Returns a reason a human can read when it is not — Goal 4.6 asks for
 * "a message explaining why", not a bare rejection.
 */
export function validateTransition(ctx: TransitionContext, to: TaskStatus): TransitionResult {
  const from = ctx.status;

  if (from === to) {
    return { ok: false, reason: `This task is already ${STATUS_LABELS[to]}.` };
  }

  // Goal 4.3 — unblocking returns the task to the state it was blocked from, and nowhere else.
  if (from === 'blocked') {
    if (!ctx.blockedFromStatus) {
      // Unreachable: a database check constraint makes a Blocked task without this impossible.
      return { ok: false, reason: 'This task is blocked but has no recorded previous state.' };
    }
    if (to !== ctx.blockedFromStatus) {
      return {
        ok: false,
        reason: `A blocked task can only return to ${STATUS_LABELS[ctx.blockedFromStatus]}, the state it was blocked from.`,
      };
    }
    return { ok: true };
  }

  // Goal 4.2 — Blocked is reachable only from In Progress or In Review.
  if (to === 'blocked' && from !== 'in_progress' && from !== 'in_review') {
    return {
      ok: false,
      reason: `A task can only be blocked from ${STATUS_LABELS.in_progress} or ${STATUS_LABELS.in_review}, not from ${STATUS_LABELS[from]}.`,
    };
  }

  const allowed = BASE_TRANSITIONS[from as Exclude<TaskStatus, 'blocked'>] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `${STATUS_LABELS[from]} cannot move straight to ${STATUS_LABELS[to]}. The next step is ${allowed.map((s) => STATUS_LABELS[s]).join(' or ')}.`,
    };
  }

  // Goal 4.5 — a task with an unfinished blocking task cannot move to Done.
  if (to === 'done' && ctx.unfinishedBlockers.length > 0) {
    const list = formatBlockers(ctx.unfinishedBlockers);
    return {
      ok: false,
      reason: `Cannot move to Done: blocked by ${list}. Finish ${ctx.unfinishedBlockers.length === 1 ? 'it' : 'them'} first.`,
    };
  }

  return { ok: true };
}

/**
 * Goal 4.7 — the moves the interface is allowed to offer right now.
 *
 * Derived by asking `validateTransition` about every status, so a button can only appear if the
 * server would actually accept the move. A task that is blocked by unfinished work simply does not
 * get a Done button, rather than getting one that errors when clicked.
 */
export function allowedTransitions(ctx: TransitionContext): TaskStatus[] {
  return STATUS_ORDER.filter((to) => validateTransition(ctx, to).ok);
}

/** Human reference for a task, e.g. "ACME-14". */
export function taskRef(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}
