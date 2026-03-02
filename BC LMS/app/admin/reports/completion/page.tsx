'use client';

// Admin completion report page — per-course completion rates + CSV export

import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { ReportTable, type ReportColumn } from '@/components/admin/report-table';
import { ReportFiltersBar } from '@/components/admin/report-filters';
import { getCompletionReport } from '@/lib/actions/report-actions';
import type { CompletionReportRow, ReportFilters } from '@/lib/types/report';

const COLUMNS: ReportColumn<CompletionReportRow>[] = [
  { key: 'title', label: 'Khóa học' },
  { key: 'programName', label: 'Chương trình' },
  { key: 'enrollmentCount', label: 'Số học viên' },
  { key: 'completedCount', label: 'Đã hoàn thành' },
  {
    key: 'completionRate',
    label: 'Tỷ lệ hoàn thành',
    render: (row) => `${row.completionRate}%`,
  },
];

export default function AdminCompletionReportPage() {
  const [rows, setRows] = useState<CompletionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport(filters: ReportFilters = {}) {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompletionReport(filters);
      setRows(data);
    } catch (err) {
      setError('Không thể tải báo cáo. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Báo cáo hoàn thành khóa học</h1>
          <p className="text-sm text-neutral-500">Tỷ lệ hoàn thành theo từng khóa học</p>
        </div>
      </div>

      <ReportFiltersBar showProgramFilter onFilter={fetchReport} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Đang tải dữ liệu...</div>
      ) : (
        <ReportTable
          columns={COLUMNS}
          rows={rows}
          filename="bao-cao-hoan-thanh.csv"
          emptyMessage="Không có dữ liệu khóa học"
        />
      )}
    </div>
  );
}
