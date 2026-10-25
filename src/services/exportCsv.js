// Builds an Excel-friendly CSV (UTF-8 BOM, CRLF) and downloads it in the browser.
function cell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Stop spreadsheet apps from running cells that start like formulas.
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?\d[\d.\s-]*$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
