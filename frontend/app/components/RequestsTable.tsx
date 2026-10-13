'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Decision, PurchaseRequest, RFQ, Status } from '../lib/types';
import { useApi } from '../lib/useApi';
import RfqFormModal from './RfqFormModal';
import { getHistory, isOwnRequest, requestTotal, SELF_APPROVAL_MESSAGE } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import BudgetFlag from './BudgetFlag';
import EmptyState from './EmptyState';
import DecisionModal from './DecisionModal';
import RequestDetailPanel from './RequestDetailPanel';
import NewRequestButton from './NewRequestButton';
import RequesterTag from './RequesterTag';
import ApprovalTimeline from './ApprovalTimeline';
import Tooltip from './Tooltip';
import { useToast } from './Toast';
import { useRole } from './RoleProvider';
import { CheckIcon, DownloadIcon, LockIcon, RfqIcon, SearchIcon, XIcon } from './icons';

type Filter = 'all' | Status;

const tabs: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

type Props = {
  title?: string;
  requests: PurchaseRequest[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, status: Decision, comment: string) => Promise<void>;
};

export default function RequestsTable({ title, requests: allRequests, loading, error, onStatusChange }: Props) {
  const toast = useToast();
  const { can, user } = useRole();
  const canDecide = can('requests.decide');
  const canSource = can('rfqs.manage');
  const canViewAll = can('requests.viewAll');
  // Requesters only see the requests they submitted, with a progress timeline instead of a status badge.
  const requests = useMemo(
    () => (canViewAll ? allRequests : allRequests.filter((r) => isOwnRequest(r, user.name))),
    [canViewAll, allRequests, user.name]
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // Store the id rather than the object so the panel reflects refreshed data after a decision.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    request: PurchaseRequest;
    decision: Decision;
  } | null>(null);

  const selected = requests.find((r) => r._id === selectedId) ?? null;

  const [rfqRequest, setRfqRequest] = useState<PurchaseRequest | null>(null);
  const closeRfq = useCallback(() => setRfqRequest(null), []);
  const { data: rfqs } = useApi<RFQ[]>(canSource ? '/api/rfqs' : null);
  const rfqByRequest = useMemo(
    () => new Map((rfqs ?? []).filter((q) => q.requestId).map((q) => [q.requestId!._id, q._id])),
    [rfqs]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of requests) c[r.status]++;
    return c;
  }, [requests]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        (!q ||
          r.itemName.toLowerCase().includes(q) ||
          r.preferredVendor.toLowerCase().includes(q))
    );
  }, [requests, filter, query]);

  const openDecision = useCallback(
    (request: PurchaseRequest, decision: Decision) => {
      // Belt and braces: the buttons are locked for your own requests, and so is this.
      if (isOwnRequest(request, user.name)) return;
      setPendingDecision({ request, decision });
    },
    [user.name]
  );
  const closeDecision = useCallback(() => setPendingDecision(null), []);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const confirmDecision = async (comment: string) => {
    if (!pendingDecision) return;
    const { request, decision } = pendingDecision;
    try {
      await onStatusChange(request._id, decision, comment);
      setPendingDecision(null);
      toast(
        `"${request.itemName}" was ${decision}.`,
        decision === 'approved' ? 'success' : 'error'
      );
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : 'Could not update the request. Please try again.', 'error');
    }
  };

  const exportCsv = () => {
    const header = [
      'Item', 'Description', 'Requested By', 'Department', 'Vendor', 'Quantity', 'Unit Price', 'Total',
      'Priority', 'Status', 'Date', 'Latest Comment',
    ];
    const rows = visible.map((r) => {
      const latestComment = [...getHistory(r)].reverse().find((h) => h.comment)?.comment;
      return [
        r.itemName,
        r.description,
        r.requestedBy,
        r.department,
        r.preferredVendor,
        r.quantity,
        r.estimatedPrice,
        requestTotal(r),
        r.priority ?? 'medium',
        r.status,
        r.createdAt.slice(0, 10),
        latestComment,
      ];
    });
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`procureflow-requests-${filter}-${today}.csv`, [header, ...rows]);
  };

  const clearFilters = () => {
    setFilter('all');
    setQuery('');
  };

  let emptyState = null;
  if (loading) {
    emptyState = <p className="px-6 py-16 text-center text-sm text-slate-500">Loading requests…</p>;
  } else if (error) {
    emptyState = <EmptyState variant="error" title="Couldn’t load requests" message={error} />;
  } else if (requests.length === 0) {
    emptyState = (
      <EmptyState
        variant="empty"
        title={canViewAll ? 'No purchase requests yet' : 'You haven’t submitted any requests'}
        message="Create your first request to start tracking approvals and spend."
        action={<NewRequestButton />}
      />
    );
  } else if (visible.length === 0) {
    emptyState = (
      <EmptyState
        variant="no-results"
        title="No matching requests"
        message={
          query
            ? `Nothing matches “${query.trim()}” in ${filter === 'all' ? 'any status' : filter + ' requests'}.`
            : `There are no ${filter} requests right now.`
        }
        action={
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear filters
          </button>
        }
      />
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 pt-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {title && <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>}
          <div className="-mb-px flex gap-6 overflow-x-auto" role="tablist">
            {tabs.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex w-full gap-2 lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item or vendor…"
              aria-label="Search requests by item or vendor"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {emptyState ?? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">{canViewAll ? 'Status' : 'Progress'}</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => {
                const total = requestTotal(r);
                const own = isOwnRequest(r, user.name);
                return (
                  <tr key={r._id} className="hover:bg-slate-50/70">
                    <td className="max-w-xs px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedId(r._id)}
                        className="text-left font-medium text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {r.itemName}
                      </button>
                      {r.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{r.description}</p>
                      )}
                      <div className="mt-1.5">
                        <RequesterTag name={r.requestedBy} isYou={own} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.department ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{r.preferredVendor}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {r.quantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                      <p className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                        <BudgetFlag total={total} />
                        {formatCurrency(total)}
                      </p>
                      <p className="text-xs text-slate-500">{formatCurrency(r.estimatedPrice)} ea</p>
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-5 py-4">
                      {canViewAll ? <StatusBadge status={r.status} /> : <ApprovalTimeline request={r} />}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(r.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {r.status === 'pending' && canDecide && own ? (
                        <Tooltip label={SELF_APPROVAL_MESSAGE} align="right">
                          {(describedBy) => (
                            <span
                              tabIndex={0}
                              aria-describedby={describedBy}
                              className="inline-flex gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                              <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400">
                                <LockIcon className="h-3.5 w-3.5" />
                                Approve
                              </span>
                              <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400">
                                <LockIcon className="h-3.5 w-3.5" />
                                Reject
                              </span>
                            </span>
                          )}
                        </Tooltip>
                      ) : r.status === 'pending' && canDecide ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openDecision(r, 'approved')}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openDecision(r, 'rejected')}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : canSource && r.status === 'approved' && rfqByRequest.has(r._id) ? (
                        <Link
                          href={`/rfq/${rfqByRequest.get(r._id)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <RfqIcon className="h-3.5 w-3.5" />
                          View RFQ
                        </Link>
                      ) : canSource && r.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => setRfqRequest(r)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                        >
                          <RfqIcon className="h-3.5 w-3.5" />
                          Send RFQ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedId(r._id)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          View
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

      {!emptyState && (
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {visible.length} of {requests.length} requests
        </div>
      )}

      {selected && (
        <RequestDetailPanel request={selected} onClose={closePanel} onDecision={canDecide ? openDecision : undefined} />
      )}
      {rfqRequest && <RfqFormModal request={rfqRequest} onClose={closeRfq} />}
      {pendingDecision && (
        <DecisionModal
          key={pendingDecision.request._id + pendingDecision.decision}
          request={pendingDecision.request}
          decision={pendingDecision.decision}
          onCancel={closeDecision}
          onConfirm={confirmDecision}
        />
      )}
    </section>
  );
}
