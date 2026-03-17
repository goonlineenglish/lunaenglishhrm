'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekDates, getWeekStart, parseIsoDateLocal, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
import { hasAnyRole } from '@/lib/types/user'
import {
  buildAttendanceGrid,
  detectConflicts,
  calculateWeekSummary,
  type AttendanceGridRow,
  type ScheduleConflict,
  type WeekSummary,
} from '@/lib/services/attendance-grid-service'
import type { AttendanceStatus } from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface AttendanceGridData {
  rows: AttendanceGridRow[]
  conflicts: ScheduleConflict[]
  summary: WeekSummary[]
  isLocked: boolean
  /** 'auto' = auto-locked by time, 'manual' = BM/admin locked, null = not locked */
  lockType: 'auto' | 'manual' | null
  /** true = admin/BM has overridden the auto-lock for this week */
  hasOverride: boolean
}

export async function getAttendanceGrid(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult<AttendanceGridData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canView) return { success: false, error: 'Bạn không có quyền xem chấm công.' }

    const isBM = user.roles.includes('branch_manager')
    const effectiveBranch = isBM ? user.branch_id! : branchId

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const weekStart = getWeekStart(parseIsoDateLocal(weekStartStr))
    const weekDates = getWeekDates(weekStart)
    const dateFrom = toISODate(weekDates[0])
    const dateTo = toISODate(weekDates[6])

    const { data: schedules, error: schErr } = await sb
      .from('class_schedules')
      .select('id, class_code, class_name, shift_time, days_of_week, teacher_id, assistant_id, teacher:employees!class_schedules_teacher_id_fkey(employee_code, full_name), assistant:employees!class_schedules_assistant_id_fkey(employee_code, full_name)')
      .eq('branch_id', effectiveBranch)
      .eq('status', 'active')
      .order('class_code')
    if (schErr) throw schErr

    const scheduleIds = (schedules ?? []).map((s: { id: string }) => s.id)
    let existingRecords: { id: string; schedule_id: string; employee_id: string; date: string; status: AttendanceStatus }[] = []

    if (scheduleIds.length > 0) {
      const { data: att, error: attErr } = await sb
        .from('attendance')
        .select('id, schedule_id, employee_id, date, status')
        .in('schedule_id', scheduleIds)
        .gte('date', dateFrom)
        .lte('date', dateTo)
      if (attErr) throw attErr
      existingRecords = att ?? []
    }

    // Multi-row lock query: get all lock rows for this (branch, week)
    // UNIQUE(branch_id, week_start, is_override) → max 2 rows
    const { data: lockRows } = await sb
      .from('attendance_locks')
      .select('id, is_override')
      .eq('branch_id', effectiveBranch)
      .eq('week_start', dateFrom)

    const hasManualLock = (lockRows ?? []).some((r: { is_override: boolean }) => !r.is_override)
    const hasOverride = (lockRows ?? []).some((r: { is_override: boolean }) => r.is_override)
    const autoLocked = isWeekLocked(weekStart)
    const isLocked = (autoLocked && !hasOverride) || hasManualLock
    const lockType: 'auto' | 'manual' | null = hasManualLock ? 'manual' : (autoLocked ? 'auto' : null)

    const rows = buildAttendanceGrid(schedules ?? [], existingRecords, weekDates)
    const conflicts = detectConflicts(schedules ?? [])
    const summary = calculateWeekSummary(rows)

    return {
      success: true,
      data: { rows, conflicts, summary, isLocked, lockType, hasOverride },
    }
  } catch (err) {
    console.error('[getAttendanceGrid]', err)
    return { success: false, error: 'Không thể tải bảng chấm công.' }
  }
}
