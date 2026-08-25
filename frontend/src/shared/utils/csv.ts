/** Escapes a value for CSV, quoting only when the cell would otherwise break. */
export function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV blob from a header row plus data rows and saves it. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const body = rows.map(row => row.map(csvCell).join(','));
  const blob = new Blob([[headers.join(','), ...body].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Otherwise the blob is held for the life of the page.
  URL.revokeObjectURL(url);
}
