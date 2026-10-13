'use client';

import RequestsTable from '../components/RequestsTable';
import PageHeader from '../components/PageHeader';
import NewRequestButton from '../components/NewRequestButton';
import { useRole } from '../components/RoleProvider';
import { useRequests } from '../lib/useRequests';

const SUBTITLES = {
  requester: 'Track the status of the purchase requests you have submitted.',
  approver: 'Review and approve or reject purchase requests.',
  procurement: 'Approved requests are ready for sourcing — send an RFQ to collect quotes.',
};

export default function RequestsPage() {
  const { requests, loading, error, updateStatus } = useRequests();
  const { role, can } = useRole();

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={can('requests.viewAll') ? 'Requests' : 'My Requests'}
        subtitle={SUBTITLES[role]}
        actions={<NewRequestButton />}
      />

      <RequestsTable
        requests={requests}
        loading={loading}
        error={error}
        onStatusChange={updateStatus}
      />
    </div>
  );
}
