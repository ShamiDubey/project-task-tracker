'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cx } from './ui';

type Item = { href: string; label: string; badge?: number };

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
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
              'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
            )}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white"
                aria-label={`${item.badge} overdue`}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
