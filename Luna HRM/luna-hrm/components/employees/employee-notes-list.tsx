'use client'

/**
 * Employee notes list — cards with type badge, content, author, date.
 */

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { EmployeeNote, EmployeeNoteType } from '@/lib/types/evaluation'

type NoteWithAuthor = EmployeeNote & { author_name?: string }

interface Props {
  notes: NoteWithAuthor[]
  loading?: boolean
}

const NOTE_TYPE_CONFIG: Record<EmployeeNoteType, { label: string; className: string }> = {
  praise: { label: 'Khen ngợi', className: 'text-green-700 border-green-400' },
  warning: { label: 'Cảnh báo', className: 'text-red-700 border-red-400' },
  observation: { label: 'Nhận xét', className: 'text-blue-700 border-blue-400' },
  general: { label: 'Chung', className: 'text-muted-foreground' },
}

export function EmployeeNotesList({ notes, loading }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md text-sm">
        Chưa có ghi chú nào.
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const cfg = NOTE_TYPE_CONFIG[note.note_type] ?? NOTE_TYPE_CONFIG.general
        return (
          <Card key={note.id}>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                  {cfg.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {note.author_name ?? '—'} · {formatDate(note.created_at)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{note.content}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
