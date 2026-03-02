// Course edit panel — client component for editing course info and soft delete/restore
// Used in course detail page

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CourseForm, type CourseFormValues } from '@/components/admin/course-form';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw } from 'lucide-react';
import { updateCourse, deleteCourse, restoreCourse } from '@/lib/actions/course-actions';
import type { CourseDetail } from '@/lib/types/course';

interface CourseEditPanelProps {
  course: CourseDetail;
  programs: { id: string; name: string }[];
}

export function CourseEditPanel({ course, programs }: CourseEditPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  async function handleSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = await updateCourse(course.id, {
        ...values,
        order: Number(values.order),
      });

      if (result.success) {
        toast.success('Cập nhật khóa học thành công');
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Xóa khóa học "${course.title}"? Bị chặn nếu còn bài học đang hoạt động.`)) return;
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (result.success) {
        toast.success('Đã xóa khóa học');
        router.push('/admin/courses');
      } else {
        toast.error(result.error ?? 'Xóa thất bại');
      }
    });
  }

  function handleRestore() {
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

  if (isEditing) {
    return (
      <div className="space-y-4">
        <CourseForm
          defaultValues={{
            programId: course.programId,
            title: course.title,
            description: course.description ?? '',
            type: course.type,
            level: course.level,
            order: course.order,
          }}
          programs={programs}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel="Cập nhật"
        />
        <Button variant="ghost" onClick={() => setIsEditing(false)} className="w-full">
          Hủy
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Read-only summary */}
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-500">Chương trình</dt>
          <dd className="font-medium">{course.program.name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Mô tả</dt>
          <dd>{course.description ?? <span className="italic text-gray-400">Không có mô tả</span>}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Thứ tự</dt>
          <dd className="font-medium">{course.order}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          onClick={() => setIsEditing(true)}
          variant="outline"
          className="w-full"
        >
          Chỉnh sửa thông tin
        </Button>

        {course.isDeleted ? (
          <Button
            onClick={handleRestore}
            variant="outline"
            disabled={isPending}
            className="w-full border-green-300 text-green-700 hover:bg-green-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Khôi phục khóa học
          </Button>
        ) : (
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isPending}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa khóa học
          </Button>
        )}
      </div>
    </div>
  );
}
