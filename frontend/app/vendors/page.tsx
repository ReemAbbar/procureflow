'use client';

import RequireRole from '../components/RequireRole';
import { useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import NewRequestButton from '../components/NewRequestButton';
import { StarIcon, VendorsIcon } from '../components/icons';
import { useRequests } from '../lib/useRequests';
import { formatCurrency, formatDate } from '../lib/format';
import { requestTotal } from '../lib/types';

type Vendor = {
  name: string;
  requests: number;
  totalSpend: number;
  approvedSpend: number;
  approved: number;
  pending: number;
  rejected: number;
  lastRequest: string;
};

function VendorsPageContent() {
  const { requests, loading, error } = useRequests();

  // Vendors are derived from the preferredVendor field on each request,
  // grouped case-insensitively so "ikea" and "IKEA" count as one vendor.
  const vendors = useMemo(() => {
    const byKey = new Map<string, Vendor>();
    for (const r of requests) {
      const name = r.preferredVendor.trim() || 'Unspecified';
      const key = name.toLowerCase();
      const v = byKey.get(key) ?? {
        name,
        requests: 0,
        totalSpend: 0,
        approvedSpend: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        lastRequest: r.createdAt,
      };
      const amount = requestTotal(r);
      v.requests++;
      v.totalSpend += amount;
      v[r.status]++;
      if (r.status === 'approved') v.approvedSpend += amount;
      if (r.createdAt > v.lastRequest) v.lastRequest = r.createdAt;
      byKey.set(key, v);
    }
    return [...byKey.values()].sort((a, b) => b.totalSpend - a.totalSpend);
  }, [requests]);

  const topVendor = vendors[0]?.totalSpend > 0 ? vendors[0].name : null;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Vendors"
        subtitle={
          vendors.length
            ? `${vendors.length} supplier${vendors.length === 1 ? '' : 's'} referenced in your purchase requests, ranked by spend.`
            : 'Suppliers referenced in your purchase requests.'
        }
      />

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading vendors…</p>
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState variant="error" title="Couldn’t load vendors" message={error} />
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            variant="empty"
            title="No vendors yet"
            message="Vendors appear here once you submit purchase requests."
            action={<NewRequestButton />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard key={v.name} vendor={v} isTop={v.name === topVendor} />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorCard({ vendor: v, isTop }: { vendor: Vendor; isTop: boolean }) {
  const pct = (n: number) => (v.requests ? (n / v.requests) * 100 : 0);

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
        isTop ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
            <VendorsIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">{v.name}</h2>
            <p className="text-xs text-slate-500">Last request {formatDate(v.lastRequest)}</p>
          </div>
        </div>
        {isTop && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            <StarIcon className="h-3.5 w-3.5" />
            Top Vendor
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-slate-500">Total spend</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">
            {formatCurrency(v.totalSpend)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total requests</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">{v.requests}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${pct(v.approved)}%` }} />
          <div className="bg-amber-400" style={{ width: `${pct(v.pending)}%` }} />
          <div className="bg-red-400" style={{ width: `${pct(v.rejected)}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {v.approved} approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {v.pending} pending
          </span>
          {v.rejected > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {v.rejected} rejected
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Approved spend: <span className="font-medium text-emerald-700">{formatCurrency(v.approvedSpend)}</span>
        </p>
      </div>
    </article>
  );
}

export default function VendorsPage() {
  return (
    <RequireRole permission="vendors.view">
      <VendorsPageContent />
    </RequireRole>
  );
}
