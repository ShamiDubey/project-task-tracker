'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function CompletionsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="h-56 w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eaecf0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#667085' }}
            tickLine={false}
            axisLine={{ stroke: '#e4e7ec' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#667085' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f2f4f7' }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e4e7ec',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
            }}
            labelFormatter={(l) => `Week of ${l}`}
            formatter={(v) => [String(v ?? 0), 'Completed']}
          />
          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
