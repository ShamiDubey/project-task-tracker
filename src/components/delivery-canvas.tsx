'use client';

import { useEffect, useRef } from 'react';

/**
 * The sign-in backdrop.
 *
 * Rather than decorate the page with an abstract pattern, this animates the thing the product is
 * actually about: work moving through the lifecycle. Nodes drift along four lanes — Backlog, In
 * Progress, In Review, Done — pulses travel down dependency edges, and a few nodes go red and stall,
 * which is the overdue-and-blocked case the whole tool exists to surface.
 *
 * Deliberately not WebGL. This is roughly a hundred lines of 2D canvas, costs no dependency, and
 * runs at 60fps on integrated graphics. A 3D scene on the login page of an internal delivery tool
 * would be a worse answer that took ten times the bytes.
 *
 * It respects prefers-reduced-motion by drawing a single static frame, pauses when the tab is
 * hidden, and redraws at device pixel ratio so the lines stay crisp.
 */

type Node = {
  x: number;
  y: number;
  lane: number;
  r: number;
  speed: number;
  phase: number;
  stalled: boolean;
  /** 0 → 1, how far a stalled node has faded to red. */
  heat: number;
};

const LANES = 4;

export function DeliveryCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    // Read the live theme rather than hard-coding colours, so the canvas follows the toggle.
    const styles = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        accent: cs.getPropertyValue('--accent').trim() || '#5b4bdb',
        danger: cs.getPropertyValue('--danger').trim() || '#c0362c',
        line: cs.getPropertyValue('--line-strong').trim() || '#d6d6d3',
        ink3: cs.getPropertyValue('--ink-3').trim() || '#8a8a94',
      };
    };
    let palette = styles();

    let nodes: Node[] = [];

    function seed() {
      const count = Math.min(46, Math.max(20, Math.round(width / 26)));
      nodes = Array.from({ length: count }, (_, i) => {
        const lane = i % LANES;
        return {
          lane,
          x: Math.random() * width,
          y: 0,
          r: 1.6 + Math.random() * 2.4,
          speed: 0.09 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          // About one in seven stalls — enough that the eye finds them, not so many it reads as noise.
          stalled: Math.random() < 0.14,
          heat: 0,
        };
      });
    }

    function laneY(lane: number, x: number, t: number) {
      const band = height / (LANES + 1);
      // A long, shallow sine so the lanes breathe instead of sitting as four straight rules.
      return band * (lane + 1) + Math.sin(x * 0.004 + t * 0.0004 + lane) * 14;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      palette = styles();
      seed();
    }

    function frame(t: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);

      // The lanes themselves, faintest layer.
      ctx!.lineWidth = 1;
      for (let lane = 0; lane < LANES; lane++) {
        ctx!.beginPath();
        for (let x = 0; x <= width; x += 12) {
          const y = laneY(lane, x, t);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = palette.line;
        ctx!.globalAlpha = 0.5;
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      // Dependency edges: join each node to the nearest node one lane ahead. Short links only, so
      // the field reads as a flow rather than a hairball.
      for (const node of nodes) {
        if (node.lane >= LANES - 1) continue;
        let nearest: Node | null = null;
        let best = 150;
        for (const other of nodes) {
          if (other.lane !== node.lane + 1) continue;
          const d = Math.abs(other.x - node.x);
          if (d < best) {
            best = d;
            nearest = other;
          }
        }
        if (!nearest) continue;
        const y1 = laneY(node.lane, node.x, t);
        const y2 = laneY(nearest.lane, nearest.x, t);
        ctx!.beginPath();
        ctx!.moveTo(node.x, y1);
        ctx!.bezierCurveTo(node.x + 30, y1, nearest.x - 30, y2, nearest.x, y2);
        ctx!.strokeStyle = node.stalled ? palette.danger : palette.accent;
        ctx!.globalAlpha = node.stalled ? 0.16 + node.heat * 0.14 : 0.1;
        ctx!.stroke();

        // A pulse running down the edge — the visual for work actually moving.
        if (!reduced && !node.stalled) {
          const p = ((t * 0.00035 + node.phase) % 1);
          const px = node.x + (nearest.x - node.x) * p;
          const py = y1 + (y2 - y1) * p;
          ctx!.beginPath();
          ctx!.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx!.fillStyle = palette.accent;
          ctx!.globalAlpha = 0.5 * Math.sin(p * Math.PI);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;

      for (const node of nodes) {
        if (!reduced) {
          if (node.stalled) {
            node.heat = Math.min(1, node.heat + 0.004);
          } else {
            node.x += node.speed;
            if (node.x > width + 20) {
              node.x = -20;
              node.lane = Math.floor(Math.random() * LANES);
              node.stalled = Math.random() < 0.14;
              node.heat = 0;
            }
          }
        }
        const y = laneY(node.lane, node.x, t);
        const pulse = reduced ? 0 : Math.sin(t * 0.002 + node.phase) * 0.5 + 0.5;

        if (node.stalled) {
          // A ring that breathes outward: an alert that has been sitting there a while.
          ctx!.beginPath();
          ctx!.arc(node.x, y, node.r + 4 + pulse * 4, 0, Math.PI * 2);
          ctx!.strokeStyle = palette.danger;
          ctx!.globalAlpha = 0.28 * (1 - pulse) * node.heat;
          ctx!.stroke();
        }

        ctx!.beginPath();
        ctx!.arc(node.x, y, node.r, 0, Math.PI * 2);
        ctx!.fillStyle = node.stalled ? palette.danger : node.lane === LANES - 1 ? palette.ink3 : palette.accent;
        ctx!.globalAlpha = node.stalled ? 0.55 + node.heat * 0.35 : 0.42 + pulse * 0.2;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    };
    // The toggle rewrites data-theme, so re-read the palette when it does.
    const observer = new MutationObserver(() => {
      palette = styles();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
