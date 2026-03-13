'use client'

/**
 * Weekly class-based attendance grid.
 * Rows = class x position (GV/TG), columns = T2-CN.
 * Tracks dirty cells in state, shows diff before batch save.
 * Keyboard: Arrow keys navigate, Ctrl+S triggers save.
 */

import { useState, useCallback, useRef } from 'react'
import { Save, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { AttendanceCell } from './attendance-cell'
import { AttendanceDiffDialog } from './attendance-diff-dialog'
import { buildDiffs, buildSaveItems, buildUnpersistedItems } from './attendance-grid-helpers'
import { saveAttendanceBatch, lockWeek, unlockWeek, overrideAutoLock, removeOverride } from '@/lib/actions/attendance-actions'
import type { AttendanceGridRow, AttendanceCell as CellType } from '@/lib/services/attendance-grid-service'
import type { AttendanceStatus } from '@/lib/types/database'
import { getDayName, getWeekDates, toISODate } from '@/lib/utils/date-helpers'
import { useAttendanceKeyboard } from '@/lib/hooks/use-attendance-keyboard'

const DAYS = [1, 2, 3, 4, 5, 6, 7]
const DAY_COL_OFFSET = 5

interface Props {
  initialRows: AttendanceGridRow[]
  branchId: string
  weekStart: Date
  isLocked: boolean
  /** 'auto' = auto-locked by time, 'manual' = BM/admin locked, null = not locked */
  lockType?: 'auto' | 'manual' | null
  /** true = override row exists (auto-lock bypassed) */
  hasOverride?: boolean
  /** 'admin' | 'branch_manager' | other */
  userRole?: string
  onSaved: () => void
}

type DirtyMap = Map<string, { status: AttendanceStatus; originalStatus: AttendanceStatus | null }>

export function AttendanceGrid({ initialRows, branchId, weekStart, isLocked, lockType, hasOverride, userRole, onSaved }: Props) {
  const [rows, setRows] = useState<AttendanceGridRow[]>(initialRows)
  const [dirty, setDirty] = useState<DirtyMap>(new Map())
  const [diffOpen, setDiffOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const weekDates = getWeekDates(weekStart)

  const handleCellChange = useCallback((rowIdx: number, day: number, newStatus: AttendanceStatus) => {
    setRows((prev) => {
      const updated = [...prev]
      const row = { ...updated[rowIdx] }
      const cell = { ...row.cells[day] }
      const originalStatus = initialRows[rowIdx]?.cells[day]?.status ?? null

      cell.status = newStatus
      row.cells = { ...row.cells, [day]: cell }
      updated[rowIdx] = row

      const key = `${row.scheduleId}:${row.employeeId}:${day}`
      setDirty((prev) => {
        const next = new Map(prev)
        if (newStatus === originalStatus) next.delete(key)
        else next.set(key, { status: newStatus, originalStatus })
        return next
      })

      return updated
    })
  }, [initialRows])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const items = buildSaveItems(dirty, weekDates)
    const result = await saveAttendanceBatch(branchId, toISODate(weekStart), items)
    setSaving(false)
    setDiffOpen(false)

    if (!result.success) { setError(result.error ?? 'Lỗi lưu chấm công.'); return }
    setDirty(new Map())
    onSaved()
  }

  async function handleLock() {
    if (!confirm('Khoá tuần này? Sau khi khoá sẽ không chỉnh sửa được.')) return
    setSaving(true)
    setError(null)
    const weekStartStr = toISODate(weekStart)

    const unpersisted = buildUnpersistedItems(rows, weekDates)
    if (unpersisted.length > 0) {
      const saveRes = await saveAttendanceBatch(branchId, weekStartStr, unpersisted)
      if (!saveRes.success) { setSaving(false); setError(saveRes.error ?? 'Lỗi khi lưu trước khi khoá.'); return }
    }

    const result = await lockWeek(branchId, weekStartStr)
    setSaving(false)
    if (!result.success) setError(result.error ?? 'Lỗi khoá tuần.')
    else onSaved()
  }

  function triggerSave() {
    if (dirty.size > 0) setDiffOpen(true)
  }

  const { handleKeyDown } = useAttendanceKeyboard({
    rowCount: rows.length, colCount: DAYS.length, colOffset: DAY_COL_OFFSET,
    containerRef: gridRef, onSave: triggerSave, isLocked,
  })

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Chưa có lịch lớp nào cho chi nhánh này.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

      <div ref={gridRef} className="overflow-auto rounded-md border" onKeyDown={handleKeyDown}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-2 py-2 text-left border">Lớp</th>
              <th className="px-2 py-2 text-left border">Ca</th>
              <th className="px-1 py-2 text-center border w-10">VT</th>
              <th className="px-2 py-2 text-left border">Mã</th>
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
              <tr key={`${row.scheduleId}-${row.role}`} className="hover:bg-muted/30">
                <td className="px-2 py-1 border text-xs font-medium">{row.classCode}</td>
                <td className="px-2 py-1 border text-xs">{row.shiftTime}</td>
                <td className="px-1 py-1 text-center border text-xs font-medium">
                  <span className={row.role === 'GV' ? 'text-primary' : 'text-orange-600'}>{row.role}</span>
                </td>
                <td className="px-2 py-1 border text-xs">{row.employeeCode}</td>
                <td className="px-2 py-1 border text-xs max-w-[120px] truncate">{row.employeeName}</td>
                {DAYS.map((d) => {
                  const cell = row.cells[d] as CellType
                  return (
                    <AttendanceCell
                      key={d} status={cell.status} isScheduled={cell.isScheduled}
                      disabled={isLocked} onChange={(s) => handleCellChange(rowIdx, d, s)}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLocked && (
        <div className="flex gap-2 items-center">
          <Button onClick={() => setDiffOpen(true)} disabled={dirty.size === 0} size="sm">
            <Save className="h-4 w-4 mr-1" />Lưu tuần ({dirty.size} thay đổi)
          </Button>
          <Button variant="outline" onClick={handleLock} size="sm" disabled={lockLoading}>
            <Lock className="h-4 w-4 mr-1" />Khoá tuần
          </Button>
          <span className="text-xs text-muted-foreground ml-1">Ctrl+S để lưu nhanh</span>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-destructive flex items-center gap-1">
            <Lock className="h-4 w-4" />
            {lockType === 'auto' ? 'Tuần này đã khoá tự động.' : 'Tuần này đã khoá.'}
          </p>
          {/* Unlock manual lock (admin + BM) */}
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
          {/* Override auto-lock (admin + BM) */}
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
          {/* Remove override (re-lock) */}
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

      <AttendanceDiffDialog
        open={diffOpen} onOpenChange={setDiffOpen}
        diffs={buildDiffs(dirty, rows)} saving={saving} onConfirm={handleSave}
      />
    </div>
  )
}
