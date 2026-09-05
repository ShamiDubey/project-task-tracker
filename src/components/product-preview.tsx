/**
 * A miniature of the dashboard, shown on the landing page.
 *
 * Every element here exists in the real product. An earlier version of this file was modelled on a
 * generic dashboard mock and showed things this application does not have — a donut chart, a
 * "Reports" section, week-on-week deltas, a date-range picker, and projects that are not in the
 * data. A landing page that advertises a product the sign-in button does not lead to is worse than
 * one with no screenshot at all, so this mirrors the real thing module for module:
 *
 *   the actual sidebar          Dashboard · My tasks · Overdue · All tasks · Projects
 *   the hero sentence           the same sentence the dashboard states
 *   four headline metrics       open · overdue · due this week · completed this week
 *   the portfolio strip         one segmented bar per project, ordered by lateness
 *   throughput                  eight weeks of completions, as the real chart draws them
 *   by status                   rows with bars, not a pie
 *   who is carrying what        open work per person, overdue portion in red
 *
 * Figures match the seeded demo, so what a visitor sees here is what they get on signing in.
 * Static by design: this page is public, and live rows would leak a portfolio's shape to anyone.
 */

const NAV = [
  { label: 'Dashboard', active: true },
  { label: 'My tasks' },
  { label: 'Overdue', badge: 7 },
];
const NAV_PORTFOLIO = [{ label: 'All tasks' }, { label: 'Projects' }];

const STATS = [
  { label: 'Open tasks', value: '24', note: 'Everything not finished', tone: 'ink' },
  { label: 'Overdue', value: '7', note: 'Past due, not finished', tone: 'danger' },
  { label: 'Due this week', value: '2', note: 'Monday to Sunday', tone: 'ink' },
  { label: 'Completed this week', value: '2', note: 'Moved to Done', tone: 'good' },
];

/** late / blocked / in flight / done — the four segments the real portfolio bar draws. */
const PORTFOLIO = [
  { key: 'HELIO', name: 'Helio Brand Refresh', seg: [42, 0, 34, 24], open: 5, late: 3 },
  { key: 'ACME', name: 'Acme Retail Replatform', seg: [16, 9, 33, 42], open: 7, late: 2 },
  { key: 'ORBIT', name: 'Orbit Payments Integration', seg: [14, 0, 46, 40], open: 4, late: 1 },
  { key: 'NOVA', name: 'Nova Health Patient App', seg: [12, 11, 35, 42], open: 5, late: 1 },
  { key: 'VERTEX', name: 'Vertex Data Migration', seg: [0, 0, 38, 62], open: 2, late: 0 },
];

const BY_STATUS = [
  { label: 'Backlog', n: 12, pct: 34 },
  { label: 'In Progress', n: 9, pct: 26 },
  { label: 'In Review', n: 3, pct: 9 },
  { label: 'Blocked', n: 2, pct: 6 },
  { label: 'Done', n: 9, pct: 25 },
];

const PEOPLE = [
  { name: 'Marco Ferrari', initials: 'MF', open: 6, overdue: 2 },
  { name: 'Sam Whitfield', initials: 'SW', open: 5, overdue: 1 },
  { name: 'Tom Baxter', initials: 'TB', open: 4, overdue: 1 },
  { name: 'Aisha Bello', initials: 'AB', open: 3, overdue: 0 },
  { name: 'Lena Kowalski', initials: 'LK', open: 3, overdue: 1 },
];

const WEEKS = [1, 2, 0, 2, 1, 3, 1, 2];

export function ProductPreview() {
  const peak = Math.max(...WEEKS, 1);
  const busiest = PEOPLE[0].open;

  return (
    <div className="pointer-events-none select-none" aria-hidden>
      {/* Forced light: it represents a screen, and a screenshot that changed colour with the
          viewer's theme would stop reading as one. */}
      <div data-theme="light" className="flex w-[1000px] overflow-hidden bg-[#fbfbfa]">
        {/* ------------------------------------------------- the real sidebar */}
        <div className="flex w-[150px] shrink-0 flex-col bg-[#101014] px-2 py-2.5">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-accent">
              <svg viewBox="0 0 16 16" className="h-3 w-3">
                <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="#fff" opacity="0.55" />
                <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="#fff" opacity="0.8" />
                <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="#fff" />
              </svg>
            </span>
            <span>
              <span className="block text-[10px] font-semibold leading-tight text-white">Cadence</span>
              <span className="block text-[7px] leading-tight text-[#6b6b78]">Delivery, in view</span>
            </span>
          </div>

          <div className="mb-2.5 flex items-center gap-1.5 rounded bg-[#1a1a20] px-1.5 py-1 text-[8px] text-[#6b6b78]">
            <span>Search…</span>
            <span className="ml-auto rounded border border-[#26262e] px-1 font-mono text-[7px]">⌘K</span>
          </div>

          {NAV.map((n) => (
            <div
              key={n.label}
              className={`mb-0.5 flex items-center gap-1.5 rounded px-1.5 py-1 text-[9px] ${
                n.active ? 'bg-[#26263a] font-medium text-white' : 'text-[#9a9aa6]'
              }`}
            >
              <span className={`h-2 w-2 rounded-[2px] ${n.active ? 'bg-white/70' : 'bg-white/20'}`} />
              {n.label}
              {n.badge && (
                <span className="ml-auto rounded-full bg-[#c0362c]/20 px-1 text-[7px] font-semibold text-[#f28b82]">
                  {n.badge}
                </span>
              )}
            </div>
          ))}

          <p className="mb-1 mt-3 px-1.5 text-[7px] uppercase tracking-[0.08em] text-[#6b6b78]">Portfolio</p>
          {NAV_PORTFOLIO.map((n) => (
            <div key={n.label} className="mb-0.5 flex items-center gap-1.5 rounded px-1.5 py-1 text-[9px] text-[#9a9aa6]">
              <span className="h-2 w-2 rounded-[2px] bg-white/20" />
              {n.label}
            </div>
          ))}

          <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 pt-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e9e5fd] text-[6px] font-semibold text-[#4b3cc0]">
              PR
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[8px] text-white">Priya Raman</span>
              <span className="block text-[7px] text-[#6b6b78]">Manager</span>
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------- the body */}
        <div className="min-w-0 flex-1 p-3">
          {/* the real hero sentence */}
          <div className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <p className="text-[7px] font-medium uppercase tracking-[0.1em] text-ink-3">Portfolio · Afternoon</p>
            <p className="mt-1.5 text-[14px] font-semibold leading-snug tracking-[-0.02em] text-ink">
              Priya, you have <span className="text-accent">24</span> open tasks, and{' '}
              <span className="text-danger">7</span> of them are already late.
            </p>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-lg border bg-surface px-2 py-1.5 ${
                  s.tone === 'danger' ? 'border-danger-line' : 'border-line'
                }`}
              >
                <p className="text-[8px] text-ink-2">{s.label}</p>
                <p
                  className={`mt-0.5 text-[17px] font-semibold leading-none tabular-nums ${
                    s.tone === 'danger' ? 'text-danger' : s.tone === 'good' ? 'text-good' : 'text-ink'
                  }`}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[7px] text-ink-3">{s.note}</p>
              </div>
            ))}
          </div>

          {/* the portfolio strip — the dashboard's signature module */}
          <div className="mt-1.5 rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-3 py-1.5">
              <p className="text-[9px] font-semibold text-ink">The portfolio</p>
              <p className="text-[7px] text-ink-2">One line per project, ordered by how much is already late.</p>
            </div>
            <ul className="divide-y divide-line">
              {PORTFOLIO.map((p) => (
                <li key={p.key} className="flex items-center gap-2 px-3 py-[5px]">
                  <span className="w-[42px] shrink-0 rounded bg-accent-soft px-1 text-center font-mono text-[7px] font-medium text-accent">
                    {p.key}
                  </span>
                  <span className="w-[104px] shrink-0 truncate text-[8px] text-ink">{p.name}</span>
                  <span className="flex h-[6px] flex-1 gap-px overflow-hidden rounded-full bg-sunk">
                    <span className="h-full bg-danger" style={{ width: `${p.seg[0]}%` }} />
                    <span className="h-full bg-warn" style={{ width: `${p.seg[1]}%` }} />
                    <span className="h-full bg-accent" style={{ width: `${p.seg[2]}%` }} />
                    <span className="h-full bg-good/45" style={{ width: `${p.seg[3]}%` }} />
                  </span>
                  <span className="w-[54px] shrink-0 text-right text-[7px] tabular-nums text-ink-2">
                    {p.open} open
                    {p.late > 0 && <span className="ml-1 font-medium text-danger">{p.late} late</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-1.5 grid grid-cols-[1.5fr_1fr] gap-1.5">
            {/* throughput, as the real area chart */}
            <div className="rounded-lg border border-line bg-surface p-2.5">
              <p className="text-[9px] font-semibold text-ink">Throughput</p>
              <p className="text-[7px] text-ink-2">Tasks finished each week. Weeks with none are still plotted.</p>
              <svg viewBox="0 0 240 56" className="mt-1.5 h-[56px] w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pp-tp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = WEEKS.map((w, i) => [
                    (i / (WEEKS.length - 1)) * 240,
                    56 - (w / peak) * 44 - 6,
                  ]);
                  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                  return (
                    <>
                      <path d={`${line} L240,56 L0,56 Z`} fill="url(#pp-tp)" />
                      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* by status — bars, which is what the product draws */}
            <div className="rounded-lg border border-line bg-surface p-2.5">
              <p className="text-[9px] font-semibold text-ink">By status</p>
              <ul className="mt-1.5 space-y-[5px]">
                {BY_STATUS.map((s) => (
                  <li key={s.label} className="flex items-center gap-1.5">
                    <span className="w-[46px] shrink-0 text-[7px] text-ink-2">{s.label}</span>
                    <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-sunk">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="w-3 text-right text-[7px] tabular-nums text-ink-2">{s.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* who is carrying what */}
          <div className="mt-1.5 rounded-lg border border-line bg-surface p-2.5">
            <p className="text-[9px] font-semibold text-ink">Who is carrying what</p>
            <p className="text-[7px] text-ink-2">Open tasks per person. The red segment is already late.</p>
            <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-[5px]">
              {PEOPLE.map((p) => (
                <li key={p.name} className="flex items-center gap-1.5">
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#d6e8fb] text-[6px] font-semibold text-[#15549e]">
                    {p.initials}
                  </span>
                  <span className="w-[62px] shrink-0 truncate text-[7px] text-ink">{p.name}</span>
                  <span className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-sunk">
                    <span className="h-full bg-danger" style={{ width: `${(p.overdue / busiest) * 100}%` }} />
                    <span className="h-full bg-accent" style={{ width: `${((p.open - p.overdue) / busiest) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right text-[7px] tabular-nums text-ink-2">{p.open}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
