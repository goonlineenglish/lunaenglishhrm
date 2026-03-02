'use client';

// NewPlanForm — select program and enter title to create a new lesson plan
// On success, redirects to editor page

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLessonPlan } from '@/lib/actions/lesson-plan-actions';
import { FileText } from 'lucide-react';

interface ProgramOption {
  id: string;
  name: string;
  slug: string;
}

interface NewPlanFormProps {
  programs: ProgramOption[];
}

export function NewPlanForm({ programs }: NewPlanFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState(programs[0]?.id ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    if (!programId) {
      toast.error('Vui lòng chọn chương trình');
      return;
    }
    startTransition(async () => {
      const result = await createLessonPlan({
        title: title.trim(),
        programId,
        content: JSON.stringify({ type: 'doc', content: [] }),
      });
      if (result.success) {
        toast.success('Đã tạo kế hoạch');
        router.push(`/lesson-plans/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="program">Chương trình</Label>
        <select
          id="program"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isPending}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề kế hoạch</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Kế hoạch buổi học Unit 1..."
          disabled={isPending}
          autoFocus
        />
      </div>

      <Button type="submit" disabled={isPending || programs.length === 0} className="w-full gap-2">
        <FileText className="h-4 w-4" />
        {isPending ? 'Đang tạo...' : 'Tạo kế hoạch'}
      </Button>
    </form>
  );
}
