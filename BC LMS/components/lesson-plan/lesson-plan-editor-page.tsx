'use client';

// LessonPlanEditorPage — full editor layout with auto-save every 30s
// Auto-save uses setInterval; manual save button also available
// ExportButton shown only for TEACHER role

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { TiptapEditor } from '@/components/tiptap/tiptap-editor';
import { ExportButton } from '@/components/lesson-plan/export-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateLessonPlan } from '@/lib/actions/lesson-plan-actions';
import { Save, Clock } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';
import type { Role } from '@/lib/types/auth';

interface LessonPlanEditorPageProps {
  planId: string;
  initialTitle: string;
  initialContent: string;
  programName: string;
  programTemplate: string | null;
  userRole: Role;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function LessonPlanEditorPage({
  planId,
  initialTitle,
  initialContent,
  programName,
  userRole,
}: LessonPlanEditorPageProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef(content);
  const titleRef = useRef(title);

  // Keep refs in sync for auto-save closure
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { titleRef.current = title; }, [title]);

  const saveNow = useCallback(async (silent = false) => {
    setIsSaving(true);
    try {
      const result = await updateLessonPlan(planId, {
        title: titleRef.current,
        content: contentRef.current,
      });
      if (result.success) {
        setLastSaved(new Date());
        if (!silent) toast.success('Đã lưu kế hoạch');
      } else {
        if (!silent) toast.error(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [planId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => saveNow(true), 30_000);
    return () => clearInterval(interval);
  }, [saveNow]);

  function handleEditorChange(json: JSONContent) {
    setContent(JSON.stringify(json));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-neutral-400"
            placeholder="Tiêu đề kế hoạch..."
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Last saved status */}
          {lastSaved && (
            <span className="text-xs text-neutral-400 flex items-center gap-1 no-print">
              <Clock className="h-3.5 w-3.5" />
              Lưu lần cuối: {formatTime(lastSaved)}
            </span>
          )}

          {/* Export — TEACHER only */}
          {userRole === 'TEACHER' && <ExportButton planTitle={title} />}

          {/* Manual save */}
          <Button
            size="sm"
            onClick={() => saveNow(false)}
            disabled={isSaving}
            className="gap-1.5 no-print"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>

      {/* Program label */}
      <p className="text-xs text-neutral-400 mb-3 no-print">
        Chương trình: <span className="font-medium text-neutral-600">{programName}</span>
      </p>

      {/* Editor */}
      <div className="flex-1">
        <TiptapEditor
          initialContent={initialContent}
          onChange={handleEditorChange}
          placeholder="Bắt đầu nhập kế hoạch dạy học..."
        />
      </div>
    </div>
  );
}
