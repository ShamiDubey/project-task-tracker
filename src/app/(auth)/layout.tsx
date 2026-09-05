import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProductPreview } from '@/components/product-preview';
import { ThemeToggle } from '@/components/theme';

/**
 * The auth surface: one floating card, split in two.
 *
 * Left is the brand panel — the same near-black as the application shell and the closing band of
 * the landing page, with the real dashboard tilted inside it the way a screen sits on a desk. Right
 * is the form on a quiet surface. The pattern is the classic split sign-in, translated into this
 * product's own materials: our dark, our violet, our screenshot. Nothing on it is borrowed — no
 * third-party sign-in buttons for providers this app does not have, no fields it does not ask for.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-4 sm:p-8">
      <div className="grid w-full max-w-[1180px] overflow-hidden rounded-2xl border border-line bg-surface shadow-e3 lg:h-[640px] lg:grid-cols-2">
        {/* ------------------------------------------------------ brand panel */}
        <div className="relative hidden overflow-hidden bg-[#0e0e12] lg:block lg:h-[640px]">
          {/* One pool of brand light, so the panel reads lit rather than flat. */}
          <div
            aria-hidden
            className="absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-brand-500/25 blur-[100px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-brand-700/20 blur-[110px]"
          />

          <div className="relative flex h-full flex-col px-12 pt-14">
            <h2 className="text-center text-[26px] font-semibold leading-snug tracking-[-0.025em] text-white">
              Clarity for every project.
            </h2>
            <p className="mx-auto mt-3 max-w-[30ch] text-center text-sm leading-relaxed text-white/50">
              Every task, deadline and person in one place — and a straight answer to what is
              overdue.
            </p>

            {/* The real dashboard, tilted the way a shot sits in a frame, sliding off the bottom
                edge so it reads as a glimpse rather than a diagram. */}
            <div className="relative flex-1">
              <div className="absolute -bottom-14 left-1/2 w-[580px] -translate-x-1/2 rotate-[-3deg]">
                <div className="overflow-hidden rounded-xl shadow-[0_40px_90px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
                  <div style={{ zoom: 0.9 }}>
                    <ProductPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- form panel */}
        <div className="relative flex flex-col px-6 py-6 sm:px-12 sm:py-8">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Back to the Cadence site">
              <Mark />
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold tracking-tight text-ink">Cadence</span>
                <span className="block text-2xs text-ink-3">Delivery, in view</span>
              </span>
            </Link>
            <ThemeToggle />
          </header>

          <div className="flex flex-1 items-center py-10">
            <div className="mx-auto w-full max-w-[360px]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent">
      <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
        <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
        <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
      </svg>
    </span>
  );
}
