import PageHeader from '../components/PageHeader';
import { API_URL } from '../lib/api';

const rows = [
  { label: 'Organization', value: 'ProcureFlow' },
  { label: 'API endpoint', value: API_URL },
  { label: 'Currency', value: 'Bahraini Dinar (BD)' },
  { label: 'Approval workflow', value: 'Single approver' },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <PageHeader title="Settings" subtitle="Workspace configuration." />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Workspace</h2>
        </div>
        <dl className="divide-y divide-slate-100">
          {rows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-slate-500">{label}</dt>
              <dd className="text-sm text-slate-900 sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
