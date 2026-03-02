// Admin reports dashboard — links to sub-reports
// ADMIN only (enforced by admin layout)

import Link from 'next/link';
import { BarChart2, Users, BookOpen, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const REPORT_LINKS = [
  {
    href: '/admin/reports/progress',
    label: 'Báo cáo tiến độ học',
    description: 'Thống kê số bài đã hoàn thành theo từng người dùng',
    icon: Users,
  },
  {
    href: '/admin/reports/completion',
    label: 'Báo cáo hoàn thành khóa học',
    description: 'Tỷ lệ hoàn thành theo từng khóa học',
    icon: BookOpen,
  },
  {
    href: '/admin/reports/activity',
    label: 'Báo cáo hoạt động',
    description: 'Lần đăng nhập cuối cùng của từng người dùng',
    icon: Activity,
  },
];

export default function AdminReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Báo cáo</h1>
          <p className="text-sm text-neutral-500">Thống kê và báo cáo hệ thống</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORT_LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-indigo-300 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-500">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
