'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import { RFQ_STAGES, RfqStatusBadge, StageTracker } from '../../components/StageBadges';
import { useToast } from '../../components/Toast';
import { ArrowLeftIcon, PurchaseOrderIcon, RfqIcon, TrophyIcon, WarningIcon } from '../../components/icons';
import { AiButton, Spinner } from '../../components/AiBits';
import { analyzeQuotes, type QuoteAnalysis } from '../../lib/mockAi';
import { apiFetch, emitDataChanged } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatDate } from '../../lib/format';
import type { QuoteStatus, RFQ, RFQVendor } from '../../lib/types';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';

export default function RfqDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: rfq, loading, error } = useApi<RFQ>(`/api/rfqs/${id}`);
  const toast = useToast();
  const [sending, setSending] = useState(false);

  if (loading) return <p className="p-8 text-center text-sm text-slate-500">Loading RFQ…</p>;
  if (error || !rfq) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            variant="error"
            title="Couldn’t load this RFQ"
            message={error ?? 'RFQ not found.'}
            action={<Link href="/rfqs" className="text-sm font-medium text-blue-600 hover:underline">Back to RFQs</Link>}
          />
        </div>
      </div>
    );
  }

  const request = rfq.requestId;
  const quantity = request?.quantity ?? 0;

  const sendRfq = async () => {
    setSending(true);
    try {
      await apiFetch(`/api/rfqs/${rfq._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'sent' }) });
      emitDataChanged();
      toast('RFQ sent to vendors.', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the RFQ.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href="/rfqs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to RFQs
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {request?.itemName ?? 'Deleted request'}
              </h1>
              <RfqStatusBadge status={rfq.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Request for Quotation · created {formatDate(rfq.createdAt)} · quotes due {formatDate(rfq.deadline)}
            </p>
          </div>
          {rfq.status === 'draft' && (
            <button
              type="button"
              onClick={sendRfq}
              disabled={sending}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RfqIcon className="h-4 w-4" />
              {sending ? 'Sending…' : 'Send RFQ'}
            </button>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <StageTracker stages={RFQ_STAGES} current={rfq.status} />
      </section>

      {rfq.status === 'awarded' && rfq.purchaseOrderId && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-emerald-800">
            <TrophyIcon className="h-5 w-5" />
            Awarded to <strong>{rfq.vendors.find((v) => v._id === rfq.awardedVendorId)?.name}</strong>. A purchase
            order has been generated.
          </p>
          <Link
            href={`/purchase-orders/${rfq.purchaseOrderId}`}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <PurchaseOrderIcon className="h-4 w-4" />
            View purchase order
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Request details</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Quantity">{quantity.toLocaleString()}</Row>
            <Row label="Department">{request?.department ?? '—'}</Row>
            <Row label="Est. unit price">{request ? formatCurrency(request.estimatedPrice) : '—'}</Row>
            <Row label="Est. total">{request ? formatCurrency(request.estimatedPrice * quantity) : '—'}</Row>
            <Row label="Quote deadline">{formatDate(rfq.deadline)}</Row>
          </dl>
          {rfq.notes && (
            <>
              <h3 className="mb-1 mt-5 text-sm font-semibold text-slate-900">Notes &amp; specifications</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{rfq.notes}</p>
            </>
          )}
        </section>

        <div className="lg:col-span-2">
          {rfq.status === 'draft' ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Invited vendors</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {rfq.vendors.map((v) => (
                  <li key={v._id} className="py-2.5 text-sm">
                    <span className="font-medium text-slate-900">{v.name}</span>
                    {v.email && <span className="ml-2 text-slate-500">{v.email}</span>}
                    <EstimateTag value={v.estimatedPrice} className="ml-2" />
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                This RFQ is a draft. Send it to start recording vendor quotes.
              </p>
            </section>
          ) : (
            // Remount when server data changes so the form picks up saved values.
            <QuoteForm key={JSON.stringify(rfq.vendors)} rfq={rfq} />
          )}
        </div>
      </div>

      {rfq.status !== 'draft' && <ComparisonTable rfq={rfq} quantity={quantity} />}
    </div>
  );
}

// The estimate captured when the RFQ was created: a reference only, never a quote.
function EstimateTag({ value, className = '' }: { value?: number; className?: string }) {
  if (value == null) return null;
  return (
    <span className={`inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ${className}`}>
      Est. {formatCurrency(value)} / unit
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

type QuoteDraft = { _id: string; quotedPrice: string; deliveryDays: string; notes: string; status: QuoteStatus };

function QuoteForm({ rfq }: { rfq: RFQ }) {
  const toast = useToast();
  const locked = rfq.status === 'awarded';
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState<QuoteDraft[]>(() =>
    rfq.vendors.map((v) => ({
      _id: v._id,
      quotedPrice: v.quotedPrice?.toString() ?? '',
      deliveryDays: v.deliveryDays?.toString() ?? '',
      notes: v.notes ?? '',
      status: v.status,
    }))
  );

  const update = (i: number, patch: Partial<QuoteDraft>) =>
    setQuotes((qs) =>
      qs.map((q, j) => {
        if (j !== i) return q;
        const next = { ...q, ...patch };
        // Entering a price on a pending vendor marks it as quoted.
        if (patch.quotedPrice && q.status === 'pending') next.status = 'quoted';
        return next;
      })
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/rfqs/${rfq._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          vendors: quotes.map((q) => ({
            _id: q._id,
            quotedPrice: q.quotedPrice === '' ? null : Number(q.quotedPrice),
            deliveryDays: q.deliveryDays === '' ? null : Number(q.deliveryDays),
            notes: q.notes,
            status: q.status,
          })),
        }),
      });
      emitDataChanged();
      toast('Quotes saved.', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save quotes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Vendor responses</h2>
        <p className="mt-0.5 text-sm text-slate-500">Record each vendor&apos;s quote as it comes in. Prices are per unit.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rfq.vendors.map((v, i) => {
          const q = quotes[i];
          const quoted = q.status === 'quoted';
          return (
            <fieldset key={v._id} disabled={locked} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-12">
              <legend className="sr-only">{v.name}</legend>
              <div className="sm:col-span-12 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{v.name}</p>
                  {v.email && <p className="truncate text-xs text-slate-500">{v.email}</p>}
                  <EstimateTag value={v.estimatedPrice} className="mt-1" />
                </div>
                <select
                  aria-label={`${v.name} response status`}
                  value={q.status}
                  onChange={(e) => update(i, { status: e.target.value as QuoteStatus })}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
                >
                  <option value="pending">Awaiting quote</option>
                  <option value="quoted">Quoted</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-slate-500">Unit price (BD)</span>
                <input
                  type="number" min={0} step="0.001" required={quoted} disabled={locked || q.status === 'declined'}
                  value={q.quotedPrice} onChange={(e) => update(i, { quotedPrice: e.target.value })}
                  placeholder="0.000" className={inputClass}
                />
              </label>
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-slate-500">Delivery (days)</span>
                <input
                  type="number" min={0} step={1} disabled={locked || q.status === 'declined'}
                  value={q.deliveryDays} onChange={(e) => update(i, { deliveryDays: e.target.value })}
                  placeholder="e.g. 14" className={inputClass}
                />
              </label>
              <label className="sm:col-span-6">
                <span className="mb-1 block text-xs font-medium text-slate-500">Notes</span>
                <input
                  value={q.notes} onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="Warranty, shipping terms…" className={inputClass}
                />
              </label>
            </fieldset>
          );
        })}
      </div>
      {!locked && (
        <div className="flex justify-end rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save quotes'}
          </button>
        </div>
      )}
    </form>
  );
}

function ComparisonTable({ rfq, quantity }: { rfq: RFQ; quantity: number }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // Remember which quotes were analysed so a stale result isn't shown after edits.
  const [analysis, setAnalysis] = useState<{ key: string; result: QuoteAnalysis } | null>(null);

  const quoted = rfq.vendors.filter(
    (v): v is RFQVendor & { quotedPrice: number } => v.status === 'quoted' && v.quotedPrice != null
  );
  const prices = quoted.map((v) => v.quotedPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Only highlight when there's an actual spread to compare.
  const showExtremes = quoted.length >= 2 && min !== max;

  // Analysis needs at least two vendor responses (a decline counts) and one actual quote.
  const responses = rfq.vendors.filter((v) => v.status !== 'pending').length;
  const canAnalyze = responses >= 2 && quoted.length >= 1;
  const quotesKey = JSON.stringify(rfq.vendors.map((v) => [v._id, v.status, v.quotedPrice, v.deliveryDays]));
  const currentAnalysis = analysis?.key === quotesKey ? analysis.result : null;

  const runAnalysis = async () => {
    setAnalyzing(true);
    // Calls Gemini (falls back to local analysis) and holds the spinner for at least 2s.
    const result = await analyzeQuotes(rfq.vendors, quantity, rfq.requestId?.itemName ?? 'Requested item');
    setAnalysis(result ? { key: quotesKey, result } : null);
    setAnalyzing(false);
  };

  const award = async (vendorId: string) => {
    setAwarding(true);
    try {
      await apiFetch(`/api/rfqs/${rfq._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'awarded', awardedVendorId: vendorId }),
      });
      emitDataChanged();
      toast('RFQ awarded and purchase order created.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not award the RFQ.', 'error');
    } finally {
      setAwarding(false);
      setConfirming(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Quotation comparison</h2>
          {showExtremes && (
            <p className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Lowest price</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Highest price</span>
            </p>
          )}
        </div>
        {canAnalyze && (
          <AiButton loading={analyzing} loadingLabel="Analyzing quotes…" onClick={runAnalysis}>
            {currentAnalysis ? 'Re-analyze Quotes' : 'AI Analyze Quotes'}
          </AiButton>
        )}
      </div>

      {analyzing && (
        <div className="flex items-center gap-3 border-b border-slate-200 bg-violet-50/40 px-5 py-4 text-sm text-violet-700" aria-live="polite">
          <Spinner />
          Comparing {quoted.length} quote{quoted.length === 1 ? '' : 's'} on price, delivery and value…
        </div>
      )}
      {!analyzing && currentAnalysis && <AnalysisCard analysis={currentAnalysis} />}
      {quoted.length === 0 ? (
        <EmptyState
          variant="no-results"
          title="No quotes yet"
          message="Once vendors respond, record their prices above to compare them here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3 text-right">Unit Price</th>
                <th className="px-5 py-3 text-right">Total Price</th>
                <th className="px-5 py-3 text-right">Delivery Days</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quoted.map((v) => {
                const lowest = showExtremes && v.quotedPrice === min;
                const highest = showExtremes && v.quotedPrice === max;
                const isWinner = rfq.awardedVendorId === v._id;
                return (
                  <tr
                    key={v._id}
                    className={
                      lowest
                        ? 'bg-emerald-50 shadow-[inset_3px_0_0_0_#10b981]'
                        : highest
                          ? 'bg-red-50 shadow-[inset_3px_0_0_0_#ef4444]'
                          : ''
                    }
                  >
                    <td className="px-5 py-4">
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        {v.name}
                        {currentAnalysis?.recommendedVendor === v.name && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
                            ✨ AI pick
                          </span>
                        )}
                      </p>
                      <EstimateTag value={v.estimatedPrice} className="mt-0.5" />
                      {lowest && <p className="text-xs font-medium text-emerald-700">Lowest price</p>}
                      {highest && <p className="text-xs font-medium text-red-700">Highest price</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(v.quotedPrice)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatCurrency(v.quotedPrice * quantity)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">{v.deliveryDays ?? '—'}</td>
                    <td className="max-w-xs px-5 py-4 text-slate-600">{v.notes || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {rfq.status === 'awarded' ? (
                        isWinner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            <TrophyIcon className="h-3.5 w-3.5" />
                            Awarded
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )
                      ) : confirming === v._id ? (
                        <span className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={awarding}
                            onClick={() => award(v._id)}
                            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {awarding ? 'Awarding…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            disabled={awarding}
                            onClick={() => setConfirming(null)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(v._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                        >
                          <TrophyIcon className="h-3.5 w-3.5" />
                          Award to Vendor
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AnalysisCard({ analysis }: { analysis: QuoteAnalysis }) {
  return (
    <div className="border-b border-slate-200 p-5" aria-live="polite">
      <div className="overflow-hidden rounded-xl border border-emerald-200">
        <div className="bg-emerald-600 px-4 py-3 text-white">
          <p className="text-sm font-semibold">
            <span aria-hidden="true">✨ </span>AI Recommendation: {analysis.recommendedVendor}
          </p>
        </div>
        <div className="space-y-4 bg-emerald-50/50 px-4 py-4">
          <p className="text-sm text-slate-700">{analysis.reason}</p>
          <ul className="space-y-2">
            {analysis.insights.map((insight) => (
              <li key={insight} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                {insight}
              </li>
            ))}
          </ul>
          {analysis.riskFlag && (
            <p className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {analysis.riskFlag}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
