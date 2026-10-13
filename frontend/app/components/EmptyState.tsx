import type { ReactNode } from 'react';

type Variant = 'empty' | 'no-results' | 'error';

// Simple inline illustrations so there are no image assets to manage.
function Illustration({ variant }: { variant: Variant }) {
  const accent = variant === 'error' ? '#fca5a5' : '#93c5fd';
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="mx-auto mb-4 h-28 w-36">
      <ellipse cx="80" cy="108" rx="52" ry="6" fill="#e2e8f0" />
      <rect x="44" y="16" width="64" height="84" rx="8" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="62" y="10" width="28" height="12" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="56" y="36" width="40" height="5" rx="2.5" fill="#e2e8f0" />
      <rect x="56" y="50" width="32" height="5" rx="2.5" fill="#e2e8f0" />
      <rect x="56" y="64" width="36" height="5" rx="2.5" fill="#e2e8f0" />
      {variant === 'no-results' && (
        <g>
          <circle cx="108" cy="72" r="16" fill="#eff6ff" stroke={accent} strokeWidth="4" />
          <path d="m120 84 12 12" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        </g>
      )}
      {variant === 'empty' && (
        <g>
          <circle cx="110" cy="80" r="15" fill={accent} />
          <path d="M110 73v14M103 80h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {variant === 'error' && (
        <g>
          <circle cx="110" cy="80" r="15" fill={accent} />
          <path d="M110 72v10M110 87.5v.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export default function EmptyState({
  variant,
  title,
  message,
  action,
}: {
  variant: Variant;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <Illustration variant={variant} />
      <h3 className={`text-sm font-semibold ${variant === 'error' ? 'text-red-700' : 'text-slate-900'}`}>
        {title}
      </h3>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
