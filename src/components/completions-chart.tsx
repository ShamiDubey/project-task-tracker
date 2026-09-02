'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Completions over the last eight weeks.
 *
 * An area chart rather than bars: the question is "is throughput holding up", which is a shape
 * question, and a trend line answers it faster than eight columns to be compared pairwise. The fill
 * is a single low-opacity gradient in the brand colour — the chart is not a status readout, so it
 * has no business borrowing red, amber or green.
 */
export function CompletionsChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="px-1 pb-2 pt-4">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 14, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="completions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              dy={4}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.max(peak + 1, 3)]}
              tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 12,
                boxShadow: 'var(--shadow-e2)',
                padding: '6px 10px',
              }}
              labelStyle={{ color: 'var(--ink-3)', fontSize: 11, marginBottom: 2 }}
              labelFormatter={(l) => `Week of ${l}`}
              formatter={(v) => [String(v ?? 0), 'Completed']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#completions)"
              dot={{ r: 2.5, fill: 'var(--surface)', stroke: 'var(--accent)', strokeWidth: 1.6 }}
              activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="px-3 pt-1 text-2xs text-ink-3">
        <span className="tnum font-medium text-ink-2">{total}</span> completed in the last eight
        weeks · peak week <span className="tnum font-medium text-ink-2">{peak}</span>
      </p>
    </div>
  );
}
