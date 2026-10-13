export type Status = 'pending' | 'approved' | 'rejected';
export type Decision = Exclude<Status, 'pending'>;
export type Priority = 'low' | 'medium' | 'high';

export const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Marketing'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Requests whose total (price × quantity) exceeds this are flagged as over budget.
export const BUDGET_THRESHOLD = 10_000;

export type HistoryEntry = {
  action: 'submitted' | Decision;
  comment?: string;
  by?: string;
  at: string;
};

export type PurchaseRequest = {
  _id: string;
  itemName: string;
  description: string;
  quantity: number;
  estimatedPrice: number;
  preferredVendor: string;
  status: Status;
  // Older records created before these fields existed won't have them.
  priority?: Priority;
  department?: Department;
  requestedBy?: string;
  history?: HistoryEntry[];
  createdAt: string;
  updatedAt?: string;
};

// Separation of duties: the person who submitted a request can't decide on it.
export const isOwnRequest = (r: PurchaseRequest, userName: string) => r.requestedBy === userName;
export const SELF_APPROVAL_MESSAGE = 'You cannot approve your own request';

export const requestTotal = (r: PurchaseRequest) => r.estimatedPrice * r.quantity;

// Older records have no stored history, so reconstruct what we can from timestamps.
export function getHistory(r: PurchaseRequest): HistoryEntry[] {
  if (r.history?.length) return r.history;
  const entries: HistoryEntry[] = [{ action: 'submitted', by: r.requestedBy, at: r.createdAt }];
  if (r.status !== 'pending') entries.push({ action: r.status, at: r.updatedAt ?? r.createdAt });
  return entries;
}

export type RFQStatus = 'draft' | 'sent' | 'quotes_received' | 'awarded';
export type QuoteStatus = 'pending' | 'quoted' | 'declined';

export type RFQVendor = {
  _id: string;
  name: string;
  email?: string;
  estimatedPrice?: number; // expected unit price in BD, for reference only (not a quote)
  quotedPrice?: number; // unit price
  deliveryDays?: number;
  notes?: string;
  status: QuoteStatus;
};

export type RFQ = {
  _id: string;
  // Populated by the API; null if the underlying request was deleted.
  requestId: PurchaseRequest | null;
  vendors: RFQVendor[];
  deadline: string;
  notes?: string;
  status: RFQStatus;
  awardedVendorId?: string;
  purchaseOrderId?: string;
  createdAt: string;
};

export type POStatus = 'draft' | 'sent' | 'acknowledged' | 'completed';

export type PurchaseOrder = {
  _id: string;
  poNumber: string;
  requestId: string;
  rfqId?: string;
  vendor: { name: string; email?: string };
  items: { itemName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
  status: POStatus;
  createdAt: string;
};

// Bahrain VAT. A PO's stored totalAmount is the subtotal before VAT.
export const VAT_RATE = 0.1;
const toFils = (n: number) => Math.round(n * 1000) / 1000;
export const poVat = (po: PurchaseOrder) => toFils(po.totalAmount * VAT_RATE);
export const poGrandTotal = (po: PurchaseOrder) => toFils(po.totalAmount + poVat(po));

export type AppNotification = {
  _id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  link?: string;
  createdAt: string;
};
