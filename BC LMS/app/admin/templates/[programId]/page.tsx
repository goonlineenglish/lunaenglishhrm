// Admin template editor page — edit lessonPlanTemplate for a specific program
// Admin only; redirects others to dashboard

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getTemplate } from '@/lib/actions/template-actions';
import { TemplateEditorClient } from './template-editor-client';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params: Promise<{ programId: string }>;
}

export default async function AdminTemplateEditorPage({ params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const { programId } = await params;
  const result = await getTemplate(programId);

  if (!result.success) redirect('/admin/templates');

  const { name, slug, lessonPlanTemplate } = result.data;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/admin/templates"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách template
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Template: {name}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Slug: <span className="font-mono">{slug}</span>
          </p>
        </div>

        <TemplateEditorClient
          programId={programId}
          programSlug={slug}
          initialContent={lessonPlanTemplate}
        />
      </div>
    </div>
  );
}
