'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { TaskStatus } from '@/db/schema';
import { STATUS_LABELS } from '@/lib/task-status';

import { IconArrowRight, IconDashboard, IconList, IconProjects, IconSearch } from './icons';
import { Ref, StatusBadge, cx } from './ui';

export type PaletteItem = {
  id: string;
  kind: 'task' | 'project' | 'page';
  label: string;
  sublabel?: string;
  ref?: string;
  status?: TaskStatus;
  href: string;
};

const PAGES: PaletteItem[] = [
  { id: 'p-dash', kind: 'page', label: 'Dashboard', href: '/dashboard' },
  { id: 'p-mine', kind: 'page', label: 'My tasks', href: '/my-tasks' },
  { id: 'p-tasks', kind: 'page', label: 'All tasks', href: '/tasks' },
  { id: 'p-proj', kind: 'page', label: 'Projects', href: '/projects' },
  { id: 'p-alerts', kind: 'page', label: 'Overdue alerts', href: '/alerts' },
  { id: 'p-overdue', kind: 'page', label: 'Filter: overdue only', sublabel: 'All tasks, past due', href: '/tasks?overdue=1' },
  { id: 'p-blocked', kind: 'page', label: 'Filter: blocked tasks', sublabel: 'All tasks, blocked', href: '/tasks?status=blocked' },
  { id: 'p-urgent', kind: 'page', label: 'Filter: urgent work', sublabel: 'All tasks, urgent priority', href: '/tasks?priority=urgent' },
];

/**
 * ⌘K — jump to any project, task or view without leaving the keyboard.
 *
 * The index is handed down from the server once per session rather than searched over the wire on
 * every keystroke: at this data size the whole set of task and project labels is a few tens of
 * kilobytes, and matching locally means the list responds within a frame. That trade stops working
 * somewhere in the low thousands of tasks, at which point this becomes a debounced server search —
 * the same fetch the list page already does.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo(() => [...PAGES, ...items], [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    const scored: { item: PaletteItem; score: number }[] = [];
    for (const item of all) {
      const hay = `${item.ref ?? ''} ${item.label} ${item.sublabel ?? ''}`.toLowerCase();
      const at = hay.indexOf(q);
      if (at === -1) continue;
      // Prefer a match on the reference or the start of the label over one buried in a description.
      let score = at;
      if (item.ref?.toLowerCase().startsWith(q)) score -= 100;
      if (item.label.toLowerCase().startsWith(q)) score -= 50;
      if (item.kind === 'page') score -= 10;
      scored.push({ item, score });
    }
    return scored.sort((a, b) => a.score - b.score).slice(0, 12).map((s) => s.item);
  }, [query, all]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const go = useCallback(
    (item: PaletteItem) => {
      close();
      router.push(item.href);
    },
    [close, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter' && results[cursor]) {
        e.preventDefault();
        go(results[cursor]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, cursor, close, go]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return <PaletteTrigger onOpen={() => setOpen(true)} />;

  return (
    <>
      <PaletteTrigger onOpen={() => setOpen(true)} />
      <div
        className="animate-pop fixed inset-0 z-50 flex items-start justify-center bg-[rgb(10_10_14/0.55)] px-4 pt-[12vh] backdrop-blur-sm"
        onClick={close}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={(e) => e.stopPropagation()}
          className="animate-pop w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-e3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-3.5">
            <IconSearch className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Reset the highlight here rather than in an effect: the cursor is a consequence of
                // the query changing, and an effect would render twice for every keystroke.
                setCursor(0);
              }}
              placeholder="Jump to a task, project or view…"
              className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label="Search"
            />
            <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-ink-3">esc</kbd>
          </div>

          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-2">
              Nothing matches “{query}”.
            </p>
          ) : (
            <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
              {results.map((item, i) => (
                <li key={item.id}>
                  <button
                    onMouseMove={() => setCursor(i)}
                    onClick={() => go(item)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                      i === cursor ? 'bg-accent-soft' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className={cx('shrink-0', i === cursor ? 'text-accent' : 'text-ink-3')}>
                      {item.kind === 'task' ? (
                        <IconList />
                      ) : item.kind === 'project' ? (
                        <IconProjects />
                      ) : (
                        <IconDashboard />
                      )}
                    </span>
                    {item.ref && <Ref>{item.ref}</Ref>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-2xs text-ink-3">{item.sublabel}</span>
                      )}
                    </span>
                    {item.status && <StatusBadge status={item.status} size="sm" />}
                    {i === cursor && <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 border-t border-line bg-surface-2 px-3.5 py-2 text-2xs text-ink-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-surface px-1 font-mono">↑</kbd>
              <kbd className="rounded border border-line bg-surface px-1 font-mono">↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-surface px-1 font-mono">↵</kbd> open
            </span>
            <span className="ml-auto">{results.length} of {all.length}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/** The platform never changes, so it subscribes to nothing and only needs a server fallback. */
const subscribeNever = () => () => {};

function PaletteTrigger({ onOpen }: { onOpen: () => void }) {
  const mac = useSyncExternalStore(
    subscribeNever,
    () => navigator.platform.toLowerCase().includes('mac'),
    () => true, // assume ⌘ during SSR; corrected on hydration without a flash of the wrong glyph
  );
  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-lg bg-sunk px-2.5 py-1.5 text-left text-xs text-ink-3 ring-1 ring-inset ring-transparent transition-colors hover:text-ink-2 hover:ring-line-strong"
    >
      <IconSearch className="h-3.5 w-3.5" />
      <span className="flex-1">Search…</span>
      <kbd className="rounded border border-line bg-surface px-1 py-px font-mono text-[10px] text-ink-3">
        {mac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  );
}

export { STATUS_LABELS };
