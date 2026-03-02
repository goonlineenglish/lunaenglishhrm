'use client';

// TiptapEditor — rich text editor with table support
// Stores content as Tiptap JSON (call onChange with JSON object, parent stringifies)

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TiptapMenuBar } from '@/components/tiptap/tiptap-menu-bar';
import type { JSONContent } from '@tiptap/react';

interface TiptapEditorProps {
  initialContent?: string | null; // JSON string or null
  onChange?: (json: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
}

// Parse initialContent safely — returns JSONContent or empty doc
function parseContent(content: string | null | undefined): JSONContent {
  if (!content) return { type: 'doc', content: [] };
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return { type: 'doc', content: [] };
  }
}

export function TiptapEditor({
  initialContent,
  onChange,
  editable = true,
  placeholder,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: parseContent(initialContent),
    editable,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON());
    },
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[200px] px-4 py-3',
          '[&_table]:border-collapse [&_table]:w-full',
          '[&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-sm',
          '[&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-sm',
        ].join(' '),
        ...(placeholder && !initialContent
          ? { 'data-placeholder': placeholder }
          : {}),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
      {editable && <TiptapMenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
