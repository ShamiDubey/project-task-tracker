import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme';

/**
 * The auth surface: one card, centred, and nothing else asking for attention.
 *
 * An earlier version stacked a three-point feature list under the form to fill the space. It filled
 * it the way clutter fills a desk — the landing page already makes the case for the product, and a
 * person on this screen has decided; the only job left is the password. Premium here is what has
 * been left out.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col bg-canvas">
      {/* A whisper of the grid the landing page uses, faded before it reaches the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 65% 60% at 50% 42%, transparent 30%, black 90%)',
        }}
      />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Back to the Cadence site">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Cadence</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-start justify-center px-5 pb-24 pt-[12vh]">
        <div className="w-full max-w-[384px]">
          <div className="rounded-2xl border border-line bg-surface p-8 shadow-e2">{children}</div>
        </div>
      </main>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent">
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
        <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
        <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
        <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
      </svg>
    </span>
  );
}
