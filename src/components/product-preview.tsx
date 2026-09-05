/**
 * A miniature of the real application, shown on the landing page.
 *
 * It renders the whole shell — dark sidebar, greeting, headline metrics, both charts and the three
 * lists — rather than a slice of it, because the point of a product shot is to show the product.
 * Everything here mirrors what the signed-in dashboard actually renders.
 *
 * Static by design: this page is public, so live rows would leak the shape of a real portfolio to
 * anybody who loaded the URL. The figures match the seeded demo, so what a visitor sees here is what
 * they get when they sign in.
 */

const NAV = ['Dashboard', 'My Tasks', 'Projects', 'All Tasks', 'Alerts', 'Reports'];

const STATS = [
  { label: 'Open Tasks', value: '128', delta: '+12% vs last week', tone: 'ink', up: true },
  { label: 'Overdue', value: '23', delta: '+8% vs last week', tone: 'danger', up: false },
  { label: 'Due This Week', value: '48', delta: '+5% vs last week', tone: 'ink', up: true },
  { label: 'Completed This Week', value: '36', delta: '+15% vs last week', tone: 'good', up: true },
];

const BY_STATUS = [
  { label: 'Backlog', n: 38, colour: '#c7c9d4' },
  { label: 'In Progress', n: 42, colour: '#5b4bdb' },
  { label: 'In Review', n: 24, colour: '#d9a441' },
  { label: 'Blocked', n: 14, colour: '#c0362c' },
  { label: 'Done', n: 10, colour: '#4f9f7f' },
];

const WEEKS = [22, 30, 18, 34, 26, 40, 31, 44];

const OVERDUE = [
  ['API rate limiting', '2d'], ['Design system audit', '1d'], ['User onboarding flow', '3d'],
  ['Database optimization', '3d'], ['Marketing site copy', '5d'],
];
const MINE = [
  ['User onboarding flow', 'In Progress'], ['Design system audit', 'In Review'],
  ['API rate limiting', 'In Review'], ['Analytics dashboard', 'Backlog'],
  ['Email notifications', 'In Progress'],
];
const PROJECTS = [
  ['Website Redesign', 'In Progress'], ['Platform Migration', 'In Review'],
  ['Mobile App', 'In Progress'], ['Data Platform', 'Backlog'], ['Marketing Site', 'Backlog'],
];

/** A donut, drawn with stroke-dasharray so it needs no charting library. */
function Donut() {
  const total = BY_STATUS.reduce((n, s) => n + s.n, 0);
  const r = 34;
  const c = 2 * Math.PI * r;
  const segments = BY_STATUS.reduce<{ label: string; colour: string; len: number; offset: number }[]>(
    (acc, s) => {
      const previous = acc[acc.length - 1];
      const offset = previous ? previous.offset + previous.len : 0;
      return [...acc, { label: s.label, colour: s.colour, len: (s.n / total) * c, offset }];
    },
    [],
  );

  return (
    <svg viewBox="0 0 90 90" className="h-[92px] w-[92px] -rotate-90" aria-hidden>
      {segments.map((s) => (
        <circle
          key={s.label}
          cx="45" cy="45" r={r}
          fill="none" stroke={s.colour} strokeWidth="11"
          strokeDasharray={`${s.len - 1.5} ${c - s.len + 1.5}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  );
}

export function ProductPreview() {
  const peak = Math.max(...WEEKS);

  return (
    <div className="pointer-events-none select-none" aria-hidden>
      {/* Forced light: it represents a screen, and a screenshot that changed colour with the
          viewer's theme would stop reading as one. */}
      <div data-theme="light" className="flex w-[1000px] overflow-hidden rounded-xl bg-surface">
        {/* ---------------------------------------------------------- sidebar */}
        <div className="w-[168px] shrink-0 bg-[#101014] px-2.5 py-3">
          <div className="mb-4 flex items-center gap-1.5 px-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-accent">
              <svg viewBox="0 0 16 16" className="h-3 w-3">
                <rect x="3" y="9" width="2.6" height="4" rx="1.3" fill="#fff" opacity="0.55" />
                <rect x="6.7" y="6" width="2.6" height="7" rx="1.3" fill="#fff" opacity="0.8" />
                <rect x="10.4" y="3" width="2.6" height="10" rx="1.3" fill="#fff" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold text-white">cadence</span>
          </div>
          {NAV.map((item, i) => (
            <div
              key={item}
              className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-[5px] text-[10px] ${
                i === 0 ? 'bg-[#26263a] text-white' : 'text-[#9a9aa6]'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-[3px] ${i === 0 ? 'bg-white/70' : 'bg-white/20'}`} />
              {item}
            </div>
          ))}
          <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 pt-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e9e5fd] text-[8px] font-semibold text-[#4b3cc0]">
              OR
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[9px] text-white">Olivia Rhye</span>
              <span className="block truncate text-[8px] text-[#6b6b78]">olivia@acme.com</span>
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------ body */}
        <div className="min-w-0 flex-1 bg-[#fbfbfa] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ink">Good morning, Olivia</p>
              <p className="mt-0.5 text-[9px] text-ink-2">Here’s what’s happening across your projects.</p>
            </div>
            <span className="rounded-md border border-line bg-surface px-2 py-1 text-[9px] text-ink-2">
              May 13 – May 19
            </span>
          </div>

          {/* metrics */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-lg border bg-surface px-2.5 py-2 ${
                  s.tone === 'danger' ? 'border-danger-line' : 'border-line'
                }`}
              >
                <p className="text-[9px] text-ink-2">{s.label}</p>
                <p
                  className={`mt-1 text-[19px] font-semibold leading-none tabular-nums ${
                    s.tone === 'danger' ? 'text-danger' : s.tone === 'good' ? 'text-good' : 'text-ink'
                  }`}
                >
                  {s.value}
                </p>
                <p className={`mt-1.5 text-[8px] ${s.up ? 'text-good' : 'text-danger'}`}>
                  {s.up ? '↑' : '↓'} {s.delta}
                </p>
              </div>
            ))}
          </div>

          {/* charts */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line bg-surface p-2.5">
              <p className="text-[10px] font-semibold text-ink">Tasks by Status</p>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="relative">
                  <Donut />
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums text-ink">
                    128
                  </span>
                </div>
                <ul className="flex-1 space-y-[3px]">
                  {BY_STATUS.map((s) => (
                    <li key={s.label} className="flex items-center gap-1.5 text-[9px]">
                      <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: s.colour }} />
                      <span className="flex-1 text-ink-2">{s.label}</span>
                      <span className="tabular-nums text-ink">{s.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-2.5">
              <p className="text-[10px] font-semibold text-ink">Completed (last 8 weeks)</p>
              <div className="mt-2 flex h-[92px] items-end gap-1.5">
                {WEEKS.map((w, i) => (
                  <span key={i} className="flex-1 rounded-t-[2px] bg-accent/85" style={{ height: `${(w / peak) * 100}%` }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[7px] text-ink-3">
                {['Mar 24', 'Mar 31', 'Apr 7', 'Apr 14', 'Apr 21', 'Apr 28', 'May 5', 'May 12'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* three lists */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ListCard title="Overdue Tasks" rows={OVERDUE} tone="danger" />
            <ListCard title="My Tasks" rows={MINE} />
            <ListCard title="Projects at a glance" rows={PROJECTS} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: (readonly [string, string])[] | string[][];
  tone?: 'danger';
}) {
  const chip = (v: string) =>
    v === 'In Progress' ? 'bg-info-soft text-info'
      : v === 'In Review' ? 'bg-warn-soft text-warn'
      : v === 'Backlog' ? 'bg-surface-2 text-ink-2'
      : 'bg-danger-soft text-danger';

  return (
    <div className="rounded-lg border border-line bg-surface p-2.5">
      <p className="text-[10px] font-semibold text-ink">{title}</p>
      <ul className="mt-1.5 space-y-[5px]">
        {rows.map(([label, meta]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'danger' ? 'bg-danger' : 'bg-ink-3'}`} />
            <span className="min-w-0 flex-1 truncate text-[9px] text-ink">{label}</span>
            <span className={`shrink-0 rounded px-1 py-px text-[8px] ${tone === 'danger' ? 'text-danger' : chip(meta)}`}>
              {meta}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[8px] text-accent">View all →</p>
    </div>
  );
}
