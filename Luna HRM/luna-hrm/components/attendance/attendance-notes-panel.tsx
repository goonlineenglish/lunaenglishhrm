'use client'

import { Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddNoteForm } from './attendance-add-note-form'
import { deleteWeeklyNote, markNoteProcessed, type NoteWithEmployee } from '@/lib/actions/weekly-notes-actions'
import { NOTE_TYPE_LABELS, NOTE_TYPE_COLORS } from './attendance-notes-constants'

interface Props {
  notes: NoteWithEmployee[]
  branchId: string
  weekStart: string
  isAccountant: boolean
  onRefresh: () => void
}

export function AttendanceNotesPanel({ notes, branchId, weekStart, isAccountant, onRefresh }: Props) {
  async function handleDelete(id: string) {
    if (!confirm('Xoá ghi chú này?')) return
    const result = await deleteWeeklyNote(id)
    if (!result.success) alert(result.error ?? 'Lỗi xoá.')
    else onRefresh()
  }

  async function handleProcess(id: string) {
    const result = await markNoteProcessed(id)
    if (!result.success) alert(result.error ?? 'Lỗi duyệt.')
    else onRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Ghi chú tuần</h3>
        {!isAccountant && (
          <AddNoteForm branchId={branchId} weekStart={weekStart} onCreated={onRefresh} />
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có ghi chú.</p>
      ) : (
        <div className="space-y-1">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start justify-between px-2 py-1.5 rounded border text-xs">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${NOTE_TYPE_COLORS[n.note_type]}`}>
                    {NOTE_TYPE_LABELS[n.note_type]}
                  </Badge>
                  <span className="font-medium">{n.employee_code}</span>
                  <span className="text-muted-foreground">{n.employee_name}</span>
                  {n.is_processed && <CheckCircle className="h-3 w-3 text-green-600" />}
                </div>
                <p className="mt-0.5">{n.description}</p>
                {n.amount && (
                  <span className="text-muted-foreground">
                    {n.amount} {n.amount_unit === 'vnd' ? 'VNĐ' : 'buổi'}
                  </span>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                {isAccountant && !n.is_processed && (
                  <Button size="icon" variant="ghost" onClick={() => handleProcess(n.id)} title="Duyệt">
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
                {!isAccountant && (
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(n.id)} title="Xoá">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
