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
              'group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-colors duration-150',
              active
                ? 'bg-shell-active font-medium text-shell-ink'
                : 'text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink',
            )}
          >
            {/* A 2px marker on the active item, so the state survives a greyscale screenshot. */}
            <span
              aria-hidden
              className={cx(
                'absolute left-0 top-1/2 w-[2px] -translate-y-1/2 rounded-r-full bg-accent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                active ? 'h-4 opacity-100' : 'h-0 opacity-0',
              )}
            />
            <span
              className={cx(
                'shrink-0 transition-colors duration-150',
                active ? 'text-shell-ink' : 'text-shell-ink-3 group-hover:text-shell-ink-2',
              )}
            >
              {item.icon}
            </span>
            {!dense && <span className="flex-1 truncate">{item.label}</span>}
            {dense && <span className="sr-only">{item.label}</span>}
            {item.badge ? (
              <span
                className={cx(
                  'inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-px text-[10px] font-semibold tabular-nums',
                  active ? 'bg-danger text-white' : 'bg-danger/15 text-[#f28b82]',
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
    <p className="mb-1 mt-5 px-2.5 text-2xs font-medium uppercase tracking-[0.08em] text-shell-ink-3">
      {label}
    </p>
  );
}
