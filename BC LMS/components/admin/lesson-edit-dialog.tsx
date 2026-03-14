'use client';

// Lesson edit dialog — wraps LessonForm + FileUploadWidget for admin lesson editing

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonForm, type LessonFormValues } from '@/components/admin/lesson-form';
import { FileUploadWidget } from '@/components/admin/file-upload-widget';
import type { LessonItem } from '@/lib/types/course';
import type { MaterialItem } from '@/lib/types/material';

interface LessonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonItem | null;
  courseId: string;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  isLoading: boolean;
  onMaterialsChange: () => void;
}

export function LessonEditDialog({
  open,
  onOpenChange,
  lesson,
  courseId,
  onSubmit,
  isLoading,
  onMaterialsChange,
}: LessonEditDialogProps) {
  if (!lesson) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bài học</DialogTitle>
        </DialogHeader>

        <LessonForm
          defaultValues={{
            title: lesson.title,
            order: lesson.order,
            duration: lesson.duration ?? undefined,
            content: lesson.content ?? '',
            videoUrl: lesson.videoUrl ?? '',
          }}
          onSubmit={onSubmit}
          isLoading={isLoading}
          submitLabel="Cập nhật"
        />

        {/* File upload widget — only show for saved lessons (has id) */}
        {lesson.id && (
          <div className="mt-4 pt-4 border-t">
            <FileUploadWidget
              courseId={courseId}
              lessonId={lesson.id}
              existingMaterials={(lesson.materials ?? []) as MaterialItem[]}
              onMaterialsChange={onMaterialsChange}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
