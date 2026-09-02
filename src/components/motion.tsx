'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { cx } from './ui';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The reduced-motion preference, as external state.
 *
 * Read through `useSyncExternalStore` rather than copied into an effect: the server snapshot is
 * "not reduced", which matches the markup, and a viewer who changes the setting mid-session gets the
 * new behaviour without a reload.
 */
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotion, () => false);
}

/**
 * A surface that leans toward the pointer.
 *
 * The rotation is capped low — six degrees at the corners — because the point is that the card
 * acknowledges the pointer, not that it performs. Past about eight degrees the text keystones and
 * the whole thing reads as a toy.
 *
 * Geometry only. This originally also painted a highlight that followed the cursor across the card;
 * it read as a blob chasing the mouse rather than as the surface responding, so it was removed.
 *
 * The angles are written to CSS custom properties and read by a transform, so the browser stays on
 * the compositor: no layout, no paint, no React re-render per pointer move.
 */
export function Tilt({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);

  return (
    <div
      ref={ref}
      className={cx('tilt', className)}
      style={{ '--rx': '0deg', '--ry': '0deg' } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * A button that leans a few pixels toward the cursor as it approaches, and snaps back on a spring
 * when the pointer leaves. Small enough to register as responsiveness rather than as an effect.
 */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
        el.style.transition = 'transform 80ms linear';
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = 'translate3d(0,0,0)';
      el.style.transition = 'transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    };

    const parent = el.parentElement ?? el;
    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={cx('inline-block will-change-transform', className)}>
      {children}
    </span>
  );
}

/**
 * Reveals children once they scroll into view, rather than on mount. Below-the-fold content that has
 * already finished animating before you reach it is the same as no animation at all.
 */
export function InView({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [intersected, setIntersected] = useState(false);
  // Anyone who has asked for less motion simply gets the finished state.
  const shown = reduced || intersected;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersected(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={cx(
        'transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-6 opacity-0 blur-[6px]',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Scroll progress through an element, 0 to 1, on the compositor rather than in React state. */
export function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        if (travel <= 0) return setProgress(1);
        setProgress(Math.min(1, Math.max(0, -r.top / travel)));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return progress;
}
