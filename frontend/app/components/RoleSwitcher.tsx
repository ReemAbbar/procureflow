'use client';

import { useEffect, useRef, useState } from 'react';
import { PERSONAS, ROLE_AVATAR, ROLE_BADGE, ROLES, type Role } from '../lib/roles';
import { useRole } from './RoleProvider';
import { useToast } from './Toast';
import { CheckIcon, ChevronDownIcon } from './icons';

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${ROLE_BADGE[role]}`}
    >
      {PERSONAS[role].label}
    </span>
  );
}

export default function RoleSwitcher() {
  const { role, user, setRole } = useRole();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: Role) => {
    setOpen(false);
    if (next === role) return;
    setRole(next);
    toast(`Switched to ${PERSONAS[next].label} view — you can ${PERSONAS[next].summary}.`, 'info');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current role: ${user.label}. Switch role`}
        className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-50"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${ROLE_AVATAR[role]}`}
        >
          {user.initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-slate-900">{user.name}</span>
          <RoleBadge role={role} />
        </span>
        <ChevronDownIcon className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <p className="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Switch role <span className="font-normal normal-case text-slate-400">(demo)</span>
          </p>
          {ROLES.map((r) => {
            const p = PERSONAS[r];
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(r)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${active ? 'bg-slate-50' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${ROLE_AVATAR[r]}`}
                >
                  {p.initials}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-900">{p.label}</span>
                  <span className="block text-xs text-slate-500">{p.description}</span>
                </span>
                {active && <CheckIcon className="mt-1 h-4 w-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
