'use client'

/**
 * Office attendance grid — VP staff daily grid.
 * Simpler than class-based: employee × day (Mon-Sat work, Sun off).
 */

import { useState, useCallback } from 'react'
import { Save, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { AttendanceCell } from '@/components/attendance/attendance-cell'
import { saveOfficeAttendanceBatch, type OfficeSaveItem, type OfficeGridRow, type OfficeGridCell } from '@/lib/actions/office-attendance-actions'
import { unlockWeek, overrideAutoLock, removeOverride } from '@/lib/actions/attendance-actions'
import type { AttendanceStatus } from '@/lib/types/database'
import { getDayName, getWeekDates, toISODate } from '@/lib/utils/date-helpers'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

interface Props {
  initialRows: OfficeGridRow[]
  branchId: string
  weekStart: Date
  isLocked: boolean
  lockType?: 'auto' | 'manual' | null
  hasOverride?: boolean
  userRole?: string
  onSaved: () => void
}

type DirtyMap = Map<string, { status: AttendanceStatus; original: AttendanceStatus | null }>

export function OfficeAttendanceGrid({ initialRows, branchId, weekStart, isLocked, lockType, hasOverride, userRole, onSaved }: Props) {
  const [rows, setRows] = useState<OfficeGridRow[]>(initialRows)
  const [dirty, setDirty] = useState<DirtyMap>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockLoading, setLockLoading] = useState(false)

  const weekDates = getWeekDates(weekStart)

  const handleChange = useCallback((rowIdx: number, day: number, newStatus: AttendanceStatus) => {
    setRows((prev) => {
      const updated = [...prev]
      const row = { ...updated[rowIdx] }
      row.cells = { ...row.cells, [day]: { ...row.cells[day], status: newStatus } }
      updated[rowIdx] = row

      const key = `${row.employeeId}:${day}`
      const original = initialRows[rowIdx]?.cells[day]?.status ?? null
      setDirty((prev) => {
        const next = new Map(prev)
        if (newStatus === original) next.delete(key)
        else next.set(key, { status: newStatus, original })
        return next
      })

      return updated
    })
  }, [initialRows])

  async function handleSave() {
    setSaving(true)
    setError(null)

    const items: OfficeSaveItem[] = []
    for (const [key, val] of dirty) {
      const [employeeId, dayStr] = key.split(':')
      const day = parseInt(dayStr)
      const dateStr = toISODate(weekDates[day - 1])
      items.push({ employeeId, date: dateStr, status: val.status })
    }

    const weekStartStr = toISODate(weekStart)
    const result = await saveOfficeAttendanceBatch(branchId, weekStartStr, items)
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? 'Lỗi lưu.')
      return
    }
    setDirty(new Map())
    onSaved()
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Chưa có nhân viên VP nào cho chi nhánh này.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-2 py-2 text-left border">Mã NV</th>
              <th className="px-2 py-2 text-left border">Tên</th>
              {DAYS.map((d) => {
                const date = weekDates[d - 1]
                const dd = String(date.getDate()).padStart(2, '0')
                const mm = String(date.getMonth() + 1).padStart(2, '0')
                return (
                  <th key={d} className="px-1 py-2 text-center border w-10">
                    <div className="leading-tight">
                      <div>{getDayName(d)}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{dd}/{mm}</div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.employeeId} className="hover:bg-muted/30">
                <td className="px-2 py-1 border text-xs font-medium">{row.employeeCode}</td>
                <td className="px-2 py-1 border text-xs max-w-[150px] truncate">{row.employeeName}</td>
                {DAYS.map((d) => {
                  const cell = row.cells[d] as OfficeGridCell
                  return (
                    <AttendanceCell
                      key={d}
                      status={cell.status}
                      isScheduled={cell.isWorkDay}
                      disabled={isLocked}
                      onChange={(s) => handleChange(rowIdx, d, s)}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLocked && (
        <Button onClick={handleSave} disabled={dirty.size === 0 || saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Đang lưu...' : `Lưu (${dirty.size} thay đổi)`}
        </Button>
      )}

      {isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-destructive flex items-center gap-1">
            <Lock className="h-4 w-4" />
            {lockType === 'auto' ? 'Tuần này đã khoá tự động.' : 'Tuần này đã khoá.'}
          </p>
          {lockType === 'manual' && (userRole === 'admin' || userRole === 'branch_manager') && (
            <Button
              variant="outline" size="sm" disabled={lockLoading}
              onClick={async () => {
                if (!confirm('Mở khoá tuần này?')) return
                setLockLoading(true)
                const r = await unlockWeek(branchId, toISODate(weekStart))
                setLockLoading(false)
                if (!r.success) { setError(r.error ?? 'Lỗi mở khoá.'); return }
                onSaved()
              }}
            >
              <Unlock className="h-4 w-4 mr-1" />Mở khoá
            </Button>
          )}
          {lockType === 'auto' && !hasOverride && (userRole === 'admin' || userRole === 'branch_manager') && (
            <Button
              variant="outline" size="sm" disabled={lockLoading}
              onClick={async () => {
                if (!confirm('Mở khoá tuần tự động để chỉnh sửa?')) return
                setLockLoading(true)
                const r = await overrideAutoLock(branchId, toISODate(weekStart))
                setLockLoading(false)
                if (!r.success) { setError(r.error ?? 'Lỗi mở khoá.'); return }
                onSaved()
              }}
            >
              <Unlock className="h-4 w-4 mr-1" />Mở khoá tự động
            </Button>
          )}
          {hasOverride && (userRole === 'admin' || userRole === 'branch_manager') && (
            <Button
              variant="outline" size="sm" disabled={lockLoading}
              onClick={async () => {
                if (!confirm('Khoá lại tuần này?')) return
                setLockLoading(true)
                const r = await removeOverride(branchId, toISODate(weekStart))
                setLockLoading(false)
                if (!r.success) { setError(r.error ?? 'Lỗi khoá lại.'); return }
                onSaved()
              }}
            >
              <Lock className="h-4 w-4 mr-1" />Khoá lại
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
