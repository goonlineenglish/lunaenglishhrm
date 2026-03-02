// Program create/edit form — used in admin create dialog and edit page
// Handles slug auto-generation from name, Zod validation via react-hook-form

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const programFormSchema = z.object({
  name: z.string().min(2, 'Tên chương trình phải có ít nhất 2 ký tự'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().optional(),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;

interface ProgramFormProps {
  defaultValues?: Partial<ProgramFormValues>;
  onSubmit: (values: ProgramFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

/** Auto-generate a URL-safe slug from a display name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function ProgramForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Lưu',
}: ProgramFormProps) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      slug: defaultValues?.slug ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  const nameValue = form.watch('name');
  const isEditMode = Boolean(defaultValues?.slug);

  // Auto-generate slug from name only in create mode
  useEffect(() => {
    if (!isEditMode && nameValue) {
      form.setValue('slug', slugify(nameValue), { shouldValidate: true });
    }
  }, [nameValue, isEditMode, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên chương trình</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Buttercup Level 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Định danh (slug)</FormLabel>
              <FormControl>
                <Input placeholder="vi-du-buttercup-level-1" {...field} />
              </FormControl>
              <p className="text-xs text-gray-500">
                Chỉ chứa chữ thường, số và dấu gạch ngang. Tự động tạo từ tên.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Mô tả ngắn về chương trình..."
                  rows={3}
                  {...field}
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
