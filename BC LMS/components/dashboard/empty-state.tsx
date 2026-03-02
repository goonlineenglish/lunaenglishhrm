// EmptyState — shown when a user has no accessible courses in the dashboard
// Provides Vietnamese message and admin contact CTA

import { GraduationCap } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <GraduationCap className="h-14 w-14 text-neutral-300 mb-5" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-neutral-900">Chưa có khóa học nào</h3>
      <p className="text-sm text-neutral-600 mt-2 max-w-xs">
        Bạn chưa được đăng ký vào khóa học nào.
        <br />
        Vui lòng liên hệ quản trị viên để được phân công.
      </p>
    </div>
  );
}
