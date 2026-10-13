'use client';

import { useId, type ReactElement, type ReactNode } from 'react';

type Props = {
  label: string;
  // Receives the tooltip's id so the trigger can reference it via aria-describedby.
  children: (describedBy: string) => ReactElement;
  align?: 'center' | 'right';
};

// A CSS-only tooltip shown on hover and on keyboard focus.
export default function Tooltip({ label, children, align = 'center' }: Props): ReactNode {
  const id = useId();
  const position = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span className="group relative inline-flex">
      {children(id)}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${position}`}
      >
        {label}
      </span>
    </span>
  );
}
