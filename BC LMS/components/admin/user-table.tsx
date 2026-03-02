'use client';

// User table client component — displays user list with actions
// Handles delete/restore via server actions, triggers form dialog for create/edit

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/shared/role-badge';
import { deleteUser, restoreUser } from '@/lib/actions/user-actions';
import type { UserListItem } from '@/lib/types/user';

interface UserTableProps {
  users: UserListItem[];
  showDeleted?: boolean;
  onEdit: (user: UserListItem) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function UserTable({ users, showDeleted = false, onEdit }: UserTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    setActioningId(id);
    startTransition(async () => {
      const result = await deleteUser(id);
      setActioningId(null);
      if (result.success) {
        toast.success('Đã xóa người dùng');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRestore(id: string) {
    setActioningId(id);
    startTransition(async () => {
      const result = await restoreUser(id);
      setActioningId(null);
      if (result.success) {
        toast.success('Đã khôi phục người dùng');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
        <p className="text-lg font-medium">
          {showDeleted ? 'Không có người dùng đã xóa' : 'Không có người dùng nào'}
        </p>
        <p className="text-sm mt-1">
          {showDeleted ? 'Tất cả người dùng đang hoạt động' : 'Tạo người dùng đầu tiên bằng nút ở trên'}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Tên</TableHead>
          <TableHead>Trường</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Ngày tạo</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className={showDeleted ? 'opacity-60' : ''}>
            <TableCell className="font-medium">{user.email}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.school ?? <span className="text-neutral-400">—</span>}</TableCell>
            <TableCell><RoleBadge role={user.role} /></TableCell>
            <TableCell className="text-sm text-neutral-500">{formatDate(user.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {!showDeleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(user)}
                    aria-label="Chỉnh sửa"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {!showDeleted ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => handleDelete(user.id)}
                    disabled={isPending && actioningId === user.id}
                    aria-label="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-indigo-600 hover:text-indigo-700"
                    onClick={() => handleRestore(user.id)}
                    disabled={isPending && actioningId === user.id}
                    aria-label="Khôi phục"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
