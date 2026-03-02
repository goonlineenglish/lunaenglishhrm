// Create course dialog — button + dialog wrapping CourseForm for new course creation

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CourseForm, type CourseFormValues } from '@/components/admin/course-form';
import { createCourse } from '@/lib/actions/course-actions';

interface CreateCourseDialogProps {
  programs: { id: string; name: string }[];
}

export function CreateCourseDialog({ programs }: CreateCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = await createCourse({
        ...values,
        order: Number(values.order),
      });

      if (result.success) {
        toast.success('Đã tạo khóa học thành công');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Tạo khóa học
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo khóa học mới</DialogTitle>
        </DialogHeader>
        <CourseForm
          programs={programs}
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel="Tạo khóa học"
        />
      </DialogContent>
    </Dialog>
  );
}
