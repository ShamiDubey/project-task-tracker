/**
 * The shell behind a session.
 *
 * Protection lives here rather than in middleware: `requireUser()` runs on the server for every page
 * inside this group, so an unauthenticated request is redirected before any child renders or reads
 * the database. There is no route in here that can render without a verified session.
 */
import type { ReactNode } from 'react';

import { logout } from '@/app/actions/auth';
import { Avatar } from '@/components/ui';
import { NavLinks } from '@/components/nav';
import { requireUser } from '@/lib/auth/session';
import { countOpenAlerts } from '@/lib/queries/alerts';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const alerts = await countOpenAlerts(user);

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            PT
          </span>
          <span className="text-sm font-semibold tracking-tight">Project Tracker</span>
        </div>

        <NavLinks
          items={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/my-tasks', label: 'My tasks' },
            { href: '/tasks', label: 'All tasks' },
            { href: '/projects', label: 'Projects' },
            { href: '/alerts', label: 'Overdue alerts', badge: alerts },
          ]}
        />

        <div className="mt-auto border-t border-line pt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs capitalize text-ink-muted">{user.role}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Compact top bar on small screens, since the sidebar is hidden there. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 md:hidden">
          <span className="text-sm font-semibold">Project Tracker</span>
          <NavLinks
            items={[
              { href: '/dashboard', label: 'Dash' },
              { href: '/tasks', label: 'Tasks' },
              { href: '/alerts', label: 'Alerts', badge: alerts },
            ]}
          />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
