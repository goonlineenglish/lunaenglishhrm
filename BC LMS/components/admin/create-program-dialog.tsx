// Create program dialog — floating button + dialog with ProgramForm
// Used on the admin programs list page

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
import { ProgramForm, type ProgramFormValues } from '@/components/admin/program-form';
import { createProgram } from '@/lib/actions/program-actions';

export function CreateProgramDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(values: ProgramFormValues) {
    startTransition(async () => {
      const result = await createProgram(values);
      if (result.success) {
        toast.success('Tạo chương trình thành công');
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
          Tạo chương trình
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo chương trình mới</DialogTitle>
        </DialogHeader>
        <ProgramForm
          onSubmit={handleSubmit}
          isLoading={isPending}
          submitLabel="Tạo chương trình"
        />
      </DialogContent>
    </Dialog>
  );
}
