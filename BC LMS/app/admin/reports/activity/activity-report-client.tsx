'use client';

// ActivityReportClient — client wrapper for activity report table + CSV export

import { ReportTable, type ReportColumn } from '@/components/admin/report-table';
import type { ActivityReportRow } from '@/lib/types/report';

interface ActivityReportClientProps {
  rows: ActivityReportRow[];
}

const COLUMNS: ReportColumn<ActivityReportRow>[] = [
  { key: 'name', label: 'Họ tên' },
  { key: 'email', label: 'Email' },
  {
    key: 'lastLogin',
    label: 'Đăng nhập cuối',
    render: (row) =>
      row.lastLogin
        ? new Date(row.lastLogin).toLocaleString('vi-VN')
        : 'Chưa đăng nhập',
  },
];

export function ActivityReportClient({ rows }: ActivityReportClientProps) {
  return (
    <ReportTable
      columns={COLUMNS}
      rows={rows}
      filename="bao-cao-hoat-dong.csv"
      emptyMessage="Không có dữ liệu người dùng"
    />
  );
}
