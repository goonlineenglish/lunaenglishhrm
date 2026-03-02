// Admin activity report page — last login per user
// Server component; fetches data at render time

import { Activity } from 'lucide-react';
import { getActivityReport } from '@/lib/actions/report-actions';
import { ActivityReportClient } from './activity-report-client';

export default async function AdminActivityReportPage() {
  let rows: Awaited<ReturnType<typeof getActivityReport>> = [];
  let error: string | null = null;

  try {
    rows = await getActivityReport();
  } catch {
    error = 'Không thể tải báo cáo hoạt động';
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Báo cáo hoạt động</h1>
          <p className="text-sm text-neutral-500">Lần đăng nhập cuối cùng của người dùng</p>
        </div>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      ) : (
        <ActivityReportClient rows={rows} />
      )}
    </div>
  );
}
