// Simulated roles for demoing the workflow. This is UI-only: there is no real
// authentication, and the backend does not enforce any of these permissions.

export type Role = 'requester' | 'approver' | 'procurement';

export const ROLES: Role[] = ['requester', 'approver', 'procurement'];

// Each role is played by a different (fictional) person, so ownership checks
// like "you cannot approve your own request" compare these names.
export const PERSONAS: Record<
  Role,
  { name: string; initials: string; label: string; description: string; summary: string }
> = {
  requester: {
    name: 'Sarah Chen',
    initials: 'SC',
    label: 'Requester',
    description: 'Submit requests and track your own',
    summary: 'submit purchase requests and track their approval',
  },
  approver: {
    name: 'Omar Haddad',
    initials: 'OH',
    label: 'Approver',
    description: 'Review and approve or reject requests',
    summary: 'approve or reject requests submitted by others',
  },
  procurement: {
    name: 'Priya Nair',
    initials: 'PN',
    label: 'Procurement',
    description: 'Run RFQs, purchase orders and analytics',
    summary: 'run RFQs, issue purchase orders and view analytics',
  },
};

// Look up the persona behind a stored name (for avatars and role tags).
export const personaByName = (name?: string) =>
  ROLES.map((role) => ({ role, ...PERSONAS[role] })).find((p) => p.name === name);

export const ROLE_BADGE: Record<Role, string> = {
  requester: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  approver: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  procurement: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export const ROLE_AVATAR: Record<Role, string> = {
  requester: 'bg-sky-600',
  approver: 'bg-violet-600',
  procurement: 'bg-emerald-600',
};

export type Permission =
  | 'dashboard.view'
  | 'requests.viewAll'
  | 'requests.decide'
  | 'vendors.view'
  | 'rfqs.manage'
  | 'pos.manage'
  | 'analytics.view';

const PERMISSIONS: Record<Role, Permission[]> = {
  requester: [],
  approver: ['dashboard.view', 'requests.viewAll', 'requests.decide', 'vendors.view'],
  // Procurement doesn't approve its own sourcing work (separation of duties).
  procurement: ['dashboard.view', 'requests.viewAll', 'vendors.view', 'rfqs.manage', 'pos.manage', 'analytics.view'],
};

export const hasPermission = (role: Role, permission: Permission) => PERMISSIONS[role].includes(permission);

// The first role that has a permission, for "switch to X" hints on restricted pages.
export const roleWith = (permission: Permission) => ROLES.find((r) => hasPermission(r, permission))!;
