import type { ReactNode } from 'react';

import { AuthScene } from '@/components/auth-scene';
import { Tilt } from '@/components/motion';
import { ThemeToggle } from '@/components/theme';

/**
 * The sign-in surface — the one screen here that is a poster rather than a tool.
 *
 * Scrolling drives a camera move through real 3D space: the delivery field and the pitch recede and
 * tilt away while the panel comes forward from behind them and lands flat. The panel itself then
 * leans toward the pointer, with a specular highlight tracking the cursor.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed right-5 top-5 z-30">
        <ThemeToggle />
      </div>

      <AuthScene>
        <Tilt max={7}>
          <div className="grain relative overflow-hidden rounded-2xl border border-line bg-surface/85 p-6 shadow-e3 backdrop-blur-2xl">
            {/* A hairline of brand colour along the top edge of the card. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-70"
            />
            <div className="relative z-[2] flex items-center gap-3 pb-5">
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
            <div className="relative z-[2]">{children}</div>
          </div>
        </Tilt>
      </AuthScene>
    </>
  );
}
