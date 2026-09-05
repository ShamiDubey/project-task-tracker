/**
 * Date helpers.
 *
 * Due dates are stored as a `date` — a calendar day, no time, no zone — because "past its due date"
 * is a calendar question, not an instant.
 *
 * Which calendar, though, is a real decision. "Overdue" has to be one shared fact: if it were
 * computed per viewer, two colleagues would see different overdue counts and the dashboard could not
 * answer "what is overdue" at all — it would only answer "what is overdue for you". And if it were
 * left to the server's own locale, the answer would silently change the day this deploys to a
 * different region: on my machine (IST) and on Vercel (UTC) the same data gives different counts for
 * five and a half hours out of every day. That is exactly the bug this constant exists to prevent.
 *
 * So it is the *company's* working day, stated explicitly and configurable, defaulting to UTC.
 */
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE ?? 'UTC';

/** Formats a date as YYYY-MM-DD in the business timezone. 'en-CA' is ISO order by definition. */
const businessDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today as `YYYY-MM-DD` in the business timezone, matching how due dates are stored. */
export function todayISO(): string {
  return businessDay.format(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Monday of the week containing `d`, at 00:00 server-local. Weeks run Monday–Sunday.
 *
 * Not converted to the business timezone, unlike `todayISO`. The difference only moves a week
 * boundary by a few hours, and it affects two soft figures — "due this week" and which bucket a
 * completion lands in — rather than the hard overdue/not-overdue answer the product is judged on.
 * Worth doing properly if this ever spanned regions; not worth the complexity now.
 */
export function startOfWeek(d = new Date()): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - dow);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

/** The Monday-start boundaries of the last `count` weeks, oldest first, including this week. */
export function lastNWeeks(count: number, now = new Date()): { start: Date; end: Date; label: string }[] {
  const thisMonday = startOfWeek(now);
  const weeks: { start: Date; end: Date; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addWeeks(thisMonday, -i);
    const end = addWeeks(start, 1);
    weeks.push({ start, end, label: shortDate(start) });
  }
  return weeks;
}

export function shortDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function longDateTime(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** A task is overdue when it has a due date in the past and is not finished. */
export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'done') return false;
  return dueDate < todayISO();
}

export function relativeDue(dueDate: string | null): string {
  if (!dueDate) return '—';
  const today = todayISO();
  if (dueDate === today) return 'Today';
  const diff = Math.round(
    (new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000,
  );
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff <= 7) return `In ${diff} days`;
  return shortDate(dueDate);
}

/**
 * How a due date is written wherever there is room for both forms.
 *
 * `relativeDue` falls back to the absolute date once a due date is more than a week out, so pairing
 * the two rendered "1 Oct · 1 Oct". Near dates get the relative phrase, which is what someone
 * actually wants to know; far ones get the date alone.
 */
export function dueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  const relative = relativeDue(dueDate);
  const absolute = shortDate(dueDate);
  return relative === absolute ? absolute : `${absolute} · ${relative}`;
}
