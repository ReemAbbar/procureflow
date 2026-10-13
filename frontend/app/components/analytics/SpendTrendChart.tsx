'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Analytics } from '../../lib/analytics';
import { formatCompactCurrency, formatCurrency } from '../../lib/format';
import { axisProps, ChartPlaceholder, tooltipProps } from './ChartCard';

// Validated pair (dataviz validator): distinct for CVD; legend + tooltip carry identity.
const SERIES = [
  { key: 'requested', name: 'Requested', color: '#2563eb' },
  { key: 'approved', name: 'Approved', color: '#10b981' },
] as const;

export default function SpendTrendChart({ data }: { data: Analytics['monthly'] | null }) {
  if (!data) return <ChartPlaceholder />;
  if (data.every((m) => m.requested === 0)) {
    return <ChartPlaceholder message="No spend in the last 6 months" />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={64} tickFormatter={(v: number) => formatCompactCurrency(v)} />
        <Tooltip
          {...tooltipProps}
          cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 13, color: '#334155' }}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: s.color }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
