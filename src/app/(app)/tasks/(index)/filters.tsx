'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { IconClose, IconSearch } from '@/components/icons';
import { cx, fieldBase } from '@/components/ui';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/task-status';

type Option = { id: string; name: string; key?: string };

/**
 * The task list's controls.
 *
 * Every control writes to the URL and lets the server re-render. Nothing filters in the browser —
 * the server has to do the work, and keeping the filters in the query string also makes a filtered
 * view shareable and reload-safe.
 *
 * The layout is a deliberate two-tier arrangement rather than a stack of full-width boxes:
 * search and the three select controls on one line, sized to their content; toggles beneath,
 * grouped by what they filter, with active filters summarised so it is always obvious why the
 * result count is what it is.
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

  // Debounced, so typing does not fire a query per keystroke.
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (q === current) return;
    const timer = setTimeout(() => set({ q: q || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const statuses = (params.get('status') ?? '').split(',').filter(Boolean);
  const priorities = (params.get('priority') ?? '').split(',').filter(Boolean);
  const overdue = params.get('overdue') === '1';
  const archived = params.get('archived') === '1';
  const projectId = params.get('project') ?? '';
  const assigneeId = params.get('assignee') ?? '';

  const toggle = (key: 'status' | 'priority', value: string) => {
    const list = key === 'status' ? statuses : priorities;
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    set({ [key]: next.join(',') || undefined });
  };

  const activeCount =
    (params.get('q') ? 1 : 0) + statuses.length + priorities.length +
    (projectId ? 1 : 0) + (assigneeId ? 1 : 0) + (overdue ? 1 : 0) + (archived ? 1 : 0);

  return (
    <div className="border-b border-line pb-3">
      {/* Row one: search, then the three things you pick exactly one of. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles and descriptions"
            aria-label="Search tasks"
            className={cx(fieldBase, 'w-full py-1.5 pl-8 pr-8 text-sm')}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          label="Project"
          value={projectId}
          onChange={(v) => set({ project: v || undefined })}
          options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: `${p.key} · ${p.name}` }))]}
        />
        <Select
          label="Assignee"
          value={assigneeId}
          onChange={(v) => set({ assignee: v || undefined })}
          options={[{ value: '', label: 'Anyone' }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
        />
        <Select
          label="Sort"
          value={`${params.get('sort') ?? 'updated_at'}:${params.get('dir') ?? 'desc'}`}
          onChange={(v) => {
            const [sort, dir] = v.split(':');
            set({ sort, dir });
          }}
          options={[
            { value: 'updated_at:desc', label: 'Recently updated' },
            { value: 'updated_at:asc', label: 'Least recently updated' },
            { value: 'due_date:asc', label: 'Due soonest' },
            { value: 'due_date:desc', label: 'Due latest' },
            { value: 'priority:desc', label: 'Highest priority' },
            { value: 'priority:asc', label: 'Lowest priority' },
          ]}
        />

        <span className="ml-auto flex items-center gap-2">
          <span className="tabular-nums text-xs text-ink-2">
            <span className="font-medium text-ink">{total}</span>{' '}
            {total === 1 ? 'task' : 'tasks'}
          </span>
          <a
            href={`/api/tasks/export?${params.toString()}`}
            className="rounded-md px-2 py-1 text-xs font-medium text-ink-2 ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Export CSV
          </a>
        </span>
      </div>

      {/* Row two: the multi-select toggles, grouped so it reads as three questions, not eleven. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChipGroup label="Status">
          {STATUS_ORDER.map((s) => (
            <Chip key={s} active={statuses.includes(s)} onClick={() => toggle('status', s)}>
              {STATUS_LABELS[s]}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="Priority">
          {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
            <Chip key={p} active={priorities.includes(p)} onClick={() => toggle('priority', p)}>
              <span className="capitalize">{p}</span>
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="Scope">
          <Chip tone="danger" active={overdue} onClick={() => set({ overdue: overdue ? undefined : '1' })}>
            Overdue
          </Chip>
          <Chip active={archived} onClick={() => set({ archived: archived ? undefined : '1' })}>
            Archived projects
          </Chip>
        </ChipGroup>

        {activeCount > 0 && (
          <button
            onClick={() => startTransition(() => router.push('/tasks'))}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <IconClose className="h-3 w-3" />
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(fieldBase, 'max-w-[190px] py-1.5 pr-7 text-xs')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  tone = 'neutral',
  onClick,
  children,
}: {
  active: boolean;
  tone?: 'neutral' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'rounded-md px-2 py-1 text-xs transition-colors duration-150',
        active
          ? tone === 'danger'
            ? 'bg-danger text-white'
            : 'bg-ink text-canvas'
          : 'text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
