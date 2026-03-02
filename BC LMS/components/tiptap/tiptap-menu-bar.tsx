'use client';

// Tiptap formatting toolbar — Bold, Italic, Headings, Lists, Table operations
// Used inside TiptapEditor component

import type { Editor } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Table, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TiptapMenuBarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded text-sm transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700 font-semibold'
          : 'text-neutral-600 hover:bg-neutral-100',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-neutral-200 mx-1 shrink-0" />;
}

export function TiptapMenuBar({ editor }: TiptapMenuBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50 rounded-t-md">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="In đậm (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="In nghiêng (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Tiêu đề 1"
      >
        <span className="text-xs font-bold">H1</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Tiêu đề 2"
      >
        <span className="text-xs font-bold">H2</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Tiêu đề 3"
      >
        <span className="text-xs font-bold">H3</span>
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Danh sách không thứ tự"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Danh sách có thứ tự"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Table operations */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Chèn bảng (3x3)"
      >
        <Table className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.isActive('table')}
        title="Thêm hàng bên dưới"
      >
        <div className="flex items-center gap-0.5">
          <Plus className="h-3 w-3" />
          <span className="text-xs">H</span>
        </div>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.isActive('table')}
        title="Xóa hàng"
      >
        <div className="flex items-center gap-0.5">
          <Minus className="h-3 w-3" />
          <span className="text-xs">H</span>
        </div>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.isActive('table')}
        title="Thêm cột bên phải"
      >
        <div className="flex items-center gap-0.5">
          <Plus className="h-3 w-3" />
          <span className="text-xs">C</span>
        </div>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.isActive('table')}
        title="Xóa cột"
      >
        <div className="flex items-center gap-0.5">
          <Minus className="h-3 w-3" />
          <span className="text-xs">C</span>
        </div>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!editor.isActive('table')}
        title="Xóa bảng"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </ToolbarButton>
    </div>
  );
}
