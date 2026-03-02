// New lesson plan page — select program + enter title, then redirect to editor
// Requires TEACHER, TEACHING_ASSISTANT or ADMIN role

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { prisma } from '@/lib/prisma';
import { NewPlanForm } from '@/components/lesson-plan/new-plan-form';
import { ChevronLeft } from 'lucide-react';

const ALLOWED_ROLES = ['TEACHER', 'TEACHING_ASSISTANT', 'ADMIN'] as const;

export default async function NewLessonPlanPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) redirect('/dashboard');

  // Load programs the user is a member of (or all for admin)
  const programs = user.role === 'ADMIN'
    ? await prisma.program.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
    : await prisma.program.findMany({
        where: {
          isDeleted: false,
          users: { some: { userId: user.sub } },
        },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });

  return (
    <div className="max-w-lg mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/lesson-plans"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-5"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900 mb-1">Tạo kế hoạch mới</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Chọn chương trình và nhập tiêu đề để bắt đầu soạn kế hoạch.
        </p>

        {programs.length === 0 ? (
          <p className="text-neutral-500 text-sm">
            Bạn chưa được gán vào chương trình nào. Liên hệ admin để được phân công.
          </p>
        ) : (
          <NewPlanForm programs={programs} />
        )}
      </div>
    </div>
  );
}
