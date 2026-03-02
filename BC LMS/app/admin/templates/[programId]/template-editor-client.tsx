'use client';

// Template editor client component — TiptapEditor + save/init default buttons
// Admin-only; handles save and initialize with default template

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { TiptapEditor } from '@/components/tiptap/tiptap-editor';
import { Button } from '@/components/ui/button';
import { updateTemplate } from '@/lib/actions/template-actions';
import { getDefaultTemplate } from '@/lib/constants/lesson-plan-templates';
import { Save, RotateCcw } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';

interface TemplateEditorClientProps {
  programId: string;
  programSlug: string;
  initialContent: string | null;
}

export function TemplateEditorClient({
  programId,
  programSlug,
  initialContent,
}: TemplateEditorClientProps) {
  const [content, setContent] = useState<string | null>(initialContent);
  const [isPending, startTransition] = useTransition();

  function handleChange(json: JSONContent) {
    setContent(JSON.stringify(json));
  }

  function handleInitDefault() {
    const defaultContent = getDefaultTemplate(programSlug);
    setContent(defaultContent);
    // Force re-mount editor with new content
    toast.info('Đã tải template mặc định. Nhấn Lưu để áp dụng.');
  }

  function handleSave() {
    if (!content) {
      toast.error('Nội dung template trống');
      return;
    }
    startTransition(async () => {
      const result = await updateTemplate(programId, content);
      if (result.success) {
        toast.success('Đã lưu template');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        {!initialContent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitDefault}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khởi tạo template mặc định
          </Button>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={isPending} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isPending ? 'Đang lưu...' : 'Lưu template'}
          </Button>
        </div>
      </div>

      {/* Editor — key forces remount when content is initialized */}
      <TiptapEditor
        key={content === initialContent ? 'initial' : 'updated'}
        initialContent={content}
        onChange={handleChange}
        placeholder="Nhập nội dung template kế hoạch dạy học..."
      />
    </div>
  );
}
