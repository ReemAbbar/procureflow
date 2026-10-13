import type { ReactNode } from 'react';

export default function ChartCard({
  title,
  subtitle,
  className = '',
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartPlaceholder({ height = 280, message }: { height?: number; message?: string }) {
  return (
    <div
      style={{ height }}
      className={`flex items-center justify-center rounded-lg text-sm text-slate-400 ${message ? 'bg-slate-50' : 'animate-pulse bg-slate-100'}`}
    >
      {message}
    </div>
  );
}

// Shared recharts styling: recessive grid and axes, text in ink colors.
export const axisProps = {
  stroke: '#94a3b8',
  tick: { fill: '#64748b', fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export const tooltipProps = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
    fontSize: 13,
  },
  labelStyle: { color: '#0f172a', fontWeight: 600, marginBottom: 4 },
} as const;
