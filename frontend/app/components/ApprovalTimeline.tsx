import type { PurchaseRequest } from '../lib/types';
import { getHistory } from '../lib/types';
import { formatDate } from '../lib/format';
import { CheckIcon, ClockIcon, XIcon } from './icons';

type StepState = 'done' | 'current' | 'upcoming' | 'rejected';
type Step = { label: string; state: StepState; detail?: string };

const dotStyle: Record<StepState, string> = {
  done: 'bg-emerald-500 text-white',
  current: 'bg-amber-400 text-white ring-4 ring-amber-100',
  upcoming: 'border-2 border-slate-300 bg-white text-slate-300',
  rejected: 'bg-red-500 text-white',
};

const lineStyle: Record<StepState, string> = {
  done: 'bg-emerald-500',
  current: 'bg-amber-400',
  upcoming: 'bg-slate-200',
  rejected: 'bg-red-500',
};

const stateText: Record<StepState, string> = {
  done: 'complete',
  current: 'in progress',
  upcoming: 'not started',
  rejected: 'rejected',
};

function buildSteps(r: PurchaseRequest): Step[] {
  const history = getHistory(r);
  const submitted = history.find((h) => h.action === 'submitted');
  const decision = [...history].reverse().find((h) => h.action !== 'submitted');
  const decided = r.status !== 'pending';
  const byLine = (by?: string) => (by ? ` · ${by}` : '');

  return [
    {
      label: 'Submitted',
      state: 'done',
      detail: formatDate(submitted?.at ?? r.createdAt) + byLine(submitted?.by ?? r.requestedBy),
    },
    {
      label: 'Under Review',
      state: decided ? 'done' : 'current',
      detail: decided ? 'Reviewed' : 'Awaiting approver',
    },
    {
      label: r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Approved / Rejected',
      state: r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'rejected' : 'upcoming',
      detail: decision ? formatDate(decision.at) + byLine(decision.by) : 'Pending decision',
    },
  ];
}

function StepIcon({ state, className }: { state: StepState; className: string }) {
  if (state === 'done') return <CheckIcon className={className} />;
  if (state === 'rejected') return <XIcon className={className} />;
  if (state === 'current') return <ClockIcon className={className} />;
  return null;
}

// Submitted → Under Review → Approved/Rejected. "sm" fits a table cell; "md" adds dates and names.
export default function ApprovalTimeline({
  request,
  size = 'sm',
}: {
  request: PurchaseRequest;
  size?: 'sm' | 'md';
}) {
  const steps = buildSteps(request);
  const md = size === 'md';

  return (
    <ol className={`flex items-start ${md ? 'w-full' : 'min-w-56'}`} aria-label="Approval progress">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && (
            <span
              aria-hidden="true"
              className={`absolute right-1/2 h-0.5 w-full ${md ? 'top-3.5' : 'top-2.5'} ${lineStyle[step.state]}`}
            />
          )}
          <span
            className={`relative z-10 flex items-center justify-center rounded-full ${
              md ? 'h-7 w-7' : 'h-5 w-5'
            } ${dotStyle[step.state]}`}
          >
            <StepIcon state={step.state} className={md ? 'h-4 w-4' : 'h-3 w-3'} />
          </span>
          <span
            className={`mt-1.5 font-medium ${md ? 'text-sm' : 'text-[11px] leading-tight'} ${
              step.state === 'upcoming'
                ? 'text-slate-400'
                : step.state === 'rejected'
                  ? 'text-red-700'
                  : step.state === 'current'
                    ? 'text-amber-700'
                    : 'text-slate-700'
            }`}
          >
            {step.label}
            <span className="sr-only"> ({stateText[step.state]})</span>
          </span>
          {md && step.detail && <span className="mt-0.5 px-1 text-xs text-slate-500">{step.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
