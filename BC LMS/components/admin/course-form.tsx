// Course create/edit form — program select, type, level, order fields
// Used in create dialog and course detail edit page
// Level info: BASIC = tất cả vai trò, ADVANCED = chỉ Admin + Giáo viên

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const courseFormSchema = z.object({
  programId: z.string().min(1, 'Vui lòng chọn chương trình'),
  title: z.string().min(2, 'Tiêu đề khóa học phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  type: z.enum(['TRAINING', 'MATERIAL']),
  level: z.enum(['BASIC', 'ADVANCED']),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

type ProgramOption = { id: string; name: string };

interface CourseFormProps {
  defaultValues?: Partial<CourseFormValues>;
  programs: ProgramOption[];
  onSubmit: (values: CourseFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function CourseForm({
  defaultValues,
  programs,
  onSubmit,
  isLoading = false,
  submitLabel = 'Lưu',
}: CourseFormProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      programId: defaultValues?.programId ?? '',
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      type: defaultValues?.type ?? 'TRAINING',
      level: defaultValues?.level ?? 'BASIC',
      order: defaultValues?.order ?? 1,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Program select */}
        <FormField
          control={form.control}
          name="programId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chương trình</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chương trình..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên khóa học</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Grammar Level 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea placeholder="Mô tả ngắn về khóa học..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TRAINING">Đào tạo</SelectItem>
                    <SelectItem value="MATERIAL">Tài liệu</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Level */}
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cấp độ</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BASIC">Cơ bản (Tất cả)</SelectItem>
                    <SelectItem value="ADVANCED">Nâng cao (Admin + Giáo viên)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Order */}
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thứ tự hiển thị</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                />
              </FormControl>
              <p className="text-xs text-gray-500">Thứ tự phải là duy nhất trong mỗi chương trình</p>
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
