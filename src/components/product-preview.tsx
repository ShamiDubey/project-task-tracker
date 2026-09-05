/**
 * A miniature of the dashboard, shown beside the hero copy.
 *
 * Built at 640px rather than the full 1000px of the real screen, and that is the whole point: the
 * column it sits in is around 500px, so a 1000px mock would have to shrink to 0.44 and everything
 * inside it becomes unreadable. Narrower natively, it fits at roughly 0.78 and the interface is
 * still legible — which is the only reason to show a screenshot at all.
 *
 * Everything here exists in the real product. An earlier version was modelled on a generic dashboard
 * and showed a donut chart, a "Reports" section and week-on-week deltas, none of which this
 * application has. A landing page advertising a product the sign-in button does not lead to is worse
 * than one with no screenshot, so this mirrors the real dashboard: the actual sidebar with its
 * overdue badge, the same hero sentence, the four headline metrics, the portfolio strip over the
 * seeded projects, throughput, and by-status as bars.
 *
 * Static by design — this page is public, and live rows would leak a portfolio's shape to anyone.
 */

const NAV = [
  { label: 'Dashboard', active: true },
  { label: 'My tasks' },
  { label: 'Overdue', badge: 7 },
];
const NAV_PORTFOLIO = ['All tasks', 'Projects'];

const STATS = [
  { label: 'Open', value: '24', tone: 'ink' },
  { label: 'Overdue', value: '7', tone: 'danger' },
  { label: 'Due this week', value: '2', tone: 'ink' },
  { label: 'Completed', value: '2', tone: 'good' },
];

/** late / blocked / in flight / done — the four segments the real portfolio bar draws. */
const PORTFOLIO = [
  { key: 'HELIO', name: 'Helio Brand Refresh', seg: [42, 0, 34, 24], open: 5, late: 3 },
  { key: 'ACME', name: 'Acme Retail Replatform', seg: [16, 9, 33, 42], open: 7, late: 2 },
  { key: 'ORBIT', name: 'Orbit Payments', seg: [14, 0, 46, 40], open: 4, late: 1 },
  { key: 'NOVA', name: 'Nova Health App', seg: [12, 11, 35, 42], open: 5, late: 1 },
  { key: 'VERTEX', name: 'Vertex Data Migration', seg: [0, 0, 38, 62], open: 2, late: 0 },
];

const BY_STATUS = [
  { label: 'Backlog', n: 12, pct: 34 },
  { label: 'In Progress', n: 9, pct: 26 },
  { label: 'In Review', n: 3, pct: 9 },
  { label: 'Blocked', n: 2, pct: 6 },
  { label: 'Done', n: 9, pct: 25 },
];

const WEEKS = [1, 2, 0, 2, 1, 3, 1, 2];

export function ProductPreview() {
  const peak = Math.max(...WEEKS, 1);

  return (
    <div className="pointer-events-none select-none" aria-hidden>
      {/* Forced light: it represents a screen, and a screenshot that changed colour with the
          viewer's theme would stop reading as one. */}
      <div data-theme="light" className="flex w-[640px] bg-[#fbfbfa]">
        {/* ------------------------------------------------- the real sidebar */}
        <div className="flex w-[112px] shrink-0 flex-col bg-[#101014] px-1.5 py-2">
          <div className="mb-2.5 flex items-center gap-1.5 px-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-accent">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5">
                <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="#fff" opacity="0.55" />
                <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="#fff" opacity="0.8" />
                <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="#fff" />
              </svg>
            </span>
            <span className="text-[9px] font-semibold text-white">Cadence</span>
          </div>

          {NAV.map((n) => (
            <div
              key={n.label}
              className={`mb-0.5 flex items-center gap-1.5 rounded px-1.5 py-[3px] text-[8px] ${
                n.active ? 'bg-[#26263a] font-medium text-white' : 'text-[#9a9aa6]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-[2px] ${n.active ? 'bg-white/70' : 'bg-white/25'}`} />
              {n.label}
              {n.badge && (
                <span className="ml-auto rounded-full bg-[#c0362c]/25 px-1 text-[7px] font-semibold text-[#f28b82]">
                  {n.badge}
                </span>
              )}
            </div>
          ))}

          <p className="mb-0.5 mt-2 px-1.5 text-[6px] uppercase tracking-[0.09em] text-[#6b6b78]">
            Portfolio
          </p>
          {NAV_PORTFOLIO.map((label) => (
            <div key={label} className="mb-0.5 flex items-center gap-1.5 rounded px-1.5 py-[3px] text-[8px] text-[#9a9aa6]">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-white/25" />
              {label}
            </div>
          ))}

          <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 pt-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#e9e5fd] text-[6px] font-semibold text-[#4b3cc0]">
              PR
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[7px] text-white">Priya Raman</span>
              <span className="block text-[6px] text-[#6b6b78]">Manager</span>
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------- the body */}
        <div className="min-w-0 flex-1 p-2">
          <div className="rounded-md border border-line bg-surface px-2.5 py-2">
            <p className="text-[6px] font-medium uppercase tracking-[0.1em] text-ink-3">
              Portfolio · Afternoon
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-snug tracking-[-0.015em] text-ink">
              Priya, you have <span className="text-accent">24</span> open tasks, and{' '}
              <span className="text-danger">7</span> are already late.
            </p>
          </div>

          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-md border bg-surface px-1.5 py-1 ${
                  s.tone === 'danger' ? 'border-danger-line' : 'border-line'
                }`}
              >
                <p className="truncate text-[6px] text-ink-2">{s.label}</p>
                <p
                  className={`mt-0.5 text-[13px] font-semibold leading-none tabular-nums ${
                    s.tone === 'danger' ? 'text-danger' : s.tone === 'good' ? 'text-good' : 'text-ink'
                  }`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-1.5 rounded-md border border-line bg-surface">
            <div className="border-b border-line px-2.5 py-1.5">
              <p className="text-[8px] font-semibold text-ink">The portfolio</p>
              <p className="text-[6px] text-ink-2">Ordered by how much is already late.</p>
            </div>
            <ul className="divide-y divide-line">
              {PORTFOLIO.map((p) => (
                <li key={p.key} className="flex items-center gap-1.5 px-2.5 py-[4px]">
                  <span className="w-[34px] shrink-0 rounded bg-accent-soft px-0.5 text-center font-mono text-[6px] font-medium text-accent">
                    {p.key}
                  </span>
                  <span className="w-[74px] shrink-0 truncate text-[7px] text-ink">{p.name}</span>
                  <span className="flex h-[5px] flex-1 gap-px overflow-hidden rounded-full bg-sunk">
                    <span className="h-full bg-danger" style={{ width: `${p.seg[0]}%` }} />
                    <span className="h-full bg-warn" style={{ width: `${p.seg[1]}%` }} />
                    <span className="h-full bg-accent" style={{ width: `${p.seg[2]}%` }} />
                    <span className="h-full bg-good/45" style={{ width: `${p.seg[3]}%` }} />
                  </span>
                  <span className="w-[40px] shrink-0 text-right text-[6px] tabular-nums text-ink-2">
                    {p.open} open
                    {p.late > 0 && <span className="ml-0.5 font-medium text-danger">{p.late}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <div className="rounded-md border border-line bg-surface p-2">
              <p className="text-[8px] font-semibold text-ink">Throughput</p>
              <svg viewBox="0 0 160 40" className="mt-1 h-[40px] w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pp-tp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = WEEKS.map((w, i) => [
                    (i / (WEEKS.length - 1)) * 160,
                    40 - (w / peak) * 30 - 5,
                  ]);
                  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                  return (
                    <>
                      <path d={`${line} L160,40 L0,40 Z`} fill="url(#pp-tp)" />
                      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="rounded-md border border-line bg-surface p-2">
              <p className="text-[8px] font-semibold text-ink">By status</p>
              <ul className="mt-1 space-y-[3px]">
                {BY_STATUS.map((s) => (
                  <li key={s.label} className="flex items-center gap-1">
                    <span className="w-[38px] shrink-0 text-[6px] text-ink-2">{s.label}</span>
                    <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-sunk">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="w-2.5 text-right text-[6px] tabular-nums text-ink-2">{s.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
