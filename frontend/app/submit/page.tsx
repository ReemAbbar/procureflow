'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '../components/PageHeader';
import BudgetFlag from '../components/BudgetFlag';
import { useToast } from '../components/Toast';
import { useRole } from '../components/RoleProvider';
import { ArrowLeftIcon } from '../components/icons';
import { API_URL, emitDataChanged } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { DEPARTMENTS, type Priority } from '../lib/types';

const priorities: { value: Priority; label: string; active: string }[] = [
  { value: 'low', label: 'Low', active: 'border-slate-400 bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium', active: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'high', label: 'High', active: 'border-rose-500 bg-rose-50 text-rose-700' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function SubmitRequest() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    itemName: '',
    description: '',
    quantity: '',
    estimatedPrice: '',
    preferredVendor: '',
    department: '',
    priority: 'medium' as Priority,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const total = Number(form.quantity) * Number(form.estimatedPrice) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requestedBy: user.name,
          quantity: Number(form.quantity),
          estimatedPrice: Number(form.estimatedPrice),
        }),
      });
      if (!res.ok) throw new Error();
      toast(`Request "${form.itemName}" created.`, 'info');
      emitDataChanged();
      router.push('/requests');
    } catch {
      setError('Could not submit the request. Check that the backend is running and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/requests"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to requests
      </Link>

      <PageHeader
        title="New Purchase Request"
        subtitle="Submit a request for approval. All fields are required."
      />

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <Field label="Item name" htmlFor="itemName" className="sm:col-span-2">
            <input id="itemName" name="itemName" required placeholder="e.g. Dell UltraSharp 27&quot; Monitor"
              value={form.itemName} onChange={handleChange} className={inputClass} />
          </Field>

          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <textarea id="description" name="description" rows={3} required placeholder="Business justification, specs, or notes"
              value={form.description} onChange={handleChange} className={inputClass} />
          </Field>

          <Field label="Quantity" htmlFor="quantity">
            <input id="quantity" name="quantity" type="number" min={1} step={1} required placeholder="1"
              value={form.quantity} onChange={handleChange} className={inputClass} />
          </Field>

          <Field label="Estimated unit price (BD)" htmlFor="estimatedPrice">
            <input id="estimatedPrice" name="estimatedPrice" type="number" min={0} step="0.001" required placeholder="0.000"
              value={form.estimatedPrice} onChange={handleChange} className={inputClass} />
          </Field>

          <Field label="Preferred vendor" htmlFor="preferredVendor">
            <input id="preferredVendor" name="preferredVendor" required placeholder="e.g. CDW"
              value={form.preferredVendor} onChange={handleChange} className={inputClass} />
          </Field>

          <Field label="Department" htmlFor="department">
            <select id="department" name="department" required
              value={form.department} onChange={handleChange} className={inputClass}>
              <option value="" disabled>Select a department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 block text-sm font-medium text-slate-700">Priority</legend>
            <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
              {priorities.map(({ value, label, active }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.priority === value}
                  onClick={() => setForm({ ...form, priority: value })}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    form.priority === value
                      ? active
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {error && (
          <p className="mx-6 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between rounded-b-xl">
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            Estimated total:
            <BudgetFlag total={total} />
            <span className="font-semibold text-slate-900">{formatCurrency(total)}</span>
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/requests')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
