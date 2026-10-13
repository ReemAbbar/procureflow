'use client';

import RequireRole from '../components/RequireRole';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { RfqStatusBadge } from '../components/StageBadges';
import { useApi } from '../lib/useApi';
import { formatDate } from '../lib/format';
import type { RFQ } from '../lib/types';

function RfqsPageContent() {
  const { data, loading, error } = useApi<RFQ[]>('/api/rfqs');
  const rfqs = data ?? [];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Requests for Quotation"
        subtitle="Collect and compare vendor quotes for approved purchase requests."
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">Loading RFQs…</p>
        ) : error ? (
          <EmptyState variant="error" title="Couldn’t load RFQs" message={error} />
        ) : rfqs.length === 0 ? (
          <EmptyState
            variant="empty"
            title="No RFQs yet"
            message="Approve a purchase request, then use “Send RFQ” on it to invite vendors to quote."
            action={
              <Link
                href="/requests"
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Go to requests
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Vendors</th>
                  <th className="px-5 py-3">Quotes</th>
                  <th className="px-5 py-3">Deadline</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfqs.map((rfq) => {
                  const quoted = rfq.vendors.filter((v) => v.status === 'quoted').length;
                  return (
                    <tr key={rfq._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <Link href={`/rfq/${rfq._id}`} className="font-medium text-slate-900 hover:text-blue-600 hover:underline">
                          {rfq.requestId?.itemName ?? 'Deleted request'}
                        </Link>
                        {rfq.requestId && (
                          <p className="text-xs text-slate-500">
                            {rfq.requestId.quantity.toLocaleString()} units · {rfq.requestId.department ?? '—'}
                          </p>
                        )}
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-slate-700">
                        {rfq.vendors.map((v) => v.name).join(', ')}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-700">
                        {quoted} of {rfq.vendors.length}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{formatDate(rfq.deadline)}</td>
                      <td className="px-5 py-4">
                        <RfqStatusBadge status={rfq.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(rfq.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/rfq/${rfq._id}`} className="text-xs font-medium text-blue-600 hover:underline">
                          {rfq.status === 'awarded' ? 'View' : 'Manage'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function RfqsPage() {
  return (
    <RequireRole permission="rfqs.manage">
      <RfqsPageContent />
    </RequireRole>
  );
}
