import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme';

/**
 * The sign-in screen is the first thing anyone sees, including whoever is assessing this, so it gets
 * a two-panel treatment rather than a centred box on grey. The right panel states what the product
 * is for in the language of the problem — the two questions it exists to answer — instead of
 * decorating the page with a stock illustration.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[46%] lg:px-16">
        <div className="mx-auto w-full max-w-sm animate-rise">
          <div className="mb-9 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-accent shadow-e1">
                <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden>
                  <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
                  <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
                  <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
                </svg>
              </span>
              <span>
                <span className="block text-base font-semibold leading-tight tracking-tight">Cadence</span>
                <span className="block text-xs leading-tight text-ink-3">Delivery, in view</span>
              </span>
            </div>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:w-[54%] lg:flex-col lg:justify-center lg:px-16">
        {/* A quiet grid, masked to fade out — texture without becoming decoration. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 30% 40%, black 20%, transparent 75%)',
          }}
        />
        <div className="relative max-w-md">
          <p className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-3">
            Internal · Delivery operations
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.15] tracking-tight text-ink">
            Twelve client projects.
            <br />
            <span className="text-ink-3">One place to see them.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-2">
            Task lists in spreadsheets, status in chat threads, due dates in people’s heads. Cadence
            replaces all of it with something that answers two questions without anyone having to ask
            around.
          </p>

          <dl className="mt-10 space-y-5">
            <Point
              q="What is overdue?"
              a="Across the whole portfolio, not one project at a time — with a count in the sidebar so nobody has to go looking."
            />
            <Point
              q="Who is overloaded?"
              a="Open work per person, with the already-late portion called out, so the answer arrives before the client does."
            />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Point({ q, a }: { q: string; a: string }) {
  return (
    <div className="flex gap-3.5">
      <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-accent" aria-hidden>
          <path d="m1.6 5.2 2.2 2.2 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <dt className="text-sm font-medium text-ink">{q}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-ink-2">{a}</dd>
      </div>
    </div>
  );
}
