'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { EmployeeCombobox } from '@/components/class-schedules/employee-combobox'
import { createWeeklyNote } from '@/lib/actions/weekly-notes-actions'
import { getEmployeesForSelection } from '@/lib/actions/class-schedule-actions'
import type { NoteType } from '@/lib/types/database'
import type { EmployeeLookup } from '@/lib/actions/class-schedule-actions'
import { NOTE_TYPE_LABELS } from './attendance-notes-constants'

interface Props {
  branchId: string
  weekStart: string
  onCreated: () => void
}

export function AddNoteForm({ branchId, weekStart, onCreated }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [noteType, setNoteType] = useState<NoteType>('general')
  const [employeeId, setEmployeeId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [amountUnit, setAmountUnit] = useState<'sessions' | 'vnd'>('sessions')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeLookup[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Prefetch employee list when form opens
  useEffect(() => {
    if (!showForm) return
    setLoadingEmployees(true)
    getEmployeesForSelection(branchId).then((res) => {
      if (res.success && res.data) setEmployees(res.data)
      setLoadingEmployees(false)
    })
  }, [showForm, branchId])

  async function handleAdd() {
    if (!employeeId || !description.trim()) {
      setError('Chọn NV và nhập mô tả.')
      return
    }

    setSaving(true)
    setError(null)

    const result = await createWeeklyNote({
      branch_id: branchId,
      week_start: weekStart,
      employee_id: employeeId,
      note_type: noteType,
      description: description.trim(),
      amount: amount ? parseFloat(amount) : null,
      amount_unit: amount ? amountUnit : null,
    })

    setSaving(false)
    if (!result.success) { setError(result.error ?? 'Lỗi tạo ghi chú.'); return }

    setDescription('')
    setAmount('')
    setEmployeeId('')
    setShowForm(false)
    onCreated()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
        <Plus className="h-3 w-3 mr-1" />Thêm ghi chú
      </Button>

      {error && <Alert variant="destructive"><p className="text-xs">{error}</p></Alert>}

      {showForm && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nhân viên</Label>
              <EmployeeCombobox
                employees={employees}
                value={employeeId}
                onSelect={(emp) => setEmployeeId(emp.id)}
                placeholder="Chọn nhân viên"
                loading={loadingEmployees}
              />
            </div>
            <div>
              <Label className="text-xs">Loại</Label>
              <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(NOTE_TYPE_LABELS) as [NoteType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Mô tả</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nội dung ghi chú" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Số lượng (tuỳ chọn)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Đơn vị</Label>
              <Select value={amountUnit} onValueChange={(v) => setAmountUnit(v as 'sessions' | 'vnd')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessions">Buổi</SelectItem>
                  <SelectItem value="vnd">VNĐ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Thêm'}
          </Button>
        </div>
      )}
    </>
  )
}
