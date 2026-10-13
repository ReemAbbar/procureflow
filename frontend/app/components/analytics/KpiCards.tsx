import type { ComponentType } from 'react';
import type { Analytics, Kpis, Trend } from '../../lib/analytics';
import { formatCurrency } from '../../lib/format';
import { CheckCircleIcon, ClockIcon, DollarIcon, PercentIcon, TrendDownIcon, TrendUpIcon } from '../icons';

type Card = {
  key: keyof Kpis;
  label: string;
  format: (v: Kpis[keyof Kpis]) => string;
  icon: ComponentType<{ className?: string }>;
  iconStyle: string;
  upIsGood: boolean;
};

const cards: Card[] = [
  {
    key: 'totalSpend',
    label: 'Total Spend',
    format: (v) => formatCurrency(v ?? 0),
    icon: DollarIcon,
    iconStyle: 'bg-blue-50 text-blue-600',
    upIsGood: true,
  },
  {
    key: 'avgRequestValue',
    label: 'Avg Request Value',
    format: (v) => formatCurrency(v ?? 0),
    icon: CheckCircleIcon,
    iconStyle: 'bg-indigo-50 text-indigo-600',
    upIsGood: true,
  },
  {
    key: 'approvalRate',
    label: 'Approval Rate',
    format: (v) => `${(v ?? 0).toFixed(0)}%`,
    icon: PercentIcon,
    iconStyle: 'bg-emerald-50 text-emerald-600',
    upIsGood: true,
  },
  {
    key: 'avgProcessingDays',
    label: 'Avg Processing Time',
    format: (v) => (v === null ? '—' : v < 1 ? `${(v * 24).toFixed(1)} hrs` : `${v.toFixed(1)} days`),
    icon: ClockIcon,
    iconStyle: 'bg-amber-50 text-amber-600',
    upIsGood: false, // faster approvals are better
  },
];

function TrendIndicator({ trend, upIsGood }: { trend: Trend; upIsGood: boolean }) {
  if (trend === null) return <span className="text-xs text-slate-400">No change vs prior 30 days</span>;
  if (trend === 'new') return <span className="text-xs font-medium text-blue-600">New activity this month</span>;

  const up = trend.delta >= 0;
  const good = up === upIsGood;
  const ArrowIcon = up ? TrendUpIcon : TrendDownIcon;
  const suffix = trend.unit === '%' ? '%' : trend.unit === 'pts' ? ' pts' : ' days';
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
          good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}
      >
        <ArrowIcon className="h-3.5 w-3.5" />
        {up ? '+' : ''}
        {trend.delta.toFixed(1)}
        {suffix}
      </span>
      <span className="text-slate-400">vs prior 30 days</span>
    </span>
  );
}

export default function KpiCards({ analytics }: { analytics: Analytics | null }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, format, icon: CardIcon, iconStyle, upIsGood }) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {analytics ? format(analytics.kpis[key]) : <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" />}
              </p>
            </div>
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconStyle}`}>
              <CardIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            {analytics ? (
              <TrendIndicator trend={analytics.trends[key]} upIsGood={upIsGood} />
            ) : (
              <span className="text-xs text-slate-400">Loading…</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
