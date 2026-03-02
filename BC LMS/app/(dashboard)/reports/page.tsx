'use client';

// Manager reports page — school-scoped progress report
// Accessible to MANAGER role; IDOR protection handled in getProgressReport server action

import { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { ReportTable, type ReportColumn } from '@/components/admin/report-table';
import { ReportFiltersBar } from '@/components/admin/report-filters';
import { getProgressReport } from '@/lib/actions/report-actions';
import type { ProgressReportRow, ReportFilters } from '@/lib/types/report';

const COLUMNS: ReportColumn<ProgressReportRow>[] = [
  { key: 'name', label: 'Họ tên' },
  { key: 'email', label: 'Email' },
  { key: 'school', label: 'Cơ sở' },
  { key: 'enrollmentCount', label: 'Số khóa học' },
  { key: 'completedCount', label: 'Bài đã hoàn thành' },
  {
    key: 'completionRate',
    label: 'Tỷ lệ hoàn thành',
    render: (row) => `${row.completionRate}%`,
  },
];

export default function ManagerReportsPage() {
  const [rows, setRows] = useState<ProgressReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport(filters: ReportFilters = {}) {
    setLoading(true);
    setError(null);
    try {
      // getProgressReport auto-scopes to manager's school (IDOR protection in server action)
      const data = await getProgressReport(filters);
      setRows(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải báo cáo';
      setError(message);
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
        <BarChart2 className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Báo cáo tiến độ học</h1>
          <p className="text-sm text-neutral-500">Thống kê học viên trong cơ sở của bạn</p>
        </div>
      </div>

      <ReportFiltersBar onFilter={fetchReport} />

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
          filename="bao-cao-co-so.csv"
          emptyMessage="Không có dữ liệu học viên"
        />
      )}
    </div>
  );
}
