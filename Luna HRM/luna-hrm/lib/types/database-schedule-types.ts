/**
 * Database entity types: Class Schedules, Attendance, Attendance Locks, Weekly Notes
 * Extends database-core-types.ts — these tables reference employees + branches
 * MUST match supabase/migrations/001_create_all_tables.sql exactly
 */

import type { AttendanceStatus, ClassStatus, NoteType } from './database-core-types'

// ─── 3. class_schedules ──────────────────────────────────────────────────────

export interface ClassSchedule {
  id: string
  branch_id: string
  class_code: string
  class_name: string
  shift_time: string         // "19:00-20:30"
  days_of_week: number[]     // [2,4,6] = Mon,Wed,Fri (ISO: 1=Mon..7=Sun)
  teacher_id: string
  assistant_id: string
  teacher_rate: number | null   // override rate for teacher (NULL = use employee default)
  assistant_rate: number | null // override rate for assistant (NULL = use employee default)
  status: ClassStatus
  created_at: string
  updated_at: string
}

export type ClassScheduleInsert = Omit<ClassSchedule, 'id' | 'created_at' | 'updated_at' | 'teacher_rate' | 'assistant_rate'> & {
  teacher_rate?: number | null
  assistant_rate?: number | null
}
export type ClassScheduleUpdate = Partial<ClassScheduleInsert>

// ─── 4. attendance ───────────────────────────────────────────────────────────

export interface Attendance {
  id: string
  schedule_id: string
  employee_id: string
  date: string
  status: AttendanceStatus
  marked_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at'>
export type AttendanceUpdate = Partial<AttendanceInsert>

// ─── 5. office_attendance ────────────────────────────────────────────────────

export interface OfficeAttendance {
  id: string
  branch_id: string
  employee_id: string
  date: string
  status: AttendanceStatus
  marked_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OfficeAttendanceInsert = Omit<OfficeAttendance, 'id' | 'created_at' | 'updated_at'>
export type OfficeAttendanceUpdate = Partial<OfficeAttendanceInsert>

// ─── 6. attendance_locks ─────────────────────────────────────────────────────

export interface AttendanceLock {
  id: string
  branch_id: string
  week_start: string       // DATE — Monday of the locked week
  locked_by: string        // FK → employees.id
  locked_at: string
  /** true = override row (cancels auto-lock). false = manual lock. */
  is_override: boolean
}

export type AttendanceLockInsert = Omit<AttendanceLock, 'id'>

// ─── 7. employee_weekly_notes ────────────────────────────────────────────────

export interface EmployeeWeeklyNote {
  id: string
  branch_id: string
  week_start: string
  employee_id: string
  note_type: NoteType
  description: string
  amount: number | null      // sessions count or VND amount
  amount_unit: 'sessions' | 'vnd' | null
  is_processed: boolean
  processed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type EmployeeWeeklyNoteInsert = Omit<EmployeeWeeklyNote, 'id' | 'created_at' | 'updated_at'>
export type EmployeeWeeklyNoteUpdate = Partial<EmployeeWeeklyNoteInsert>
