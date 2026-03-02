// Course table — client component for displaying and acting on course list
// Shows type badge (TRAINING/MATERIAL), level badge (BASIC/ADVANCED), lesson count
// Handles edit dialog, delete confirmation, restore

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
import { CourseForm, type CourseFormValues } from '@/components/admin/course-form';
import { deleteCourse, restoreCourse, updateCourse } from '@/lib/actions/course-actions';
import type { CourseListItem } from '@/lib/types/course';

interface CourseTableProps {
  courses: CourseListItem[];
  programs: { id: string; name: string }[];
  showDeleted?: boolean;
}

function TypeBadge({ type }: { type: 'TRAINING' | 'MATERIAL' }) {
  return (
    <Badge
      variant="outline"
      className={type === 'TRAINING' ? 'border-blue-400 text-blue-700' : 'border-amber-400 text-amber-700'}
    >
      {type === 'TRAINING' ? 'Đào tạo' : 'Tài liệu'}
    </Badge>
  );
}

function LevelBadge({ level }: { level: 'BASIC' | 'ADVANCED' }) {
  return (
    <Badge
      className={level === 'ADVANCED'
        ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}
    >
      {level === 'ADVANCED' ? 'Nâng cao' : 'Cơ bản'}
    </Badge>
  );
}

export function CourseTable({ courses, programs, showDeleted = false }: CourseTableProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<CourseListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleEditSubmit(values: CourseFormValues) {
    if (!editTarget) return;
    const result = await updateCourse(editTarget.id, {
      ...values,
      order: Number(values.order),
    });
    if (result.success) {
      toast.success('Cập nhật khóa học thành công');
      setEditTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleDelete(course: CourseListItem) {
    if (!confirm(`Xóa khóa học "${course.title}"? Bị chặn nếu còn bài học đang hoạt động.`)) return;
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (result.success) {
        toast.success('Đã xóa khóa học');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Xóa thất bại');
      }
    });
  }

  function handleRestore(course: CourseListItem) {
    startTransition(async () => {
      const result = await restoreCourse(course.id);
      if (result.success) {
        toast.success('Đã khôi phục khóa học');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Khôi phục thất bại');
      }
    });
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">
          {showDeleted ? 'Không có khóa học đã xóa' : 'Chưa có khóa học nào'}
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">STT</TableHead>
            <TableHead>Tên khóa học</TableHead>
            <TableHead>Chương trình</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Cấp độ</TableHead>
            <TableHead className="text-center">Bài học</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id} className={course.isDeleted ? 'opacity-60' : ''}>
              <TableCell className="text-gray-500 text-sm">{course.order}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{course.title}</p>
                  {course.description && (
                    <p className="text-xs text-gray-400 truncate max-w-xs">{course.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-600">{course.program.name}</TableCell>
              <TableCell><TypeBadge type={course.type} /></TableCell>
              <TableCell><LevelBadge level={course.level} /></TableCell>
              <TableCell className="text-center">{course._count.lessons}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {showDeleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(course)}
                      disabled={isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Khôi phục
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditTarget(course)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(course)}
                        disabled={isPending}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa khóa học</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CourseForm
              defaultValues={{
                programId: editTarget.programId,
                title: editTarget.title,
                description: editTarget.description ?? '',
                type: editTarget.type,
                level: editTarget.level,
                order: editTarget.order,
              }}
              programs={programs}
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
