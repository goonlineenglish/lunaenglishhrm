import type { AttendanceStatus } from '@/lib/types/database'
import type { AttendanceGridRow, AttendanceCell as CellType } from '@/lib/services/attendance-grid-service'
import type { AttendanceSaveItem } from '@/lib/actions/attendance-actions'
import type { DiffItem } from './attendance-diff-dialog'
import { toISODate } from '@/lib/utils/date-helpers'

type DirtyMap = Map<string, { status: AttendanceStatus; originalStatus: AttendanceStatus | null }>

/** Build diff items for the confirmation dialog */
export function buildDiffs(
  dirty: DirtyMap,
  rows: AttendanceGridRow[]
): DiffItem[] {
  const diffs: DiffItem[] = []
  for (const [key, val] of dirty) {
    const [, , dayStr] = key.split(':')
    const row = rows.find((r) => key.startsWith(`${r.scheduleId}:${r.employeeId}:`))
    if (row) {
      diffs.push({
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        day: parseInt(dayStr),
        oldStatus: val.originalStatus,
        newStatus: val.status,
      })
    }
  }
  return diffs
}

/** Build save items from dirty cells */
export function buildSaveItems(
  dirty: DirtyMap,
  weekDates: Date[]
): AttendanceSaveItem[] {
  const items: AttendanceSaveItem[] = []
  for (const [key, val] of dirty) {
    const [scheduleId, employeeId, dayStr] = key.split(':')
    const day = parseInt(dayStr)
    const dateStr = toISODate(weekDates[day - 1])
    items.push({ scheduleId, employeeId, date: dateStr, status: val.status })
  }
  return items
}

/** Collect all scheduled cells without existingId (auto-fill defaults) for pre-lock save */
export function buildUnpersistedItems(
  rows: AttendanceGridRow[],
  weekDates: Date[]
): AttendanceSaveItem[] {
  const items: AttendanceSaveItem[] = []
  for (const row of rows) {
    for (const [dayStr, cell] of Object.entries(row.cells)) {
      const typedCell = cell as CellType
      if (typedCell.isScheduled && typedCell.status && !typedCell.existingId) {
        const day = parseInt(dayStr)
        const dateStr = toISODate(weekDates[day - 1])
        items.push({ scheduleId: row.scheduleId, employeeId: row.employeeId, date: dateStr, status: typedCell.status })
      }
    }
  }
  return items
}
