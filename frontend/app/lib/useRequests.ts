'use client';

import { useCallback } from 'react';
import { apiFetch, emitDataChanged } from './api';
import { useApi } from './useApi';
import { useRole } from '../components/RoleProvider';
import type { Decision, PurchaseRequest } from './types';

const EMPTY: PurchaseRequest[] = [];

export function useRequests() {
  const { data, loading, error } = useApi<PurchaseRequest[]>('/api/requests');
  const { user } = useRole();

  const updateStatus = useCallback(async (id: string, status: Decision, comment: string) => {
    await apiFetch(`/api/requests/${id}`, {
      method: 'PATCH',
      // The backend records the decider and refuses self-approval.
      body: JSON.stringify({ status, comment, decidedBy: user.name }),
    });
    // Refreshes this list plus the notification bell and sidebar counts.
    emitDataChanged();
  }, [user.name]);

  return { requests: data ?? EMPTY, loading, error, updateStatus };
}
