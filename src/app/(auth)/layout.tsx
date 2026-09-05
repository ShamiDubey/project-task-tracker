import type { ReactNode } from 'react';

import { ProductPreview } from '@/components/product-preview';
import { ThemeToggle } from '@/components/theme';

/**
 * The sign-in surface.
 *
 * This replaces a scroll-driven hero that put a marketing page in front of a login form. Two things
 * were wrong with that. Typographically it was sloppy — the headline orphaned a word on its own
 * line, and a grey-to-violet-to-grey gradient made it read as a rendering fault rather than a
 * choice. More importantly it was the wrong judgement: this is an internal tool, the first thing
 * anyone wants is to be inside it, and making them scroll past an abstract particle field to reach
 * the password box is the interface working against them.
 *
 * So the form is the first thing on the page and needs no scrolling. Beside it, rather than prose
 * about the product, is the product: a miniature of the real dashboard, the same sentence and the
 * same portfolio bars it actually renders. Showing beats describing, and it is honest about what
 * you are signing in to.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      {/* ------------------------------------------------------------ form */}
      <div className="relative flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[46%] lg:px-14 xl:px-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span>
              <span className="block text-[15px] font-semibold leading-tight tracking-tight">Cadence</span>
              <span className="block text-xs leading-tight text-ink-3">Delivery, in view</span>
            </span>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-[352px]">{children}</div>
        </div>

        <p className="text-xs text-ink-3">
          An internal delivery tool. Built for a services company running a dozen client projects.
        </p>
      </div>

      {/* --------------------------------------------------------- preview */}
      {/*
        A deep ink panel in both themes, not a tint of the page.
        The first attempt used `surface-2`, which is a shade off white — the two halves read as one
        flat field with a hairline down it, so the split looked accidental rather than composed.
        Committing the right side to near-black gives the preview something to sit on, and makes the
        light form column read as deliberate rather than empty.
      */}
      <aside className="relative hidden overflow-hidden bg-[#0e0e12] lg:block lg:w-[54%]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 75% 70% at 38% 30%, black, transparent 75%)',
          }}
        />
        {/* One soft pool of brand light behind the card, so it is lit rather than pasted on. */}
        <div
          aria-hidden
          className="absolute left-[18%] top-[26%] h-[34rem] w-[34rem] rounded-full bg-brand-500/20 blur-[110px]"
        />

        <div className="relative flex h-full flex-col justify-center px-12 xl:px-16">
          <p className="text-xs font-medium uppercase tracking-[0.11em] text-white/40">
            What you are signing in to
          </p>
          <h2 className="mt-3.5 max-w-lg text-[27px] font-semibold leading-[1.24] tracking-[-0.025em] text-white">
            Every project, and the two questions
            <br />
            nobody could answer before.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
            What is overdue across the whole portfolio, and who is carrying too much — without asking
            around, and before a client asks first.
          </p>

          {/* The real interface, tilted back so it reads as a screen rather than a diagram. */}
          <div
            className="mt-10 [perspective:1700px]"
            style={{ maskImage: 'linear-gradient(to bottom, black 68%, transparent)' }}
          >
            <div className="origin-top-left scale-[0.84] [transform:rotateX(7deg)_rotateY(-12deg)_rotateZ(0.8deg)]">
              <ProductPreview />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent shadow-e1">
      <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="var(--on-accent)" opacity="0.55" />
        <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="var(--on-accent)" opacity="0.8" />
        <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="var(--on-accent)" />
      </svg>
    </span>
  );
}
