'use client'

/**
 * Employee note form — type selector + content textarea, submit creates note.
 * BM/admin only.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { createEmployeeNote } from '@/lib/actions/employee-notes-actions'
import type { EmployeeNoteType } from '@/lib/types/evaluation'

const NOTE_TYPE_OPTIONS: { value: EmployeeNoteType; label: string }[] = [
  { value: 'praise', label: 'Khen ngợi' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'observation', label: 'Nhận xét' },
  { value: 'general', label: 'Chung' },
]

interface Props {
  employeeId: string
  onSuccess: () => void
}

export function EmployeeNoteForm({ employeeId, onSuccess }: Props) {
  const [noteType, setNoteType] = useState<EmployeeNoteType>('general')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!content.trim()) return setError('Nội dung không được để trống.')

    setLoading(true)
    try {
      const result = await createEmployeeNote({
        employee_id: employeeId,
        note_type: noteType,
        content: content.trim(),
      })
      if (!result.success) return setError(result.error ?? 'Lỗi tạo ghi chú.')
      setContent('')
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Loại ghi chú</Label>
          <Select value={noteType} onValueChange={(v) => setNoteType(v as EmployeeNoteType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="note_content">Nội dung *</Label>
        <Textarea
          id="note_content"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập nội dung ghi chú..."
        />
      </div>

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? 'Đang lưu...' : 'Thêm ghi chú'}
      </Button>
    </form>
  )
}
