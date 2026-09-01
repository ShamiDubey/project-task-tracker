'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button, cx, fieldClass } from '@/components/ui';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/task-status';

type Option = { id: string; name: string; key?: string };

/**
 * Every control here writes to the URL and lets the server re-render the list. Nothing filters in
 * the browser — Goal 6 is explicit that the server must do the work, and keeping the filters in the
 * query string is also what makes a filtered view shareable.
 */
export function TaskFilters({
  projects,
  assignees,
  total,
}: {
  projects: Option[];
  assignees: Option[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    startTransition(() => router.push(`/tasks?${next.toString()}`));
  };

  // Debounced search, so typing does not fire a query per keystroke.
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (q === current) return;
    const timer = setTimeout(() => set({ q: q || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const statuses = (params.get('status') ?? '').split(',').filter(Boolean);
  const priorities = (params.get('priority') ?? '').split(',').filter(Boolean);

  const toggle = (key: 'status' | 'priority', value: string) => {
    const list = key === 'status' ? statuses : priorities;
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    set({ [key]: next.join(',') || undefined });
  };

  const hasFilters =
    Boolean(params.get('q')) ||
    statuses.length > 0 ||
    priorities.length > 0 ||
    Boolean(params.get('project')) ||
    Boolean(params.get('assignee')) ||
    params.get('overdue') === '1' ||
    params.get('archived') === '1';

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles and descriptions…"
          className={`${fieldClass} max-w-xs flex-1`}
          aria-label="Search tasks"
        />

        <select
          value={params.get('project') ?? ''}
          onChange={(e) => set({ project: e.target.value || undefined })}
          className={`${fieldClass} w-auto`}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key} — {p.name}
            </option>
          ))}
        </select>

        <select
          value={params.get('assignee') ?? ''}
          onChange={(e) => set({ assignee: e.target.value || undefined })}
          className={`${fieldClass} w-auto`}
          aria-label="Filter by assignee"
        >
          <option value="">Anyone</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={`${params.get('sort') ?? 'updated_at'}:${params.get('dir') ?? 'desc'}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(':');
            set({ sort, dir });
          }}
          className={`${fieldClass} w-auto`}
          aria-label="Sort"
        >
          <option value="updated_at:desc">Recently updated</option>
          <option value="updated_at:asc">Least recently updated</option>
          <option value="due_date:asc">Due date, soonest first</option>
          <option value="due_date:desc">Due date, latest first</option>
          <option value="priority:desc">Priority, highest first</option>
          <option value="priority:asc">Priority, lowest first</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle('status', s)}
            className={cx(
              'rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition-colors',
              statuses.includes(s)
                ? 'bg-accent text-white ring-accent'
                : 'bg-surface text-ink-muted ring-line-strong hover:bg-slate-50',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-line" />

        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => toggle('priority', p)}
            className={cx(
              'rounded-full px-2.5 py-1 text-xs capitalize ring-1 ring-inset transition-colors',
              priorities.includes(p)
                ? 'bg-accent text-white ring-accent'
                : 'bg-surface text-ink-muted ring-line-strong hover:bg-slate-50',
            )}
          >
            {p}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-line" />

        <button
          type="button"
          onClick={() => set({ overdue: params.get('overdue') === '1' ? undefined : '1' })}
          className={cx(
            'rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition-colors',
            params.get('overdue') === '1'
              ? 'bg-danger text-white ring-danger'
              : 'bg-surface text-ink-muted ring-line-strong hover:bg-slate-50',
          )}
        >
          Overdue only
        </button>

        <button
          type="button"
          onClick={() => set({ archived: params.get('archived') === '1' ? undefined : '1' })}
          className={cx(
            'rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition-colors',
            params.get('archived') === '1'
              ? 'bg-ink text-white ring-ink'
              : 'bg-surface text-ink-muted ring-line-strong hover:bg-slate-50',
          )}
        >
          Include archived projects
        </button>

        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-ink-muted">
            {total} match{total === 1 ? '' : 'es'}
          </span>
          <a
            href={`/api/tasks/export?${params.toString()}`}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-inset ring-line-strong hover:bg-accent-soft"
          >
            Export CSV
          </a>
          {hasFilters && (
            <Button tone="ghost" size="sm" onClick={() => startTransition(() => router.push('/tasks'))}>
              Clear
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
