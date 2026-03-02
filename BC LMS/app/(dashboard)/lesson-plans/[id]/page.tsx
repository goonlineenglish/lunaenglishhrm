// Lesson plan editor page — loads plan and renders editor with auto-save
// Ownership enforced in getLessonPlanById action

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getLessonPlanById } from '@/lib/actions/lesson-plan-actions';
import { LessonPlanEditorPage } from '@/components/lesson-plan/lesson-plan-editor-page';
import { ChevronLeft } from 'lucide-react';

const ALLOWED_ROLES = ['TEACHER', 'TEACHING_ASSISTANT', 'ADMIN'] as const;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonPlanEditorRoute({ params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) redirect('/dashboard');

  const { id } = await params;
  const result = await getLessonPlanById(id);

  if (!result.success) notFound();

  const plan = result.data;

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      {/* Breadcrumb */}
      <Link
        href="/lesson-plans"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4 no-print"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm flex-1 flex flex-col">
        <LessonPlanEditorPage
          planId={plan.id}
          initialTitle={plan.title}
          initialContent={plan.content}
          programName={plan.program.name}
          programTemplate={plan.program.lessonPlanTemplate}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
