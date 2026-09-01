import { Avatar } from '@/components/ui';
import { longDateTime, shortDate } from '@/lib/dates';
import { STATUS_LABELS } from '@/lib/task-status';
import type { TaskStatus } from '@/db/schema';

type Entry = {
  id: string;
  type: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  body: string | null;
  createdAt: Date;
  actorName: string | null;
  subjectName: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  status: 'status',
  title: 'title',
  description: 'description',
  priority: 'priority',
  due_date: 'due date',
};

function renderValue(field: string | null, value: string | null): string {
  if (value === null || value === '') return 'empty';
  if (field === 'status') return STATUS_LABELS[value as TaskStatus] ?? value;
  if (field === 'due_date') return shortDate(value);
  if (field === 'description' && value.length > 60) return `${value.slice(0, 60)}…`;
  return value;
}

function describe(entry: Entry): string {
  switch (entry.type) {
    case 'created':
      return 'created this task';
    case 'assigned':
      return `assigned ${entry.subjectName ?? 'someone'}`;
    case 'unassigned':
      return `unassigned ${entry.subjectName ?? 'someone'}`;
    case 'dependency_added':
      return `added ${entry.newValue ?? 'a task'} as a blocker`;
    case 'dependency_removed':
      return `removed ${entry.newValue ?? 'a task'} as a blocker`;
    case 'field_changed':
      return `changed ${FIELD_LABELS[entry.field ?? ''] ?? entry.field} from “${renderValue(
        entry.field,
        entry.oldValue,
      )}” to “${renderValue(entry.field, entry.newValue)}”`;
    default:
      return 'made a change';
  }
}

/**
 * Goal 9 — the whole history in one stream, comments included.
 *
 * There is deliberately no edit control and no delete control on anything here, for anyone. Goal 9.6
 * makes the timeline permanent even for managers, and the way that is guaranteed is that no code
 * path to change these rows exists at all.
 */
export function Timeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="px-4 py-6 text-sm text-ink-muted">Nothing recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-0 px-4 py-3">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
          {index < entries.length - 1 && (
            <span aria-hidden className="absolute left-[13px] top-7 h-full w-px bg-line" />
          )}
          <span className="relative z-10">
            <Avatar name={entry.actorName ?? 'Unknown'} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            {entry.type === 'commented' ? (
              <>
                <p className="text-xs text-ink-muted">
                  <span className="font-medium text-ink">{entry.actorName ?? 'Someone'}</span>{' '}
                  commented · {longDateTime(entry.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm text-ink">
                  {entry.body}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-muted">
                <span className="font-medium text-ink">{entry.actorName ?? 'Someone'}</span>{' '}
                {describe(entry)} · {longDateTime(entry.createdAt)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
