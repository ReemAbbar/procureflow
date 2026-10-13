'use client';

import RequireRole from '../components/RequireRole';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { PoStatusBadge } from '../components/StageBadges';
import { useApi } from '../lib/useApi';
import { formatCurrency, formatDate } from '../lib/format';
import type { PurchaseOrder } from '../lib/types';
import { poGrandTotal } from '../lib/types';

function PurchaseOrdersPageContent() {
  const { data, loading, error } = useApi<PurchaseOrder[]>('/api/purchase-orders');
  const orders = data ?? [];
  const committed = orders.reduce((sum, po) => sum + poGrandTotal(po), 0);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Purchase Orders"
        subtitle={
          orders.length
            ? `${orders.length} order${orders.length === 1 ? '' : 's'} · ${formatCurrency(committed)} committed incl. VAT`
            : 'Orders generated from awarded RFQs.'
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">Loading purchase orders…</p>
        ) : error ? (
          <EmptyState variant="error" title="Couldn’t load purchase orders" message={error} />
        ) : orders.length === 0 ? (
          <EmptyState
            variant="empty"
            title="No purchase orders yet"
            message="A purchase order is created automatically when you award an RFQ to a vendor."
            action={
              <Link
                href="/rfqs"
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Go to RFQs
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">PO Number</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Total (incl. VAT)</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/purchase-orders/${po._id}`}
                        className="font-mono text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{po.vendor.name}</p>
                      {po.vendor.email && <p className="text-xs text-slate-500">{po.vendor.email}</p>}
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-slate-700">
                      {po.items.map((i) => `${i.itemName} × ${i.quantity.toLocaleString()}`).join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(poGrandTotal(po))}
                    </td>
                    <td className="px-5 py-4">
                      <PoStatusBadge status={po.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(po.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/purchase-orders/${po._id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <RequireRole permission="pos.manage">
      <PurchaseOrdersPageContent />
    </RequireRole>
  );
}
