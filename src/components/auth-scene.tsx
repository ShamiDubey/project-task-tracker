'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { DeliveryCanvas } from './delivery-canvas';
import { usePrefersReducedMotion, useScrollProgress } from './motion';

/**
 * The sign-in scene.
 *
 * Two screens tall. The first is the pitch; scrolling drives a camera move through real 3D space
 * rather than a fade — the field and the headline recede and tilt away while the sign-in panel comes
 * forward from behind them, rotating flat and landing at Z zero. It is one continuous move, so the
 * page reads as one space rather than two sections.
 *
 * All of it is transform and opacity on `preserve-3d` layers, driven by a single scroll listener
 * that writes to refs. React renders once; every frame after that is the compositor.
 *
 * Under prefers-reduced-motion the whole thing collapses to a static, fully-landed layout.
 */
export function AuthScene({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(trackRef);
  const reduced = usePrefersReducedMotion();

  // Pointer parallax, layered on top of the scroll position.
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        trackRef.current?.style.setProperty('--px', String(nx));
        trackRef.current?.style.setProperty('--py', String(ny));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    // Ease the raw scroll fraction so the move decelerates into its resting position.
    const t = 1 - Math.pow(1 - progress, 3);

    if (fieldRef.current) {
      fieldRef.current.style.transform =
        `translate3d(calc(var(--px, 0) * -26px), calc(var(--py, 0) * -18px), ${-420 - t * 320}px) scale(${1 + t * 0.28})`;
      fieldRef.current.style.opacity = String(1 - t * 0.55);
    }
    if (pitchRef.current) {
      pitchRef.current.style.transform =
        `translate3d(calc(var(--px, 0) * -14px), calc(${-t * 90}px + var(--py, 0) * -10px), ${-t * 260}px) rotateX(${t * 12}deg)`;
      pitchRef.current.style.opacity = String(Math.max(0, 1 - t * 1.5));
    }
    if (panelRef.current) {
      // Comes from behind, rotates flat, lands at zero and stops moving.
      panelRef.current.style.transform =
        `translate3d(calc(var(--px, 0) * 10px), ${(1 - t) * 130}px, ${-560 + t * 560}px) rotateX(${(1 - t) * 26}deg) scale(${0.86 + t * 0.14})`;
      panelRef.current.style.opacity = String(Math.min(1, Math.max(0, (t - 0.12) * 2.2)));
      panelRef.current.style.pointerEvents = t > 0.55 ? 'auto' : 'none';
    }
    if (hintRef.current) {
      hintRef.current.style.opacity = String(Math.max(0, 1 - t * 3));
    }
  }, [progress, reduced]);

  if (reduced) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-12 overflow-hidden bg-canvas px-6 py-16 lg:flex-row lg:gap-24">
        <DeliveryCanvas className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
        <div className="relative max-w-lg text-center lg:text-left">
          <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
            Twelve client projects.
            <span className="block text-ink-3">One place to see them.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            Cadence answers two questions before a client has to ask them: what is overdue across the
            whole portfolio, and who is carrying too much.
          </p>
        </div>
        <div className="relative w-full max-w-sm">{children}</div>
      </div>
    );
  }

  return (
    <div ref={trackRef} className="relative h-[220vh] bg-canvas">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Aurora, furthest back, unaffected by the camera. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="aurora left-[-14%] top-[-18%] h-[46rem] w-[46rem] bg-brand-400/20" style={{ animationDelay: '-6s' }} />
          <span className="aurora bottom-[-24%] right-[-16%] h-[40rem] w-[40rem] bg-brand-600/14" style={{ animationDelay: '-15s', animationDuration: '34s' }} />
        </div>

        <div className="scene absolute inset-0">
          {/* Layer 1 — the delivery field. */}
          <div ref={fieldRef} className="scene-layer absolute inset-0">
            <DeliveryCanvas className="h-full w-full opacity-90" />
          </div>

          {/* Layer 2 — the pitch, which the camera passes through. */}
          <div
            ref={pitchRef}
            className="scene-layer pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            <p className="reveal-blur mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-ink-2 backdrop-blur" style={{ '--i': 0 } as React.CSSProperties}>
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
              </span>
              Internal · Delivery operations
            </p>

            <h1 className="max-w-4xl text-[clamp(2.6rem,7.2vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink">
              <span className="reveal-blur block" style={{ '--i': 1 } as React.CSSProperties}>
                Twelve client projects.
              </span>
              <span className="reveal-blur block bg-gradient-to-r from-ink-3 via-accent to-ink-3 bg-clip-text text-transparent" style={{ '--i': 2 } as React.CSSProperties}>
                One place to see them.
              </span>
            </h1>

            <p className="reveal-blur mt-7 max-w-xl text-[15px] leading-relaxed text-ink-2" style={{ '--i': 3 } as React.CSSProperties}>
              Task lists in spreadsheets. Status in chat threads. Due dates in people’s heads.
              Cadence answers two questions before a client has to ask them.
            </p>

            <dl className="reveal-blur mt-10 flex flex-wrap items-start justify-center gap-x-14 gap-y-6" style={{ '--i': 4 } as React.CSSProperties}>
              <Question n="01" q="What is overdue?" a="Across the whole portfolio, not one project at a time." />
              <Question n="02" q="Who is overloaded?" a="Open work per person, with the late portion called out." />
            </dl>
          </div>

          {/* Layer 3 — the panel, arriving from behind. */}
          <div ref={panelRef} className="scene-layer absolute inset-0 flex items-center justify-center px-6">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>

        <div ref={hintRef} className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 text-center">
          <p className="text-2xs uppercase tracking-[0.16em] text-ink-3">Scroll to sign in</p>
          <span className="mx-auto mt-2.5 block h-8 w-px overflow-hidden bg-line">
            <span className="block h-3 w-px bg-accent" style={{ animation: 'scroll-cue 1.8s ease-in-out infinite' }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Question({ n, q, a }: { n: string; q: string; a: string }) {
  return (
    <div className="max-w-[15rem] text-left">
      <dt className="flex items-baseline gap-2 text-sm font-medium text-ink">
        <span className="font-mono text-2xs tabular-nums text-accent">{n}</span>
        {q}
      </dt>
      <dd className="mt-1.5 text-xs leading-relaxed text-ink-2">{a}</dd>
    </div>
  );
}
