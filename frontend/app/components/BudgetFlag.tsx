import { BUDGET_THRESHOLD } from '../lib/types';
import { formatCurrency } from '../lib/format';
import { WarningIcon } from './icons';

export default function BudgetFlag({ total }: { total: number }) {
  if (total <= BUDGET_THRESHOLD) return null;
  const label = `Over budget threshold of ${formatCurrency(BUDGET_THRESHOLD)}`;
  return (
    <span title={label} aria-label={label} className="inline-flex text-amber-500">
      <WarningIcon className="h-4 w-4" />
    </span>
  );
}
