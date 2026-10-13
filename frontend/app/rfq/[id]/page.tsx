import { Suspense } from 'react';
import RequireRole from '../../components/RequireRole';
import RfqDetail from './RfqDetail';

// The id isn't known at build time, so the client component that reads it
// must sit inside Suspense (required with cacheComponents).
export default function RfqPage() {
  return (
    <RequireRole permission="rfqs.manage">
      <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">Loading RFQ…</p>}>
        <RfqDetail />
      </Suspense>
    </RequireRole>
  );
}
