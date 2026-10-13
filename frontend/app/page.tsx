'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from './components/RoleProvider';
import RequestsTable from './components/RequestsTable';
import PageHeader from './components/PageHeader';
import NewRequestButton from './components/NewRequestButton';
import KpiCards from './components/analytics/KpiCards';
import ChartCard from './components/analytics/ChartCard';
import SpendTrendChart from './components/analytics/SpendTrendChart';
import StatusDonut from './components/analytics/StatusDonut';
import { useRequests } from './lib/useRequests';
import { computeAnalytics } from './lib/analytics';

export default function Home() {
  const { can } = useRole();
  const router = useRouter();
  const allowed = can('dashboard.view');

  // Requesters have no dashboard; send them to their own requests.
  useEffect(() => {
    if (!allowed) router.replace('/requests');
  }, [allowed, router]);

  return allowed ? <Dashboard /> : null;
}

function Dashboard() {
  const { requests, loading, error, updateStatus } = useRequests();
  // computeAnalytics reads the clock, so only run it once data has loaded client-side.
  const analytics = useMemo(
    () => (loading || error ? null : computeAnalytics(requests)),
    [loading, error, requests]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of purchase requests and spend across your organization."
        actions={<NewRequestButton />}
      />

      <KpiCards analytics={analytics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Monthly spend"
          subtitle="Requested vs approved, last 6 months"
          className="lg:col-span-2"
        >
          <SpendTrendChart data={analytics?.monthly ?? null} />
        </ChartCard>
        <ChartCard title="Request status">
          <StatusDonut counts={analytics?.statusCounts ?? null} />
        </ChartCard>
      </div>

      <div className="flex justify-end">
        <Link href="/analytics" className="text-sm font-medium text-blue-600 hover:underline">
          View full analytics →
        </Link>
      </div>

      <RequestsTable
        title="Purchase Requests"
        requests={requests}
        loading={loading}
        error={error}
        onStatusChange={updateStatus}
      />
    </div>
  );
}
