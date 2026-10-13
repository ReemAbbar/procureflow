import type { PurchaseRequest, Status } from './types';
import { getHistory, requestTotal } from './types';

const DAY = 24 * 60 * 60 * 1000;
const TREND_WINDOW_DAYS = 30;

export type Kpis = {
  totalSpend: number;
  avgRequestValue: number;
  approvalRate: number; // 0–100, of decided requests
  avgProcessingDays: number | null; // null when nothing has been approved
};

export type Trend = { delta: number; unit: '%' | 'pts' | 'days' } | 'new' | null;

export type Analytics = {
  kpis: Kpis;
  trends: Record<keyof Kpis, Trend>;
  monthly: { month: string; requested: number; approved: number }[];
  byDepartment: { department: string; spend: number; count: number }[];
  statusCounts: Record<Status, number>;
};

// When a request was approved: from its stored history, or updatedAt for legacy records.
function approvedAt(r: PurchaseRequest): number | null {
  if (r.status !== 'approved') return null;
  const entry = getHistory(r).find((h) => h.action === 'approved');
  return new Date(entry?.at ?? r.updatedAt ?? r.createdAt).getTime();
}

export function computeKpis(requests: PurchaseRequest[]): Kpis {
  const totalSpend = requests.reduce((sum, r) => sum + requestTotal(r), 0);
  const approved = requests.filter((r) => r.status === 'approved');
  const decided = requests.filter((r) => r.status !== 'pending').length;
  const durations = approved
    .map((r) => (approvedAt(r)! - new Date(r.createdAt).getTime()) / DAY)
    .filter((d) => d >= 0);

  return {
    totalSpend,
    avgRequestValue: requests.length ? totalSpend / requests.length : 0,
    approvalRate: decided ? (approved.length / decided) * 100 : 0,
    avgProcessingDays: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null,
  };
}

function computeTrends(requests: PurchaseRequest[], now: number): Record<keyof Kpis, Trend> {
  const age = (r: PurchaseRequest) => now - new Date(r.createdAt).getTime();
  const cur = computeKpis(requests.filter((r) => age(r) <= TREND_WINDOW_DAYS * DAY));
  const prev = computeKpis(
    requests.filter((r) => age(r) > TREND_WINDOW_DAYS * DAY && age(r) <= 2 * TREND_WINDOW_DAYS * DAY)
  );

  const pct = (c: number, p: number): Trend => {
    if (p === 0) return c > 0 ? 'new' : null;
    return { delta: ((c - p) / p) * 100, unit: '%' };
  };

  return {
    totalSpend: pct(cur.totalSpend, prev.totalSpend),
    avgRequestValue: pct(cur.avgRequestValue, prev.avgRequestValue),
    approvalRate:
      cur.approvalRate || prev.approvalRate
        ? { delta: cur.approvalRate - prev.approvalRate, unit: 'pts' }
        : null,
    avgProcessingDays:
      cur.avgProcessingDays !== null && prev.avgProcessingDays !== null
        ? { delta: cur.avgProcessingDays - prev.avgProcessingDays, unit: 'days' }
        : null,
  };
}

// Calls Date.now(), so only invoke it client-side after data has loaded
// (never during prerender).
export function computeAnalytics(requests: PurchaseRequest[]): Analytics {
  const now = Date.now();
  const today = new Date(now);

  const months: Analytics['monthly'] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthIndex.set(key, months.length);
    months.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      requested: 0,
      approved: 0,
    });
  }

  const departments = new Map<string, { spend: number; count: number }>();
  const statusCounts: Record<Status, number> = { pending: 0, approved: 0, rejected: 0 };

  for (const r of requests) {
    const total = requestTotal(r);
    const created = new Date(r.createdAt);
    const idx = monthIndex.get(`${created.getFullYear()}-${created.getMonth()}`);
    if (idx !== undefined) {
      months[idx].requested += total;
      if (r.status === 'approved') months[idx].approved += total;
    }

    const dept = r.department ?? 'Unassigned';
    const d = departments.get(dept) ?? { spend: 0, count: 0 };
    d.spend += total;
    d.count++;
    departments.set(dept, d);

    statusCounts[r.status]++;
  }

  return {
    kpis: computeKpis(requests),
    trends: computeTrends(requests, now),
    monthly: months,
    byDepartment: [...departments.entries()]
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.spend - a.spend),
    statusCounts,
  };
}
