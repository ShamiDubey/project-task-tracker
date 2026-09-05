/**
 * A miniature of the real interface, shown beside the sign-in form.
 *
 * The previous version of this page described the product in prose over an abstract particle field.
 * This shows it instead — the same hero sentence, the same stat tiles, the same portfolio bars the
 * dashboard actually renders, at 78% scale on a tilted plane.
 *
 * Static by design. It is an illustration of the product, not a live view: the sign-in page is
 * unauthenticated, and rendering real rows there would leak the shape of a customer's portfolio to
 * anybody who loaded the URL.
 */
const PROJECTS = [
  { key: 'HELIO', name: 'Helio Brand Refresh', late: 42, blocked: 0, open: 34, done: 24, openN: 5, lateN: 3 },
  { key: 'ACME', name: 'Acme Retail Replatform', late: 16, blocked: 9, open: 33, done: 42, openN: 7, lateN: 2 },
  { key: 'ORBIT', name: 'Orbit Payments', late: 14, blocked: 0, open: 46, done: 40, openN: 4, lateN: 1 },
  { key: 'NOVA', name: 'Nova Health App', late: 12, blocked: 11, open: 35, done: 42, openN: 5, lateN: 1 },
  { key: 'VERTEX', name: 'Vertex Data Migration', late: 0, blocked: 0, open: 38, done: 62, openN: 2, lateN: 0 },
];

const STATS = [
  { label: 'Open tasks', value: '24', tone: 'ink' },
  { label: 'Overdue', value: '7', tone: 'danger' },
  { label: 'Due this week', value: '2', tone: 'ink' },
  { label: 'Completed', value: '2', tone: 'good' },
];

export function ProductPreview() {
  return (
    <div className="pointer-events-none select-none" aria-hidden>
      {/* Forced to the light palette. It represents a screen, and a screen that changed colour with
          the viewer's theme would stop reading as a screenshot of the product. */}
      <div
        data-theme="light"
        className="w-[760px] origin-top-left rounded-2xl border border-line bg-surface p-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.5)]"
      >
        {/* The hero sentence, exactly as the dashboard states it. */}
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-3">
          Portfolio · Afternoon
        </p>
        <p className="mt-2 max-w-[640px] text-[18px] font-semibold leading-snug tracking-[-0.02em] text-ink">
          Priya, you have <span className="text-accent">24</span> open tasks, and{' '}
          <span className="text-danger">7</span> of them are already late.
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border px-3 py-2.5 ${
                s.tone === 'danger' ? 'border-danger-line bg-danger-soft/40' : 'border-line bg-surface'
              }`}
            >
              <p className="text-[10px] font-medium text-ink-2">{s.label}</p>
              <p
                className={`mt-1 text-xl font-semibold leading-none tabular-nums ${
                  s.tone === 'danger' ? 'text-danger' : s.tone === 'good' ? 'text-good' : 'text-ink'
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-line">
          <div className="border-b border-line px-3.5 py-2.5">
            <p className="text-[11px] font-semibold text-ink">The portfolio</p>
            <p className="text-[10px] text-ink-2">One line per project, ordered by how much is already late.</p>
          </div>
          <ul className="divide-y divide-line">
            {PROJECTS.map((p) => (
              <li key={p.key} className="flex items-center gap-2.5 px-3.5 py-[9px]">
                <span className="w-[52px] shrink-0 rounded bg-accent-soft px-1 py-0.5 text-center font-mono text-[9px] font-medium text-accent">
                  {p.key}
                </span>
                <span className="w-[124px] shrink-0 truncate text-[11px] text-ink">{p.name}</span>
                <span className="flex h-[7px] flex-1 gap-px overflow-hidden rounded-full bg-sunk">
                  <span className="h-full bg-danger" style={{ width: `${p.late}%` }} />
                  <span className="h-full bg-warn" style={{ width: `${p.blocked}%` }} />
                  <span className="h-full bg-accent" style={{ width: `${p.open}%` }} />
                  <span className="h-full bg-good/45" style={{ width: `${p.done}%` }} />
                </span>
                <span className="w-[68px] shrink-0 text-right text-[10px] tabular-nums text-ink-2">
                  {p.openN} open
                  {p.lateN > 0 && <span className="ml-1 font-medium text-danger">{p.lateN} late</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
