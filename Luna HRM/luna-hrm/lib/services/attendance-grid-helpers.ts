/**
 * Attendance grid helper types and conflict/summary utilities.
 * Extracted from attendance-grid-service.ts for modularization.
 */

import type { AttendanceStatus } from '@/lib/types/database'

// ─── Grid types ──────────────────────────────────────────────────────────────

export interface AttendanceCell {
  status: AttendanceStatus | null
  isScheduled: boolean
  existingId: string | null
}

export interface AttendanceGridRow {
  scheduleId: string
  classCode: string
  className: string
  shiftTime: string
  role: 'GV' | 'TG'
  employeeId: string
  employeeCode: string
  employeeName: string
  cells: Record<number, AttendanceCell>
}

export interface ScheduleConflict {
  employeeId: string
  employeeCode: string
  employeeName: string
  day: number
  shiftTime: string
  classes: string[]
}

export interface WeekSummary {
  employeeId: string
  employeeCode: string
  employeeName: string
  totalPresent: number
  totalAbsent: number
  totalKP: number
  totalHalf: number
  totalSessions: number
}

// ─── Raw DB row shapes ──────────────────────────────────────────────────────

export interface ScheduleRow {
  id: string
  class_code: string
  class_name: string
  shift_time: string
  days_of_week: number[]
  teacher_id: string
  assistant_id: string
  teacher: { employee_code: string; full_name: string } | null
  assistant: { employee_code: string; full_name: string } | null
}

export interface AttendanceRow {
  id: string
  schedule_id: string
  employee_id: string
  date: string
  status: AttendanceStatus
}

// ─── Conflict detection ─────────────────────────────────────────────────────

/** Find employees scheduled in 2+ classes at same shift_time on same day */
export function detectConflicts(schedules: ScheduleRow[]): ScheduleConflict[] {
  const map = new Map<string, { codes: string[]; empCode: string; empName: string }>()

  for (const sched of schedules) {
    const pairs = [
      { id: sched.teacher_id, code: sched.teacher?.employee_code ?? '?', name: sched.teacher?.full_name ?? '—' },
      { id: sched.assistant_id, code: sched.assistant?.employee_code ?? '?', name: sched.assistant?.full_name ?? '—' },
    ]

    for (const emp of pairs) {
      if (!emp.id) continue
      for (const day of sched.days_of_week) {
        const key = `${emp.id}:${sched.shift_time}:${day}`
        const entry = map.get(key) ?? { codes: [], empCode: emp.code, empName: emp.name }
        entry.codes.push(sched.class_code)
        map.set(key, entry)
      }
    }
  }

  const conflicts: ScheduleConflict[] = []
  for (const [key, val] of map) {
    if (val.codes.length > 1) {
      const [employeeId, shiftTime, dayStr] = key.split(':')
      conflicts.push({
        employeeId, employeeCode: val.empCode, employeeName: val.empName,
        day: parseInt(dayStr), shiftTime, classes: val.codes,
      })
    }
  }
  return conflicts
}

// ─── Week summary ───────────────────────────────────────────────────────────

/** Calculate per-employee totals from grid rows */
export function calculateWeekSummary(rows: AttendanceGridRow[]): WeekSummary[] {
  const map = new Map<string, WeekSummary>()

  for (const row of rows) {
    let summary = map.get(row.employeeId)
    if (!summary) {
      summary = {
        employeeId: row.employeeId, employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        totalPresent: 0, totalAbsent: 0, totalKP: 0, totalHalf: 0, totalSessions: 0,
      }
      map.set(row.employeeId, summary)
    }

    for (const cell of Object.values(row.cells)) {
      if (!cell.isScheduled || !cell.status) continue
      switch (cell.status) {
        case '1':    summary.totalPresent++; summary.totalSessions++; break
        case '0':    summary.totalAbsent++; break
        case 'KP':   summary.totalKP++; break
        case '0.5':  summary.totalHalf++; summary.totalSessions += 0.5; break
      }
    }
  }

  return Array.from(map.values())
}
