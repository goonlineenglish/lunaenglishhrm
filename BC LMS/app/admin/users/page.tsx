// Admin users page — server component that fetches user lists
// Renders tabs for active/deleted users with UserListClient

import { Suspense } from 'react';
import { getUsers } from '@/lib/actions/user-actions';
import { UserListClient } from '@/components/admin/user-list-client';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; tab?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10);
  const search = params.search ?? '';
  const showDeleted = params.tab === 'deleted';

  const [activeResult, deletedResult] = await Promise.all([
    getUsers({ page: showDeleted ? 1 : page, search: showDeleted ? '' : search, showDeleted: false }),
    getUsers({ page: showDeleted ? page : 1, search: showDeleted ? search : '', showDeleted: true }),
  ]);

  const activeUsers = activeResult.success ? activeResult.data!.users : [];
  const activeTotal = activeResult.success ? activeResult.data!.total : 0;
  const activePages = activeResult.success ? activeResult.data!.pages : 0;

  const deletedUsers = deletedResult.success ? deletedResult.data!.users : [];
  const deletedTotal = deletedResult.success ? deletedResult.data!.total : 0;
  const deletedPages = deletedResult.success ? deletedResult.data!.pages : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Người dùng</h1>
        <p className="text-sm text-neutral-500 mt-1">Quản lý tài khoản người dùng hệ thống</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <UserListClient
          activeUsers={activeUsers}
          activeTotal={activeTotal}
          activePages={activePages}
          deletedUsers={deletedUsers}
          deletedTotal={deletedTotal}
          deletedPages={deletedPages}
          currentPage={page}
          currentSearch={search}
          currentTab={showDeleted ? 'deleted' : 'active'}
        />
      </Suspense>
    </div>
  );
}
