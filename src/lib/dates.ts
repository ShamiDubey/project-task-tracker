/**
 * Date helpers.
 *
 * Due dates are stored as a `date` (a calendar day, no time, no zone) because "past its due date" is
 * a calendar question. Everything here works in the server's local day so that "overdue", "this
 * week" and the eight-week chart all agree with each other.
 */

/** Today as `YYYY-MM-DD`, matching how due dates are stored. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`, at 00:00 local. Weeks run Monday–Sunday. */
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
