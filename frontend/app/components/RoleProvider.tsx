'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { hasPermission, PERSONAS, ROLES, type Permission, type Role } from '../lib/roles';

const STORAGE_KEY = 'procureflow.role';
const CHANGE_EVENT = 'procureflow:role-changed';
// Used during prerender/hydration and when nothing is stored yet.
const DEFAULT_ROLE: Role = 'procurement';

// Fallback for when localStorage is unavailable (e.g. blocked site data):
// the role still switches for this page session, it just won't persist.
let memoryRole: Role | null = null;

function readRole(): Role {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (ROLES.includes(stored as Role)) return stored as Role;
  } catch {
    // storage blocked; fall through
  }
  return memoryRole ?? DEFAULT_ROLE;
}

function subscribe(callback: () => void) {
  // 'storage' keeps other tabs in sync; the custom event covers this tab.
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

type RoleContextValue = {
  role: Role;
  user: (typeof PERSONAS)[Role];
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const role = useSyncExternalStore(subscribe, readRole, () => DEFAULT_ROLE);

  const setRole = useCallback((next: Role) => {
    memoryRole = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore: memoryRole keeps it for this session.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      user: PERSONAS[role],
      setRole,
      can: (permission) => hasPermission(role, permission),
    }),
    [role, setRole]
  );

  return <RoleContext value={value}>{children}</RoleContext>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>');
  return ctx;
}
