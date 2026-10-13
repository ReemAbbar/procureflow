// All amounts in the app are Bahraini dinars. The dinar has 1,000 fils, so
// amounts always show 3 decimal places: "BD 1,500.000".
const dinars = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export const formatCurrency = (value: number) =>
  value < 0 ? `-BD ${dinars.format(-value)}` : `BD ${dinars.format(value)}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

// Short form for chart axes, e.g. "BD 12.5K".
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCompactCurrency = (value: number) => `BD ${compact.format(value)}`;
