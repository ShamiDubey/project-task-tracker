import type { ReactNode } from 'react';

import { cx } from './ui';

/**
 * The table primitives.
 *
 * A productivity tool is scanned, not read, so this is tuned for density: 36px rows, a sticky
 * header, hairline separators rather than boxes, and columns that actually line up. Where a card
 * gives every item its own frame, a table lets the eye run down one column and compare — which is
 * what someone asking "what is late" is doing.
 *
 * Deliberately real `<table>` markup, not divs with grid. Screen readers announce row and column
 * position, and the browser handles column sizing better than a hand-rolled grid does.
 */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('scroll-x', className)}>
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-surface">
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  align = 'left',
  width,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cx(
        'whitespace-nowrap px-3 py-2 text-2xs font-medium uppercase tracking-[0.06em] text-ink-3',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  className,
  highlight,
  selected,
}: {
  children: ReactNode;
  className?: string;
  /** Draws the left rule that marks a row needing attention. */
  highlight?: 'danger' | 'warn';
  selected?: boolean;
}) {
  return (
    <tr
      className={cx(
        'group relative transition-colors duration-150',
        selected ? 'bg-accent-soft/60' : 'hover:bg-surface-2',
        highlight === 'danger' && 'bg-danger-soft/25',
        className,
      )}
      data-highlight={highlight}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = 'left',
  muted,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  muted?: boolean;
}) {
  return (
    <td
      className={cx(
        'h-[var(--row-h-relaxed)] px-3 align-middle text-sm',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        muted && 'text-ink-2',
        className,
      )}
    >
      {children}
    </td>
  );
}

/**
 * The left rule on a row that needs attention.
 *
 * A table cell cannot carry a full-height absolute child reliably across browsers, so this sits
 * inside the first cell and stretches to the row.
 */
export function RowRule({ tone }: { tone: 'danger' | 'warn' | 'accent' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'absolute inset-y-0 left-0 w-[2px]',
        tone === 'danger' ? 'bg-danger' : tone === 'warn' ? 'bg-warn' : 'bg-accent',
      )}
    />
  );
}
