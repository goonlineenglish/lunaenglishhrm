// Program edit form wrapper for detail page — client component
// Wraps ProgramForm with server action and toast feedback

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProgramForm, type ProgramFormValues } from '@/components/admin/program-form';
import { updateProgram } from '@/lib/actions/program-actions';

interface ProgramEditFormProps {
  programId: string;
  defaultValues: ProgramFormValues;
}

export function ProgramEditForm({ programId, defaultValues }: ProgramEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(values: ProgramFormValues) {
    startTransition(async () => {
      const result = await updateProgram(programId, values);
      if (result.success) {
        toast.success('Cập nhật chương trình thành công');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <ProgramForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isPending}
      submitLabel="Lưu thay đổi"
    />
  );
}
