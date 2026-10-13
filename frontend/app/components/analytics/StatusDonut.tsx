'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Analytics } from '../../lib/analytics';
import type { Status } from '../../lib/types';
import { ChartPlaceholder, tooltipProps } from './ChartCard';

// Status colors (validated); they sit below 3:1 contrast, so the labelled
// legend with counts below is required, not decorative.
const SLICES: { key: Status; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'approved', label: 'Approved', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
];

export default function StatusDonut({ counts }: { counts: Analytics['statusCounts'] | null }) {
  if (!counts) return <ChartPlaceholder height={240} />;
  const total = counts.pending + counts.approved + counts.rejected;
  if (total === 0) return <ChartPlaceholder height={240} message="No requests yet" />;

  const data = SLICES.map((s) => ({ ...s, value: counts[s.key] })).filter((d) => d.value > 0);

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="#fff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} formatter={(value) => `${value} request${value === 1 ? '' : 's'}`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">requests</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {SLICES.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums text-slate-900">
              <span className="font-medium">{counts[s.key]}</span>
              <span className="ml-2 text-slate-400">{((counts[s.key] / total) * 100).toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
