import type { POStatus, RFQStatus } from '../lib/types';

const pill = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export const RFQ_STAGES: { key: RFQStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'quotes_received', label: 'Quotes Received' },
  { key: 'awarded', label: 'Awarded' },
];

const rfqStyles: Record<RFQStatus, string> = {
  draft: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  quotes_received: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  awarded: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export function RfqStatusBadge({ status }: { status: RFQStatus }) {
  return (
    <span className={`${pill} ${rfqStyles[status]}`}>
      {RFQ_STAGES.find((s) => s.key === status)?.label}
    </span>
  );
}

export const PO_STAGES: { key: POStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'completed', label: 'Completed' },
];

const poStyles: Record<POStatus, string> = {
  draft: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  acknowledged: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export function PoStatusBadge({ status }: { status: POStatus }) {
  return (
    <span className={`${pill} ${poStyles[status]}`}>
      {PO_STAGES.find((s) => s.key === status)?.label}
    </span>
  );
}

// Horizontal progress tracker, e.g. Draft → Sent → Quotes Received → Awarded.
export function StageTracker<K extends string>({
  stages,
  current,
}: {
  stages: { key: K; label: string }[];
  current: K;
}) {
  const currentIndex = stages.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {stages.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage.key} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-600'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`text-sm ${active ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`}
            >
              {stage.label}
            </span>
            {i < stages.length - 1 && (
              <span className={`mx-1 h-px w-8 ${done ? 'bg-blue-600' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
