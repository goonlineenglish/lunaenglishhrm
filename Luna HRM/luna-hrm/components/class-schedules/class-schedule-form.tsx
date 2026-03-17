'use client'

/**
 * Class schedule create/edit form dialog.
 * Fields: class_code, class_name, shift_time, days_of_week[], teacher, assistant.
 * Uses EmployeeCombobox (prefetch) instead of EmployeeCodeLookup (per-keystroke search).
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { EmployeeCombobox } from './employee-combobox'
import { createClassSchedule, updateClassSchedule, getEmployeesForSelection } from '@/lib/actions/class-schedule-actions'
import type { ClassSchedule } from '@/lib/types/database'
import type { EmployeeLookup } from '@/lib/actions/class-schedule-actions'
import { getDayName } from '@/lib/utils/date-helpers'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editSchedule: (ClassSchedule & { teacher_name?: string; assistant_name?: string }) | null
  branchId: string
  onSaved: () => void
}

const DAYS = [1, 2, 3, 4, 5, 6, 7] // Mon..Sun

interface FormState {
  class_code: string
  class_name: string
  shift_time: string
  days_of_week: number[]
  teacher_id: string
  assistant_id: string
  teacher_rate: string
  assistant_rate: string
}

const EMPTY: FormState = {
  class_code: '', class_name: '', shift_time: '',
  days_of_week: [], teacher_id: '',
  assistant_id: '',
  teacher_rate: '', assistant_rate: '',
}

export function ClassScheduleForm({ open, onOpenChange, editSchedule, branchId, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeLookup[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // BUGFIX: useState(init) only runs once — sync form state every time dialog opens
  useEffect(() => {
    if (!open) return
    if (editSchedule) {
      setForm({
        class_code: editSchedule.class_code,
        class_name: editSchedule.class_name,
        shift_time: editSchedule.shift_time,
        days_of_week: editSchedule.days_of_week,
        teacher_id: editSchedule.teacher_id,
        assistant_id: editSchedule.assistant_id,
        teacher_rate: editSchedule.teacher_rate?.toString() ?? '',
        assistant_rate: editSchedule.assistant_rate?.toString() ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setError(null)
  }, [open, editSchedule])

  // Prefetch employees when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingEmployees(true)
    getEmployeesForSelection(branchId).then((res) => {
      if (res.success && res.data) setEmployees(res.data)
      setLoadingEmployees(false)
    })
  }, [open, branchId])

  // Filter by position (computed from prefetched list)
  const teachers = employees.filter((e) => e.position === 'teacher')
  const assistants = employees.filter((e) => e.position === 'assistant')

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day].sort(),
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.class_code.trim()) return setError('Mã lớp là bắt buộc.')
    if (!form.class_name.trim()) return setError('Tên lớp là bắt buộc.')
    if (!form.shift_time.trim()) return setError('Ca học là bắt buộc.')
    if (form.days_of_week.length === 0) return setError('Chọn ít nhất 1 ngày học.')
    if (!form.teacher_id) return setError('Chọn giáo viên.')
    if (!form.assistant_id) return setError('Chọn trợ giảng.')

    setSaving(true)
    const payload = {
      class_code: form.class_code.trim(),
      class_name: form.class_name.trim(),
      shift_time: form.shift_time.trim(),
      days_of_week: form.days_of_week,
      teacher_id: form.teacher_id,
      assistant_id: form.assistant_id,
      branch_id: branchId,
      status: 'active' as const,
      teacher_rate: form.teacher_rate.trim() !== '' ? parseFloat(form.teacher_rate) : null,
      assistant_rate: form.assistant_rate.trim() !== '' ? parseFloat(form.assistant_rate) : null,
    }

    const result = editSchedule
      ? await updateClassSchedule(editSchedule.id, payload)
      : await createClassSchedule(payload)

    setSaving(false)
    if (!result.success) return setError(result.error ?? 'Lỗi lưu lịch lớp.')

    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editSchedule ? 'Sửa lịch lớp' : 'Thêm lịch lớp'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-2">
          {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã lớp *</Label>
              <Input value={form.class_code} onChange={(e) => setForm((f) => ({ ...f, class_code: e.target.value }))} placeholder="IELTS-A1" />
            </div>
            <div className="space-y-1">
              <Label>Tên lớp *</Label>
              <Input value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))} placeholder="IELTS Band 5.0" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Ca học *</Label>
            <Input value={form.shift_time} onChange={(e) => setForm((f) => ({ ...f, shift_time: e.target.value }))} placeholder="19:00-20:30" />
          </div>

          <div className="space-y-1">
            <Label>Ngày học *</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                    form.days_of_week.includes(d)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  {getDayName(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Giáo viên (GV) *</Label>
              <EmployeeCombobox
                employees={teachers}
                value={form.teacher_id}
                onSelect={(emp) => setForm((f) => ({ ...f, teacher_id: emp.id }))}
                placeholder="Chọn giáo viên"
                loading={loadingEmployees}
                fallbackLabel={editSchedule?.teacher_name}
              />
            </div>
            <div className="space-y-1">
              <Label>Trợ giảng (TG) *</Label>
              <EmployeeCombobox
                employees={assistants}
                value={form.assistant_id}
                onSelect={(emp) => setForm((f) => ({ ...f, assistant_id: emp.id }))}
                placeholder="Chọn trợ giảng"
                loading={loadingEmployees}
                fallbackLabel={editSchedule?.assistant_name}
              />
            </div>
          </div>

          {/* Đơn giá theo lớp — ghi đè đơn giá mặc định từ hồ sơ nhân viên */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Đơn giá GV (tùy chọn)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Mặc định từ hồ sơ NV"
                value={form.teacher_rate}
                onChange={(e) => setForm((prev) => ({ ...prev, teacher_rate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Đơn giá TG (tùy chọn)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Mặc định từ hồ sơ NV"
                value={form.assistant_rate}
                onChange={(e) => setForm((prev) => ({ ...prev, assistant_rate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Hủy</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
