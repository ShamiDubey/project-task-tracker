import Link from 'next/link';

import { buildQuery } from '@/lib/queries/filters';

import { cx } from './ui';

/** Goal 6.8 — pagination that states the total number of matches, not just next/previous. */
export function Pagination({
  params,
  page,
  pageCount,
  total,
  pageSize,
  basePath,
}: {
  params: Record<string, string | string[] | undefined>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const link = (target: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className="rounded-lg px-2.5 py-1.5 text-xs text-ink-subtle">{label}</span>
    ) : (
      <Link
        href={`${basePath}${buildQuery(params, { page: String(target) })}`}
        className={cx(
          'rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink ring-1 ring-inset ring-line-strong hover:bg-slate-50',
        )}
      >
        {label}
      </Link>
    );

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3">
      <p className="text-xs text-ink-muted">
        Showing <span className="font-medium tabular-nums text-ink">{first}</span>–
        <span className="font-medium tabular-nums text-ink">{last}</span> of{' '}
        <span className="font-medium tabular-nums text-ink">{total}</span> matching task
        {total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1.5">
        {link(page - 1, 'Previous', page <= 1)}
        <span className="px-1 text-xs text-ink-muted">
          Page {page} of {pageCount}
        </span>
        {link(page + 1, 'Next', page >= pageCount)}
      </div>
    </div>
  );
}
