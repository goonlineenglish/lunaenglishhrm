/**
 * Attendance grid generation service.
 * Converts class_schedules + existing attendance records into a grid model
 * that the UI renders as rows x columns (T2-CN).
 */

import { toISODate } from '@/lib/utils/date-helpers'
import type { ScheduleRow, AttendanceRow, AttendanceGridRow, AttendanceCell } from './attendance-grid-helpers'

// Re-export all types and utilities from helpers for backward compatibility
export type {
  AttendanceCell,
  AttendanceGridRow,
  ScheduleConflict,
  WeekSummary,
  ScheduleRow,
  AttendanceRow,
} from './attendance-grid-helpers'

export { detectConflicts, calculateWeekSummary } from './attendance-grid-helpers'

// ─── Grid generation ────────────────────────────────────────────────────────

/** Build the attendance grid from schedules + existing records */
export function buildAttendanceGrid(
  schedules: ScheduleRow[],
  existingRecords: AttendanceRow[],
  weekDates: Date[]
): AttendanceGridRow[] {
  const recordMap = new Map<string, AttendanceRow>()
  for (const rec of existingRecords) {
    const key = `${rec.schedule_id}:${rec.employee_id}:${rec.date}`
    recordMap.set(key, rec)
  }

  const rows: AttendanceGridRow[] = []

  for (const sched of schedules) {
    if (sched.teacher_id) {
      rows.push(buildRow(sched, 'GV', sched.teacher_id,
        sched.teacher?.employee_code ?? '?',
        sched.teacher?.full_name ?? '—',
        weekDates, recordMap))
    }
    if (sched.assistant_id) {
      rows.push(buildRow(sched, 'TG', sched.assistant_id,
        sched.assistant?.employee_code ?? '?',
        sched.assistant?.full_name ?? '—',
        weekDates, recordMap))
    }
  }

  return rows
}

function buildRow(
  sched: ScheduleRow,
  role: 'GV' | 'TG',
  employeeId: string,
  employeeCode: string,
  employeeName: string,
  weekDates: Date[],
  recordMap: Map<string, AttendanceRow>
): AttendanceGridRow {
  const cells: Record<number, AttendanceCell> = {}

  for (let i = 0; i < 7; i++) {
    const isoDay = i + 1
    const isScheduled = sched.days_of_week.includes(isoDay)
    const dateStr = toISODate(weekDates[i])
    const key = `${sched.id}:${employeeId}:${dateStr}`
    const existing = recordMap.get(key)

    cells[isoDay] = {
      status: existing ? existing.status : (isScheduled ? '1' : null),
      isScheduled,
      existingId: existing?.id ?? null,
    }
  }

  return {
    scheduleId: sched.id,
    classCode: sched.class_code,
    className: sched.class_name,
    shiftTime: sched.shift_time,
    role,
    employeeId,
    employeeCode,
    employeeName,
    cells,
  }
}
