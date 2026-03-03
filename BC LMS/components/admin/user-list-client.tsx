'use client';

// User list client — tabs, search, create button, pagination
// Manages dialog state for create/edit, delegates table rendering to UserTable

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserTable } from '@/components/admin/user-table';
import { UserForm } from '@/components/admin/user-form';
import type { UserListItem } from '@/lib/types/user';

interface UserListClientProps {
  activeUsers: UserListItem[];
  activeTotal: number;
  activePages: number;
  deletedUsers: UserListItem[];
  deletedTotal: number;
  deletedPages: number;
  currentPage: number;
  currentSearch: string;
  currentTab: 'active' | 'deleted';
}

export function UserListClient({
  activeUsers, activeTotal, activePages,
  deletedUsers, deletedTotal, deletedPages,
  currentPage, currentSearch, currentTab,
}: UserListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.page && params.page !== '1') sp.set('page', params.page);
    if (params.tab && params.tab !== 'active') sp.set('tab', params.tab);
    const query = sp.toString();
    startTransition(() => router.push(`${pathname}${query ? '?' + query : ''}`));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search, tab: currentTab, page: '1' });
  }

  function handleTabChange(tab: string) {
    setSearch('');
    navigate({ tab, page: '1' });
  }

  function openCreate() {
    setEditUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserListItem) {
    setEditUser(user);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    router.refresh();
  }

  const isActive = currentTab === 'active';
  const pages = isActive ? activePages : deletedPages;
  const total = isActive ? activeTotal : deletedTotal;

  return (
    <>
      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editUser={editUser}
        onSuccess={handleFormSuccess}
      />

      <div className="flex items-center justify-between mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email hoặc tên..."
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">Tìm</Button>
        </form>

        <Button
          onClick={openCreate}
          style={{ backgroundColor: '#4F46E5' }}
          className="text-white hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo người dùng
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">
            Đang hoạt động ({activeTotal})
          </TabsTrigger>
          <TabsTrigger value="deleted">
            Đã xóa ({deletedTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="bg-white rounded-lg border">
            <UserTable users={activeUsers} showDeleted={false} onEdit={openEdit} />
          </div>
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <div className="bg-white rounded-lg border">
            <UserTable users={deletedUsers} showDeleted={true} onEdit={openEdit} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => navigate({ tab: currentTab, page: String(currentPage - 1), search })}
          >
            Trước
          </Button>
          <span className="px-3 py-1 text-sm text-neutral-600">
            Trang {currentPage} / {pages} ({total} người dùng)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pages}
            onClick={() => navigate({ tab: currentTab, page: String(currentPage + 1), search })}
          >
            Sau
          </Button>
        </div>
      )}
    </>
  );
}
