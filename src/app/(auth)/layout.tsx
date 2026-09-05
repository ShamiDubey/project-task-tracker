import Link from 'next/link';
import type { ReactNode } from 'react';

import { IconArrowRight } from '@/components/icons';
import { ThemeToggle } from '@/components/theme';

/**
 * The sign-in surface.
 *
 * Deliberately small and centred. Earlier versions tried to do two jobs at once — first a
 * scroll-driven hero, then a split panel carrying a product shot — and both got in the way of the
 * one thing anybody is here to do. The landing page now carries the argument for the product, so
 * this page only has to take a password and get out of the way, which is what the sign-in screens of
 * the products worth copying actually do.
 *
 * The card is the only object on the page. Everything else is a quiet frame around it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col bg-canvas">
      {/* A fine grid, faded out well before it reaches the card. Texture, not decoration. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 45%, transparent 25%, black 85%)',
        }}
      />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Cadence</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="hidden items-center gap-1 text-sm text-ink-2 transition-colors hover:text-ink sm:flex"
          >
            Back to site
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[380px]">
          <div className="rounded-xl border border-line bg-surface p-7 shadow-e2">{children}</div>
        </div>
      </main>

      <footer className="relative px-5 pb-6 text-center sm:px-8">
        <p className="text-xs text-ink-3">
          An internal delivery tool for a services company running a dozen client projects.
        </p>
      </footer>
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
