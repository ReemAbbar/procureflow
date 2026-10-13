import { Suspense } from 'react';
import RequireRole from '../../components/RequireRole';
import PurchaseOrderDetail from './PurchaseOrderDetail';

// The id isn't known at build time, so the client component that reads it
// must sit inside Suspense (required with cacheComponents).
export default function PurchaseOrderPage() {
  return (
    <RequireRole permission="pos.manage">
      <Suspense
        fallback={<p className="p-8 text-center text-sm text-slate-500">Loading purchase order…</p>}
      >
        <PurchaseOrderDetail />
      </Suspense>
    </RequireRole>
  );
}
