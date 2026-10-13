'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, emitDataChanged } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { PurchaseRequest, RFQ } from '../lib/types';
import { requestTotal } from '../lib/types';
import { useToast } from './Toast';
import { CheckIcon, PlusIcon, RfqIcon, XIcon } from './icons';
import { AiBadge, AiButton } from './AiBits';
import { rangeMidpoint, suggestVendors, type VendorSuggestion } from '../lib/mockAi';

const MAX_VENDORS = 3;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

function localDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = { request: PurchaseRequest; onClose: () => void };

// estimatedPrice is the expected unit price in BD (a reference, not a quote).
type VendorRow = { name: string; email: string; estimatedPrice: string };
const emptyRow = (name = ''): VendorRow => ({ name, email: '', estimatedPrice: '' });

export default function RfqFormModal({ request, onClose }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [vendors, setVendors] = useState<VendorRow[]>([emptyRow(request.preferredVendor)]);
  const [deadline, setDeadline] = useState(() => localDateString(new Date(Date.now() + 7 * 864e5)));
  const [notes, setNotes] = useState(request.description);
  const [submitting, setSubmitting] = useState<'draft' | 'sent' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VendorSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const updateVendor = (i: number, field: keyof VendorRow, value: string) =>
    setVendors((vs) => vs.map((v, j) => (j === i ? { ...v, [field]: value } : v)));

  const loadSuggestions = async () => {
    setSuggesting(true);
    try {
      setSuggestions(await suggestVendors(request));
    } finally {
      setSuggesting(false);
    }
  };

  const hasVendor = (name: string) => vendors.some((v) => v.name.trim().toLowerCase() === name.toLowerCase());
  const vendorsFull = vendors.length >= MAX_VENDORS && vendors.every((v) => v.name.trim());

  // Fill the first empty vendor row (or add one if there's room) with the vendor's
  // name and the midpoint of its estimated unit price range, when that parses.
  const applySuggestion = ({ name, estimatedPriceRange }: VendorSuggestion) =>
    setVendors((vs) => {
      if (vs.some((v) => v.name.trim().toLowerCase() === name.toLowerCase())) return vs;
      const mid = rangeMidpoint(estimatedPriceRange);
      const filled = { name, ...(mid != null && { estimatedPrice: String(mid) }) };
      const empty = vs.findIndex((v) => !v.name.trim());
      if (empty >= 0) return vs.map((v, j) => (j === empty ? { ...v, ...filled } : v));
      return vs.length < MAX_VENDORS ? [...vs, { ...emptyRow(), ...filled }] : vs;
    });

  const submit = async (status: 'draft' | 'sent') => {
    setSubmitting(status);
    setError(null);
    try {
      const rfq = await apiFetch<RFQ>('/api/rfqs', {
        method: 'POST',
        body: JSON.stringify({
          requestId: request._id,
          vendors: vendors
            .filter((v) => v.name.trim())
            .map((v) => ({ ...v, estimatedPrice: v.estimatedPrice === '' ? null : Number(v.estimatedPrice) })),
          // End of the chosen day in the user's timezone.
          deadline: new Date(`${deadline}T23:59:59`).toISOString(),
          notes,
          status,
        }),
      });
      emitDataChanged();
      toast(
        status === 'sent' ? `RFQ sent for "${request.itemName}".` : `RFQ draft saved for "${request.itemName}".`,
        'info'
      );
      router.push(`/rfq/${rfq._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the RFQ.');
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !submitting && onClose()} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit('sent');
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfq-title"
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start gap-4 border-b border-slate-200 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <RfqIcon />
          </span>
          <div className="min-w-0">
            <h2 id="rfq-title" className="text-base font-semibold text-slate-900">
              Request for Quotation
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {request.itemName} · {request.quantity.toLocaleString()} units · est.{' '}
              {formatCurrency(requestTotal(request))}
            </p>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Vendors <span className="font-normal text-slate-400">(up to {MAX_VENDORS})</span>
            </legend>
            <p className="-mt-1 mb-2 text-xs text-slate-500">
              Est. price is an optional reference in BD per unit. Vendors&apos; actual quotes are recorded later.
            </p>
            <div className="space-y-2">
              {vendors.map((v, i) => (
                <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <input
                    aria-label={`Vendor ${i + 1} name`}
                    required={i === 0}
                    placeholder="Vendor name"
                    value={v.name}
                    onChange={(e) => updateVendor(i, 'name', e.target.value)}
                    className={`${inputClass} min-w-0 basis-full sm:flex-1 sm:basis-0`}
                  />
                  <input
                    aria-label={`Vendor ${i + 1} email`}
                    type="email"
                    placeholder="email@vendor.com"
                    value={v.email}
                    onChange={(e) => updateVendor(i, 'email', e.target.value)}
                    className={`${inputClass} min-w-0 flex-1 basis-0`}
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      BD
                    </span>
                    <input
                      aria-label={`Vendor ${i + 1} estimated unit price in BD`}
                      title="Estimated unit price (BD)"
                      type="number"
                      min={0}
                      step="0.001"
                      placeholder="Est. price"
                      value={v.estimatedPrice}
                      onChange={(e) => updateVendor(i, 'estimatedPrice', e.target.value)}
                      className={`${inputClass} pl-9 tabular-nums`}
                    />
                  </div>
                  {vendors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVendors((vs) => vs.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label={`Remove vendor ${i + 1}`}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {vendors.length < MAX_VENDORS ? (
                <button
                  type="button"
                  onClick={() => setVendors((vs) => [...vs, emptyRow()])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add vendor
                </button>
              ) : (
                <span />
              )}
              <AiButton loading={suggesting} loadingLabel="Finding vendors…" onClick={loadSuggestions}>
                {suggestions ? 'Refresh suggestions' : 'AI Suggest Vendors'}
              </AiButton>
            </div>

            {suggesting && (
              <div className="mt-3 space-y-2" aria-live="polite">
                <span className="sr-only">Finding vendor suggestions…</span>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
                ))}
              </div>
            )}

            {!suggesting && suggestions && (
              <div className="mt-3 space-y-2" aria-live="polite">
                <p className="text-xs text-slate-500">
                  Suggested for {request.department ?? 'general'} purchases · click to add
                  {vendorsFull && ' (remove a vendor first to make room)'}
                </p>
                {suggestions.map((s) => {
                  const added = hasVendor(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      disabled={added || vendorsFull}
                      aria-pressed={added}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        added
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-60'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                        {added ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckIcon className="h-3.5 w-3.5" />
                            Added
                          </span>
                        ) : (
                          <AiBadge />
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-slate-600">{s.reason}</span>
                      <span className="mt-1.5 block text-xs text-slate-500">
                        Est. total{' '}
                        <span className="font-semibold tabular-nums text-slate-800">
                          {formatCurrency(s.priceRange[0])} – {formatCurrency(s.priceRange[1])}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="rfq-deadline" className="mb-1.5 block text-sm font-medium text-slate-700">
              Quote deadline
            </label>
            <input
              id="rfq-deadline"
              type="date"
              required
              min={localDateString(new Date())}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="rfq-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes &amp; specifications
            </label>
            <textarea
              id="rfq-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specs, delivery location, payment terms…"
              className={inputClass}
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={!!submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              // Run native validation without submitting as "sent".
              const form = e.currentTarget.form;
              if (form?.reportValidity()) submit('draft');
            }}
            disabled={!!submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitting === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="submit"
            disabled={!!submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting === 'sent' ? 'Sending…' : 'Send RFQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
