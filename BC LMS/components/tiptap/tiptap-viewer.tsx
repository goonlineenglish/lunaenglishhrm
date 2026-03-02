'use client';

// TiptapViewer — read-only renderer for Tiptap JSON content
// Used for template previews and manager view

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import type { JSONContent } from '@tiptap/react';

interface TiptapViewerProps {
  content: string | null | undefined; // JSON string
  className?: string;
}

function parseContent(content: string | null | undefined): JSONContent {
  if (!content) return { type: 'doc', content: [] };
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return { type: 'doc', content: [] };
  }
}

export function TiptapViewer({ content, className }: TiptapViewerProps) {
  const editor = useEditor({
    extensions: [StarterKit, Table, TableRow, TableHeader, TableCell],
    content: parseContent(content),
    editable: false,
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm max-w-none',
          '[&_table]:border-collapse [&_table]:w-full',
          '[&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-sm',
          '[&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-sm',
          className ?? '',
        ].join(' '),
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
