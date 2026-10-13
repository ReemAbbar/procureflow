'use client';

import { useEffect, type ReactNode } from 'react';
import type { Decision, HistoryEntry, PurchaseRequest } from '../lib/types';
import { BUDGET_THRESHOLD, getHistory, isOwnRequest, requestTotal, SELF_APPROVAL_MESSAGE } from '../lib/types';
import { formatCurrency } from '../lib/format';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import BudgetFlag from './BudgetFlag';
import ApprovalTimeline from './ApprovalTimeline';
import RequesterTag from './RequesterTag';
import { useRole } from './RoleProvider';
import { CheckIcon, LockIcon, XIcon } from './icons';

const historyStyle: Record<HistoryEntry['action'], { label: string; dot: string }> = {
  submitted: { label: 'Submitted', dot: 'bg-blue-500' },
  approved: { label: 'Approved', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', dot: 'bg-red-500' },
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

type Props = {
  request: PurchaseRequest;
  onClose: () => void;
  // Omitted when the current role can't approve or reject.
  onDecision?: (request: PurchaseRequest, decision: Decision) => void;
};

export default function RequestDetailPanel({ request, onClose, onDecision }: Props) {
  const total = requestTotal(request);
  const history = getHistory(request);
  const { user } = useRole();
  const own = isOwnRequest(request, user.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Purchase request</p>
            <h2 id="detail-title" className="mt-1 truncate text-lg font-semibold text-slate-900">
              {request.itemName}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close details"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {total > BUDGET_THRESHOLD && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <BudgetFlag total={total} />
              This request exceeds the {formatCurrency(BUDGET_THRESHOLD)} budget threshold.
            </div>
          )}

          <section>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Approval status</h3>
            <ApprovalTimeline request={request} size="md" />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Details</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <Detail label="Requested by">
                {request.requestedBy ? <RequesterTag name={request.requestedBy} isYou={own} /> : '—'}
              </Detail>
              <Detail label="Department">{request.department ?? '—'}</Detail>
              <Detail label="Vendor">{request.preferredVendor}</Detail>
              <Detail label="Quantity">{request.quantity.toLocaleString()}</Detail>
              <Detail label="Unit price">{formatCurrency(request.estimatedPrice)}</Detail>
              <Detail label="Total">
                <span className="font-semibold">{formatCurrency(total)}</span>
              </Detail>
              <Detail label="Submitted">{formatDateTime(request.createdAt)}</Detail>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{request.description || '—'}</p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Approval history</h3>
            <ol className="relative space-y-5 border-l border-slate-200 pl-5">
              {history.map((entry, i) => {
                const { label, dot } = historyStyle[entry.action];
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot}`} />
                    <p className="text-sm font-medium text-slate-900">
                      {label}
                      {entry.by && <span className="font-normal text-slate-500"> by {entry.by}</span>}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                    {entry.comment && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        &ldquo;{entry.comment}&rdquo;
                      </p>
                    )}
                  </li>
                );
              })}
              {request.status === 'pending' && (
                <li className="relative">
                  <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-300 bg-white ring-4 ring-white" />
                  <p className="text-sm text-slate-500">Awaiting decision</p>
                </li>
              )}
            </ol>
          </section>
        </div>

        {request.status === 'pending' && onDecision && own && (
          <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
            <LockIcon className="h-4 w-4 shrink-0 text-slate-400" />
            {SELF_APPROVAL_MESSAGE}. Another approver must review it.
          </div>
        )}
        {request.status === 'pending' && onDecision && !own && (
          <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => onDecision(request, 'approved')}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <CheckIcon className="h-4 w-4" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => onDecision(request, 'rejected')}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <XIcon className="h-4 w-4" />
              Reject
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{children}</dd>
    </div>
  );
}
