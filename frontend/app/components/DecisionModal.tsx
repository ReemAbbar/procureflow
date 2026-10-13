'use client';

import { useEffect, useState } from 'react';
import type { Decision, PurchaseRequest } from '../lib/types';
import { formatCurrency } from '../lib/format';
import { requestTotal } from '../lib/types';
import { CheckCircleIcon, XCircleIcon } from './icons';

type Props = {
  request: PurchaseRequest;
  decision: Decision;
  onCancel: () => void;
  onConfirm: (comment: string) => Promise<void>;
};

export default function DecisionModal({ request, decision, onCancel, onConfirm }: Props) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const approving = decision === 'approved';
  // A reason is mandatory for rejections so the requester knows what to fix.
  const commentRequired = !approving;

  useEffect(() => {
    // Capture phase + stopPropagation so Escape doesn't also close the detail panel underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (!submitting) onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(comment.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !submitting && onCancel()} />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex gap-4 p-6">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              approving ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {approving ? <CheckCircleIcon /> : <XCircleIcon />}
          </span>
          <div className="flex-1">
            <h2 id="decision-title" className="text-base font-semibold text-slate-900">
              {approving ? 'Approve' : 'Reject'} request
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {request.itemName} · {request.quantity} × {formatCurrency(request.estimatedPrice)} ={' '}
              <span className="font-medium text-slate-700">{formatCurrency(requestTotal(request))}</span>
            </p>
            <label htmlFor="decision-comment" className="mt-4 block text-sm font-medium text-slate-700">
              {approving ? 'Comment (optional)' : 'Reason for rejection'}
            </label>
            <textarea
              id="decision-comment"
              autoFocus
              rows={3}
              required={commentRequired}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approving ? 'e.g. Approved within Q4 budget' : 'e.g. Please get a second vendor quote'}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (commentRequired && !comment.trim())}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 ${
              approving ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? 'Saving…' : approving ? 'Approve' : 'Reject'}
          </button>
        </div>
      </form>
    </div>
  );
}
