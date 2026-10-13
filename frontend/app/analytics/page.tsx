'use client';

import RequireRole from '../components/RequireRole';
import { useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import KpiCards from '../components/analytics/KpiCards';
import ChartCard from '../components/analytics/ChartCard';
import SpendTrendChart from '../components/analytics/SpendTrendChart';
import DepartmentSpendChart from '../components/analytics/DepartmentSpendChart';
import StatusDonut from '../components/analytics/StatusDonut';
import { useRequests } from '../lib/useRequests';
import { computeAnalytics } from '../lib/analytics';
import { formatCurrency } from '../lib/format';

function AnalyticsPageContent() {
  const { requests, loading, error } = useRequests();
  // computeAnalytics reads the clock, so only run it once data has loaded client-side.
  const analytics = useMemo(
    () => (loading || error ? null : computeAnalytics(requests)),
    [loading, error, requests]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Spend Analytics" subtitle="Where money is going, and how fast requests are processed." />

      {error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState variant="error" title="Couldn’t load analytics" message={error} />
        </div>
      ) : (
        <>
          <KpiCards analytics={analytics} />

          <ChartCard title="Monthly spend" subtitle="Requested vs approved value by month created, last 6 months">
            <SpendTrendChart data={analytics?.monthly ?? null} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Spend by department" subtitle="Total requested value" className="lg:col-span-2">
              <DepartmentSpendChart data={analytics?.byDepartment ?? null} />
            </ChartCard>
            <ChartCard title="Request status" subtitle="All requests">
              <StatusDonut counts={analytics?.statusCounts ?? null} />
            </ChartCard>
          </div>

          {analytics && analytics.byDepartment.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h2 className="border-b border-slate-200 px-5 py-4 text-base font-semibold text-slate-900">
                Department breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3 text-right">Requests</th>
                      <th className="px-5 py-3 text-right">Total spend</th>
                      <th className="px-5 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.byDepartment.map((d) => (
                      <tr key={d.department}>
                        <td className="px-5 py-3 font-medium text-slate-900">{d.department}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">{d.count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-900">{formatCurrency(d.spend)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                          {analytics.kpis.totalSpend
                            ? `${((d.spend / analytics.kpis.totalSpend) * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireRole permission="analytics.view">
      <AnalyticsPageContent />
    </RequireRole>
  );
}
