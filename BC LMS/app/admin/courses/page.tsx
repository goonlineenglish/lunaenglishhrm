// Admin course list page — server component
// Filter by program via ?programId= query param
// Two tabs: Đang hoạt động / Đã xóa

import { Suspense } from 'react';
import { getCourses } from '@/lib/actions/course-actions';
import { getPrograms } from '@/lib/actions/program-actions';
import { CourseTable } from '@/components/admin/course-table';
import { CreateCourseDialog } from '@/components/admin/create-course-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Quản lý khóa học | BC LMS' };

type PageProps = {
  searchParams: Promise<{ programId?: string }>;
};

async function ActiveCoursesTab({
  programId,
  programs,
}: {
  programId?: string;
  programs: { id: string; name: string }[];
}) {
  const courses = await getCourses({ programId, showDeleted: false });
  return <CourseTable courses={courses} programs={programs} showDeleted={false} />;
}

async function DeletedCoursesTab({
  programId,
  programs,
}: {
  programId?: string;
  programs: { id: string; name: string }[];
}) {
  const courses = await getCourses({ programId, showDeleted: true });
  return <CourseTable courses={courses} programs={programs} showDeleted={true} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-2 mt-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default async function AdminCoursesPage({ searchParams }: PageProps) {
  const { programId } = await searchParams;
  const allPrograms = await getPrograms({ showDeleted: false });
  const programs = allPrograms.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khóa học</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý khóa học theo chương trình
          </p>
        </div>
        <CreateCourseDialog programs={programs} />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
          <TabsTrigger value="deleted">Đã xóa</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <ActiveCoursesTab programId={programId} programs={programs} />
          </Suspense>
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <DeletedCoursesTab programId={programId} programs={programs} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
