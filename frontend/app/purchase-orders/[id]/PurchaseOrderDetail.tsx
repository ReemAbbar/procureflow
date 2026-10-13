'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import { PO_STAGES, PoStatusBadge, StageTracker } from '../../components/StageBadges';
import { useToast } from '../../components/Toast';
import { ArrowLeftIcon, LogoMark, PrinterIcon } from '../../components/icons';
import { apiFetch, emitDataChanged } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatDate } from '../../lib/format';
import type { POStatus, PurchaseOrder } from '../../lib/types';
import { poGrandTotal, poVat, VAT_RATE } from '../../lib/types';

// Buyer details printed on the PO document.
const COMPANY = {
  name: 'Batelco Group',
  address: ['Batelco Building, Hamad Town', 'Kingdom of Bahrain'],
  crNumber: '12345',
};

const NEXT_ACTION: Partial<Record<POStatus, { status: POStatus; label: string }>> = {
  draft: { status: 'sent', label: 'Mark as sent' },
  sent: { status: 'acknowledged', label: 'Mark as acknowledged' },
  acknowledged: { status: 'completed', label: 'Mark as completed' },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: po, loading, error } = useApi<PurchaseOrder>(`/api/purchase-orders/${id}`);
  const toast = useToast();
  const [updating, setUpdating] = useState(false);

  if (loading) return <p className="p-8 text-center text-sm text-slate-500">Loading purchase order…</p>;
  if (error || !po) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            variant="error"
            title="Couldn’t load this purchase order"
            message={error ?? 'Purchase order not found.'}
            action={
              <Link href="/purchase-orders" className="text-sm font-medium text-blue-600 hover:underline">
                Back to purchase orders
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const next = NEXT_ACTION[po.status];

  const advance = async () => {
    if (!next) return;
    setUpdating(true);
    try {
      await apiFetch(`/api/purchase-orders/${po._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next.status }),
      });
      emitDataChanged();
      toast(`${po.poNumber} marked as ${next.status}.`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the purchase order.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">
      <div className="space-y-4 print:hidden">
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to purchase orders
        </Link>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <StageTracker stages={PO_STAGES} current={po.status} />
          <div className="flex shrink-0 gap-2">
            {next && (
              <button
                type="button"
                onClick={advance}
                disabled={updating}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {updating ? 'Updating…' : next.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <PrinterIcon className="h-4 w-4" />
              Print / Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* The document itself — the only thing that prints. */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-6 border-b-2 border-[#1e3a5f] pb-6 sm:flex-row sm:items-start sm:justify-between print:flex-row">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-10 w-10" />
              <span className="text-2xl font-bold tracking-tight text-[#1e3a5f]">ProcureFlow</span>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{COMPANY.name}</p>
              {COMPANY.address.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>CR No. {COMPANY.crNumber}</p>
            </div>
          </div>
          <div className="sm:text-right print:text-right">
            <h1 className="text-3xl font-bold uppercase tracking-wide text-[#1e3a5f]">Purchase Order</h1>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-3 sm:justify-end print:justify-end">
                <dt className="text-slate-500">PO Number</dt>
                <dd className="font-mono font-semibold text-slate-900">{po.poNumber}</dd>
              </div>
              <div className="flex gap-3 sm:justify-end print:justify-end">
                <dt className="text-slate-500">Date</dt>
                <dd className="font-medium text-slate-900">{formatDate(po.createdAt)}</dd>
              </div>
              <div className="flex items-center gap-3 sm:justify-end print:justify-end">
                <dt className="text-slate-500">Status</dt>
                <dd><PoStatusBadge status={po.status} /></dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor</h2>
            <p className="font-semibold text-slate-900">{po.vendor.name}</p>
            {po.vendor.email && <p className="text-sm text-slate-600">{po.vendor.email}</p>}
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ship to</h2>
            <p className="font-semibold text-slate-900">{COMPANY.name}</p>
            {COMPANY.address.map((line) => (
              <p key={line} className="text-sm text-slate-600">{line}</p>
            ))}
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-left text-xs font-semibold uppercase tracking-wide text-white print:bg-[#1e3a5f]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Unit Price</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-200">
            {po.items.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                <td className="px-4 py-3 text-right tabular-nums">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="tabular-nums">{formatCurrency(po.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">VAT ({VAT_RATE * 100}%)</dt>
              <dd className="tabular-nums">{formatCurrency(poVat(po))}</dd>
            </div>
            <div className="flex justify-between border-t-2 border-[#1e3a5f] pt-2 text-base font-bold text-slate-900">
              <dt>Total (incl. VAT)</dt>
              <dd className="tabular-nums">{formatCurrency(poGrandTotal(po))}</dd>
            </div>
          </dl>
        </div>

        <section className="mt-10 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Terms &amp; Conditions</h2>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Please reference the PO number on all invoices, packing slips, and correspondence.</li>
            <li>Payment terms: Net 30 from receipt of a valid invoice.</li>
            <li>Goods must match the specifications and quantities stated on this order.</li>
            <li>All prices are in Bahraini Dinars (BD). VAT is charged at {VAT_RATE * 100}% on the subtotal.</li>
          </ol>
          <div className="mt-10 grid grid-cols-2 gap-10">
            <div className="border-t border-slate-300 pt-2">Authorized signature</div>
            <div className="border-t border-slate-300 pt-2">Date</div>
          </div>
        </section>
      </article>
    </div>
  );
}
