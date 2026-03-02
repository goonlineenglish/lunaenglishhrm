'use client';

// ReportTable — generic reusable table with CSV export button
// Accepts typed column definitions and row data

import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ReportColumn<T = any> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  filename?: string;
  emptyMessage?: string;
}

function getStringValue<T>(row: T, key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (row as any)[key];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleString('vi-VN');
  return String(value);
}

function exportCsv<T>(columns: ReportColumn<T>[], rows: T[], filename: string) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows
    .map((r) =>
      columns
        .map((col) => {
          const raw = getStringValue(r, col.key);
          return `"${raw.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  // BOM for Vietnamese chars in Excel
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportTable<T>({
  columns,
  rows,
  filename = 'report.csv',
  emptyMessage = 'Không có dữ liệu',
}: ReportTableProps<T>) {
  return (
    <div className="space-y-3">
      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCsv(columns, rows, filename)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Xuất CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-neutral-700">
                      {col.render ? col.render(row) : getStringValue(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400 text-right">{rows.length} kết quả</p>
    </div>
  );
}
