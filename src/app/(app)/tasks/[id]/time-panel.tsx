'use client';

import { useState, useTransition } from 'react';

import { logTime, type ActionState } from '@/app/actions/tasks';
import { Button, Notice, cx, fieldClass } from '@/components/ui';
import { shortDate, todayISO } from '@/lib/dates';

type Entry = {
  id: string;
  minutes: number;
  spentOn: string;
  note: string;
  userName: string | null;
};

/** "90" → "1h 30m". */
function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function TimePanel({
  taskId,
  entries,
  total,
  canWrite,
}: {
  taskId: string;
  entries: Entry[];
  total: number;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<ActionState>(undefined);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [spentOn, setSpentOn] = useState(todayISO());
  const [note, setNote] = useState('');

  const submit = () => {
    const n = Number(minutes);
    startTransition(async () => {
      const result = await logTime(taskId, n, spentOn, note);
      setMsg(result);
      if (result?.ok) {
        setMinutes('');
        setNote('');
        setOpen(false);
      }
    });
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums text-ink">{fmt(total)}</span>
        {canWrite && !open && (
          <Button tone="secondary" size="sm" onClick={() => setOpen(true)}>
            Log time
          </Button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-2">
        {entries.length === 0 ? 'No time logged yet.' : `across ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      </p>

      {open && (
        <div className="mt-3 space-y-2.5 rounded-lg border border-line p-3">
          {msg?.error && <Notice>{msg.error}</Notice>}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-2xs font-medium text-ink">Minutes</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g. 90"
                className={cx(fieldClass, 'py-1.5 text-sm')}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs font-medium text-ink">Date</span>
              <input
                type="date"
                value={spentOn}
                max={todayISO()}
                onChange={(e) => setSpentOn(e.target.value)}
                className={cx(fieldClass, 'py-1.5 text-sm')}
              />
            </label>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on? (optional)"
            className={cx(fieldClass, 'py-1.5 text-sm')}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || !minutes} onClick={submit}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button tone="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {entries.slice(0, 6).map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 text-xs">
              <span className="w-12 shrink-0 font-medium tabular-nums text-ink">{fmt(e.minutes)}</span>
              <span className="min-w-0 flex-1 truncate text-ink-2">
                {e.userName ?? 'Someone'}
                {e.note && <span className="text-ink-3"> · {e.note}</span>}
              </span>
              <span className="shrink-0 text-2xs text-ink-3">{shortDate(e.spentOn)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
