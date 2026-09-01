import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
            PT
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Project Tracker</h1>
          <p className="mt-1 text-sm text-ink-muted">
            One place for the portfolio, the work, and what is overdue.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
