// Lesson plans list page — shows teacher's plans with search/filter
// TEACHER, TEACHING_ASSISTANT, ADMIN only

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getLessonPlans } from '@/lib/actions/lesson-plan-actions';
import { LessonPlanTable } from '@/components/lesson-plan/lesson-plan-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const ALLOWED_ROLES = ['TEACHER', 'TEACHING_ASSISTANT', 'ADMIN'] as const;

interface SearchParams {
  search?: string;
  programId?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function LessonPlansPage({ searchParams }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) redirect('/dashboard');

  const { search, programId } = await searchParams;

  const result = await getLessonPlans({ search, programId });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Kế hoạch dạy học</h1>
          <p className="text-sm text-neutral-500 mt-1">Quản lý và soạn thảo kế hoạch dạy học</p>
        </div>
        <Link href="/lesson-plans/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo kế hoạch mới
          </Button>
        </Link>
      </div>

      {/* Search filter (simple form GET) */}
      <form method="GET" className="mb-5 flex gap-2">
        <input
          name="search"
          defaultValue={search ?? ''}
          placeholder="Tìm kiếm kế hoạch..."
          className="flex-1 border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button type="submit" variant="outline" size="sm">Tìm kiếm</Button>
        {search && (
          <Link href="/lesson-plans">
            <Button variant="ghost" size="sm">Xóa bộ lọc</Button>
          </Link>
        )}
      </form>

      {/* Plan list */}
      {!result.success ? (
        <p className="text-red-600">{result.error}</p>
      ) : (
        <LessonPlanTable plans={result.data} />
      )}
    </div>
  );
}
