// Program table — client component for displaying and acting on program list
// Handles edit dialog open/close, delete confirmation, and restore

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, RotateCcw, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProgramForm, type ProgramFormValues } from '@/components/admin/program-form';
import { deleteProgram, restoreProgram, updateProgram } from '@/lib/actions/program-actions';
import type { ProgramListItem } from '@/lib/types/program';

interface ProgramTableProps {
  programs: ProgramListItem[];
  showDeleted?: boolean;
}

export function ProgramTable({ programs, showDeleted = false }: ProgramTableProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<ProgramListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(program: ProgramListItem) {
    setEditTarget(program);
  }

  async function handleEditSubmit(values: ProgramFormValues) {
    if (!editTarget) return;
    const result = await updateProgram(editTarget.id, values);
    if (result.success) {
      toast.success('Cập nhật chương trình thành công');
      setEditTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleDelete(program: ProgramListItem) {
    if (!confirm(`Xóa chương trình "${program.name}"? Hành động này có thể bị chặn nếu còn khóa học.`)) return;
    startTransition(async () => {
      const result = await deleteProgram(program.id);
      if (result.success) {
        toast.success('Đã xóa chương trình');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Xóa thất bại');
      }
    });
  }

  function handleRestore(program: ProgramListItem) {
    startTransition(async () => {
      const result = await restoreProgram(program.id);
      if (result.success) {
        toast.success('Đã khôi phục chương trình');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Khôi phục thất bại');
      }
    });
  }

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">
          {showDeleted ? 'Không có chương trình đã xóa' : 'Chưa có chương trình nào'}
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên chương trình</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead className="text-center">Khóa học</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id} className={program.isDeleted ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{program.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {program.slug}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-gray-500">
                {program.description ?? <span className="italic text-gray-400">Không có mô tả</span>}
              </TableCell>
              <TableCell className="text-center">{program._count.courses}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {showDeleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(program)}
                      disabled={isPending}
                      aria-label="Khôi phục chương trình"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Khôi phục
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(program)}
                        aria-label="Chỉnh sửa chương trình"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(program)}
                        disabled={isPending}
                        aria-label="Xóa chương trình"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chương trình</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ProgramForm
              defaultValues={{
                name: editTarget.name,
                slug: editTarget.slug,
                description: editTarget.description ?? '',
              }}
              onSubmit={handleEditSubmit}
              isLoading={isPending}
              submitLabel="Cập nhật"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
