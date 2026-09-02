import type { ReactNode } from 'react';

import { DeliveryCanvas } from '@/components/delivery-canvas';
import { ThemeToggle } from '@/components/theme';

/**
 * The sign-in surface.
 *
 * The one screen in this product that is allowed to be a poster. Everything behind the session is a
 * tool people use for eight hours and is designed to get out of the way; this is a first impression,
 * and it earns the extra weight — a full-bleed generative field, editorial typography, and a
 * staggered entrance.
 *
 * The field is not decoration. It animates the product's own subject: work moving through four
 * lanes, dependency edges between them, and a few nodes going red and stalling.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full overflow-hidden bg-canvas">
      {/* Two slow blurred washes, well behind everything. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className="aurora left-[-14%] top-[-18%] h-[46rem] w-[46rem] bg-brand-400/22"
          style={{ animationDelay: '-6s' }}
        />
        <span
          className="aurora right-[-16%] bottom-[-24%] h-[40rem] w-[40rem] bg-brand-600/14"
          style={{ animationDelay: '-15s', animationDuration: '34s' }}
        />
      </div>

      <DeliveryCanvas className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.85]" />

      {/* Grain over the lot, so the large flat areas do not band. */}
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      {/* ---------------------------------------------------------- left: form */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-14 lg:w-[47%] lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="reveal mb-10 flex items-center justify-between" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-e2">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-accent opacity-40 blur-md"
                  style={{ animation: 'breathe 4s ease-in-out infinite' }}
                />
                <svg viewBox="0 0 16 16" className="relative h-5 w-5" aria-hidden>
                  <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
                  <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
                  <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
                </svg>
              </span>
              <span>
                <span className="block text-[17px] font-semibold leading-tight tracking-tight">Cadence</span>
                <span className="block text-xs leading-tight text-ink-3">Delivery, in view</span>
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div
            className="rounded-2xl border border-line bg-surface/80 p-6 shadow-e3 backdrop-blur-xl reveal"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- right: pitch */}
      <aside className="relative z-10 hidden lg:flex lg:w-[53%] lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-lg">
          <p
            className="reveal-blur mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-2xs font-medium uppercase tracking-[0.12em] text-ink-2 backdrop-blur"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
            </span>
            Internal · Delivery operations
          </p>

          <h2 className="text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
            <span className="reveal-blur block" style={{ '--i': 2 } as React.CSSProperties}>
              Twelve client projects.
            </span>
            <span className="reveal-blur block text-ink-3" style={{ '--i': 3 } as React.CSSProperties}>
              One place to see them.
            </span>
          </h2>

          <p
            className="reveal-blur mt-6 max-w-md text-[15px] leading-relaxed text-ink-2"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            Task lists in spreadsheets. Status in chat threads. Due dates in people’s heads. Cadence
            replaces all of it with something that answers two questions before a client has to ask
            them.
          </p>

          <dl className="mt-11 space-y-px">
            <Question
              i={5}
              n="01"
              q="What is overdue?"
              a="Across the whole portfolio, not one project at a time, with the count sitting in the sidebar so nobody has to go looking for it."
            />
            <Question
              i={6}
              n="02"
              q="Who is overloaded?"
              a="Open work per person with the already-late portion called out, so the answer arrives before the escalation does."
            />
          </dl>

          <div
            className="reveal-blur mt-11 flex items-center gap-6 border-t border-line pt-6"
            style={{ '--i': 7 } as React.CSSProperties}
          >
            <Legend tone="accent" label="Moving" />
            <Legend tone="danger" label="Blocked or overdue" />
            <Legend tone="muted" label="Done" />
            <span className="ml-auto text-2xs text-ink-3">Live view of the delivery pipeline</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Question({ i, n, q, a }: { i: number; n: string; q: string; a: string }) {
  return (
    <div
      className="reveal-blur group relative flex gap-5 rounded-xl px-4 py-4 transition-colors hover:bg-surface/60"
      style={{ '--i': i } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-px bg-line transition-colors group-hover:bg-accent"
      />
      <span className="pt-0.5 font-mono text-2xs tabular-nums text-ink-3">{n}</span>
      <div>
        <dt className="text-[15px] font-medium text-ink">{q}</dt>
        <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">{a}</dd>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: 'accent' | 'danger' | 'muted'; label: string }) {
  const colour = tone === 'accent' ? 'bg-accent' : tone === 'danger' ? 'bg-danger' : 'bg-ink-3';
  return (
    <span className="flex items-center gap-1.5 text-2xs text-ink-3">
      <span className={`h-1.5 w-1.5 rounded-full ${colour}`} aria-hidden />
      {label}
    </span>
  );
}
