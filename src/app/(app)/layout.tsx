/**
 * The application shell.
 *
 * Protection lives here rather than in middleware: `requireUser()` runs on the server for every page
 * in this group, so an unauthenticated request is redirected before any child renders or reads the
 * database. There is no route inside here that can render without a verified session.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { logout } from '@/app/actions/auth';
import { CommandPalette } from '@/components/command-palette';
import {
  IconAlert,
  IconDashboard,
  IconInbox,
  IconList,
  IconProjects,
  IconSignOut,
} from '@/components/icons';
import { NavLinks, NavSection } from '@/components/nav';
import { ThemeToggle } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';
import { countOpenAlerts } from '@/lib/queries/alerts';
import { paletteIndex } from '@/lib/queries/palette';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [alerts, palette] = await Promise.all([countOpenAlerts(user), paletteIndex(user)]);

  const primary = [
    { href: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    { href: '/my-tasks', label: 'My tasks', icon: <IconInbox /> },
    { href: '/alerts', label: 'Overdue', icon: <IconAlert />, badge: alerts },
  ];
  const portfolio = [
    { href: '/tasks', label: 'All tasks', icon: <IconList /> },
    { href: '/projects', label: 'Projects', icon: <IconProjects /> },
  ];

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-line bg-surface px-2.5 py-3 md:flex">
        <Link href="/dashboard" className="mb-3 flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <Wordmark />
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight tracking-tight text-ink">Cadence</span>
            <span className="block text-2xs leading-tight text-ink-3">Delivery, in view</span>
          </span>
        </Link>

        <CommandPalette items={palette} />

        <div className="mt-4">
          <NavLinks items={primary} />
          <NavSection label="Portfolio" />
          <NavLinks items={portfolio} />
        </div>

        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{user.name}</p>
              <p className="truncate text-2xs capitalize text-ink-3">{user.role}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <IconSignOut />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Small screens lose the sidebar, so the same destinations move into a compact bar. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/85 px-3 py-2 backdrop-blur-md md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Wordmark />
            <span className="text-sm font-semibold tracking-tight">Cadence</span>
          </Link>
          <div className="ml-auto">
            <NavLinks dense items={[...primary, ...portfolio]} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-9">
          <div className="mx-auto max-w-6xl animate-rise">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * The mark: three bars of increasing height inside a rounded square — a cadence, and a nod to the
 * priority meter used throughout the interface. Drawn rather than imported so it inherits the theme.
 */
function Wordmark() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-accent shadow-e1">
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
        <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
        <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
        <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
      </svg>
    </span>
  );
}
