type Cell = string | number | undefined;

function escapeCell(value: Cell): string {
  if (value === undefined) return '';
  let s = String(value);
  // Prevent spreadsheet apps from interpreting user text as a formula.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, rows: Cell[][]) {
  const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  // BOM so Excel detects UTF-8.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
