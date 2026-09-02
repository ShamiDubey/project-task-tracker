'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value once, when it first scrolls into view.
 *
 * Two details make the difference between this feeling considered and feeling like a gimmick: it
 * eases out rather than running linearly, so it decelerates into the final figure the way a real
 * dial would; and it renders the true value immediately for anyone who has asked for reduced motion,
 * because a metric that lies for 900ms is worse than one that never moved.
 */
export function Counter({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el || done.current) return;

    setShown(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        observer.disconnect();

        const duration = Math.min(900, 260 + value * 26);
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4); // quartic ease-out
          setShown(Math.round(value * eased));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className} data-metric>
      {shown}
    </span>
  );
}

/**
 * A bare sparkline. No axes, no labels — it sits under a headline number to say which way the last
 * few weeks went, and anything more would compete with the figure it belongs to.
 */
export function Sparkline({ points, tone = 'accent' }: { points: number[]; tone?: 'accent' | 'danger' | 'good' }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const w = 64;
  const h = 18;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / span) * h] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const stroke = tone === 'danger' ? 'var(--danger)' : tone === 'good' ? 'var(--good)' : 'var(--accent)';
  const id = `spark-${tone}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[18px] w-16 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="1.8" fill={stroke} />
    </svg>
  );
}
