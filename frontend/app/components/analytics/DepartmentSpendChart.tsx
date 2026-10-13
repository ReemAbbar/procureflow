'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Analytics } from '../../lib/analytics';
import { formatCompactCurrency, formatCurrency } from '../../lib/format';
import { axisProps, ChartPlaceholder, tooltipProps } from './ChartCard';

export default function DepartmentSpendChart({ data }: { data: Analytics['byDepartment'] | null }) {
  if (!data) return <ChartPlaceholder />;
  if (data.length === 0) return <ChartPlaceholder message="No requests yet" />;

  // Horizontal bars keep department names readable; height grows with row count.
  const height = Math.max(200, data.length * 48 + 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(v: number) => formatCompactCurrency(v)} />
        <YAxis type="category" dataKey="department" {...axisProps} width={96} />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: '#f1f5f9' }}
          formatter={(value, _name, item) => [
            `${formatCurrency(Number(value))} · ${item.payload.count} request${item.payload.count === 1 ? '' : 's'}`,
            'Spend',
          ]}
        />
        <Bar dataKey="spend" name="Spend" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
