'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cx } from './ui';

export type NavItem = { href: string; label: string; icon: ReactNode; badge?: number };

export function NavLinks({ items, dense = false }: { items: NavItem[]; dense?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cx('flex', dense ? 'items-center gap-0.5' : 'flex-col gap-0.5')}>
      {items.map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm transition-colors duration-150',
              active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            {/* A 2px marker on the active item, so the state survives a greyscale screenshot. */}
            <span
              aria-hidden
              className={cx(
                'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity duration-150',
                active ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span className={cx('shrink-0', active ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2')}>
              {item.icon}
            </span>
            {!dense && <span className="flex-1 truncate">{item.label}</span>}
            {dense && <span className="sr-only">{item.label}</span>}
            {item.badge ? (
              <span
                className={cx(
                  'inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-px text-[10px] font-semibold tabular-nums',
                  active ? 'bg-accent text-on-accent' : 'bg-danger-soft text-danger ring-1 ring-inset ring-danger-line',
                )}
                aria-label={`${item.badge} overdue`}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavSection({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-5 px-2.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">
      {label}
    </p>
  );
}
