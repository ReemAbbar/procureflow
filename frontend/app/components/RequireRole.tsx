'use client';

import type { ReactNode } from 'react';
import { PERSONAS, roleWith, type Permission } from '../lib/roles';
import { useRole } from './RoleProvider';
import { RoleBadge } from './RoleSwitcher';

// Renders children only if the current simulated role has the permission;
// otherwise shows an explanation and a one-click switch to a role that does.
export default function RequireRole({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { role, can, setRole } = useRole();
  if (can(permission)) return <>{children}</>;

  const needed = roleWith(permission);
  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6 lg:p-8">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <svg viewBox="0 0 64 64" aria-hidden="true" className="mx-auto mb-4 h-16 w-16">
          <circle cx="32" cy="32" r="30" fill="#f1f5f9" />
          <rect x="20" y="29" width="24" height="18" rx="3" fill="#cbd5e1" />
          <path d="M25 29v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#94a3b8" strokeWidth="3" />
          <circle cx="32" cy="38" r="2.5" fill="#fff" />
        </svg>
        <h1 className="text-base font-semibold text-slate-900">This area isn&apos;t available to your role</h1>
        <p className="mx-auto mt-2 flex max-w-sm flex-wrap items-center justify-center gap-1.5 text-sm text-slate-500">
          You&apos;re viewing as <RoleBadge role={role} />. This page is for <RoleBadge role={needed} />.
        </p>
        <button
          type="button"
          onClick={() => setRole(needed)}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Switch to {PERSONAS[needed].label}
        </button>
      </div>
    </div>
  );
}
