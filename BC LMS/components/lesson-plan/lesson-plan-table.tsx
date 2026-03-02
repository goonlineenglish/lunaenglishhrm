'use client';

// LessonPlanTable — displays list of lesson plans with actions
// Columns: Title, Program, Last edited, Actions (edit, delete)

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteLessonPlan } from '@/lib/actions/lesson-plan-actions';
import { Pencil, Trash2, FileText } from 'lucide-react';
import type { LessonPlanItem } from '@/lib/types/lesson-plan';

interface LessonPlanTableProps {
  plans: LessonPlanItem[];
  onDeleted?: (id: string) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlanRow({
  plan,
  onDeleted,
}: {
  plan: LessonPlanItem;
  onDeleted?: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Xóa kế hoạch "${plan.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteLessonPlan(plan.id);
      if (result.success) {
        toast.success('Đã xóa kế hoạch');
        onDeleted?.(plan.id);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-medium text-neutral-900">{plan.title}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="text-xs">{plan.programName}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-neutral-500 whitespace-nowrap">
        {formatDate(plan.updatedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/lesson-plans/${plan.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function LessonPlanTable({ plans: initialPlans, onDeleted }: LessonPlanTableProps) {
  const [plans, setPlans] = useState(initialPlans);

  function handleDeleted(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    onDeleted?.(id);
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <FileText className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
        <p>Chưa có kế hoạch dạy học nào.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">Tiêu đề</th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">Chương trình</th>
            <th className="text-left px-4 py-3 font-medium text-neutral-600">Chỉnh sửa lần cuối</th>
            <th className="text-right px-4 py-3 font-medium text-neutral-600">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onDeleted={handleDeleted} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
