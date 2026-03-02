// Admin programs list page — server component
// Shows active programs tab and deleted programs tab
// Admin-only route protected by proxy.ts middleware

import { Suspense } from 'react';
import { getPrograms } from '@/lib/actions/program-actions';
import { ProgramTable } from '@/components/admin/program-table';
import { CreateProgramDialog } from '@/components/admin/create-program-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Quản lý chương trình | BC LMS' };

async function ActiveProgramsTab() {
  const programs = await getPrograms({ showDeleted: false });
  return <ProgramTable programs={programs} showDeleted={false} />;
}

async function DeletedProgramsTab() {
  const programs = await getPrograms({ showDeleted: true });
  return <ProgramTable programs={programs} showDeleted={true} />;
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

export default function AdminProgramsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chương trình học</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý các chương trình học của hệ thống
          </p>
        </div>
        <CreateProgramDialog />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
          <TabsTrigger value="deleted">Đã xóa</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <ActiveProgramsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <DeletedProgramsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
