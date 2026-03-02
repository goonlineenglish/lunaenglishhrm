// Lesson create/edit form — title, content (optional), videoUrl (optional), duration, order
// Phase 1: content and videoUrl fields present but optional

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const lessonFormSchema = z.object({
  title: z.string().min(2, 'Tiêu đề bài học phải có ít nhất 2 ký tự'),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
  duration: z.number().int().positive().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url('URL video không hợp lệ').optional().or(z.literal('')),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface LessonFormProps {
  defaultValues?: Partial<LessonFormValues>;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function LessonForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Lưu',
}: LessonFormProps) {
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      order: defaultValues?.order ?? 1,
      duration: defaultValues?.duration ?? undefined,
      content: defaultValues?.content ?? '',
      videoUrl: defaultValues?.videoUrl ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên bài học</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Bài 1 - Giới thiệu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thứ tự</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thời lượng (phút)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Không bắt buộc"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      field.onChange(isNaN(val) ? undefined : val);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* videoUrl — optional in Phase 1, full implementation in Phase 2 */}
        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Video</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://drive.google.com/... (tùy chọn)"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* content — optional in Phase 1, Tiptap editor in Phase 2 */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nội dung bài học</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Nội dung bài học (tùy chọn, Phase 1)..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? 'Đang lưu...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
