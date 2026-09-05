'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cx } from './ui';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
