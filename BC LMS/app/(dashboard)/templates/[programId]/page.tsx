// Template viewer page — read-only view of program lesson plan template
// Accessible to all authenticated roles

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getTemplate } from '@/lib/actions/template-actions';
import { TiptapViewer } from '@/components/tiptap/tiptap-viewer';
import { ChevronLeft, FileText } from 'lucide-react';

interface Props {
  params: Promise<{ programId: string }>;
}

export default async function TemplateViewerPage({ params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const { programId } = await params;
  const result = await getTemplate(programId);

  if (!result.success) notFound();

  const { name, slug, lessonPlanTemplate } = result.data;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-5"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại trang chủ
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" />
          Template: {name}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Chương trình: <span className="font-mono">{slug}</span>
        </p>
      </div>

      {lessonPlanTemplate ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm overflow-auto">
          <TiptapViewer content={lessonPlanTemplate} />
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm text-center text-neutral-500">
          <FileText className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
          <p>Chương trình này chưa có template kế hoạch.</p>
          <p className="text-sm mt-1">Liên hệ admin để thiết lập template.</p>
        </div>
      )}
    </div>
  );
}
