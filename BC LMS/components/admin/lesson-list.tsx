// Lesson list — ordered list within a course detail page
// Supports add/edit/delete lessons inline + up/down reorder buttons

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LessonForm, type LessonFormValues } from '@/components/admin/lesson-form';
import {
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from '@/lib/actions/course-actions';
import type { LessonItem } from '@/lib/types/course';

interface LessonListProps {
  courseId: string;
  initialLessons: LessonItem[];
}

export function LessonList({ courseId, initialLessons }: LessonListProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonItem[]>(initialLessons);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<LessonItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Compute next available order number
  const nextOrder = lessons.length > 0
    ? Math.max(...lessons.map((l) => l.order)) + 1
    : 1;

  async function handleAdd(values: LessonFormValues) {
    const result = await createLesson({
      courseId,
      title: values.title,
      order: Number(values.order),
      duration: values.duration ? Number(values.duration) : undefined,
      content: values.content || undefined,
      videoUrl: values.videoUrl || undefined,
    });

    if (result.success) {
      toast.success('Đã thêm bài học');
      setShowAddDialog(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleEdit(values: LessonFormValues) {
    if (!editTarget) return;
    const result = await updateLesson(editTarget.id, courseId, {
      title: values.title,
      order: Number(values.order),
      duration: values.duration ? Number(values.duration) : undefined,
      content: values.content || undefined,
      videoUrl: values.videoUrl || undefined,
    });

    if (result.success) {
      toast.success('Đã cập nhật bài học');
      setEditTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleDelete(lesson: LessonItem) {
    if (!confirm(`Xóa bài học "${lesson.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteLesson(lesson.id, courseId);
      if (result.success) {
        toast.success('Đã xóa bài học');
        // Optimistic update
        setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
        router.refresh();
      } else {
        toast.error(result.error ?? 'Xóa thất bại');
      }
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...lessons];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reindexed = updated.map((l, i) => ({ ...l, order: i + 1 }));
    setLessons(reindexed);

    startTransition(async () => {
      const result = await reorderLessons(courseId, reindexed.map((l) => l.id));
      if (!result.success) {
        toast.error(result.error ?? 'Sắp xếp thất bại');
        setLessons(initialLessons);
      }
    });
  }

  function handleMoveDown(index: number) {
    if (index === lessons.length - 1) return;
    const updated = [...lessons];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reindexed = updated.map((l, i) => ({ ...l, order: i + 1 }));
    setLessons(reindexed);

    startTransition(async () => {
      const result = await reorderLessons(courseId, reindexed.map((l) => l.id));
      if (!result.success) {
        toast.error(result.error ?? 'Sắp xếp thất bại');
        setLessons(initialLessons);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Bài học ({lessons.length})
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Thêm bài học
        </Button>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center border rounded-md border-dashed">
          Chưa có bài học nào
        </p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="flex items-center gap-3 p-3 border rounded-md bg-white"
            >
              {/* Order indicator */}
              <Badge variant="outline" className="shrink-0 w-8 justify-center">
                {lesson.order}
              </Badge>

              {/* Lesson info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{lesson.title}</p>
                {lesson.duration && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration} phút
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || isPending}
                  aria-label="Di chuyển lên"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === lessons.length - 1 || isPending}
                  aria-label="Di chuyển xuống"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditTarget(lesson)}
                  aria-label="Chỉnh sửa bài học"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(lesson)}
                  disabled={isPending}
                  aria-label="Xóa bài học"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add lesson dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm bài học mới</DialogTitle>
          </DialogHeader>
          <LessonForm
            defaultValues={{ order: nextOrder }}
            onSubmit={handleAdd}
            isLoading={isPending}
            submitLabel="Thêm bài học"
          />
        </DialogContent>
      </Dialog>

      {/* Edit lesson dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài học</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <LessonForm
              defaultValues={{
                title: editTarget.title,
                order: editTarget.order,
                duration: editTarget.duration ?? undefined,
                content: editTarget.content ?? '',
                videoUrl: editTarget.videoUrl ?? '',
              }}
              onSubmit={handleEdit}
              isLoading={isPending}
              submitLabel="Cập nhật"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
