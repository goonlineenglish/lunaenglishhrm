'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekDates, getWeekStart, parseIsoDateLocal, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
import type { AttendanceStatus } from '@/lib/types/database'
import type { ActionResult } from './attendance-query-actions'

export interface AttendanceSaveItem {
  scheduleId: string
  employeeId: string
  date: string
  status: AttendanceStatus
}

export async function saveAttendanceBatch(
  branchId: string,
  weekStartStr: string,
  records: AttendanceSaveItem[]
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = user.role === 'admin' || user.role === 'branch_manager'
    if (!canEdit) return { success: false, error: 'Bạn không có quyền lưu chấm công.' }

    if (records.length === 0) return { success: true }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Normalize weekStartStr to canonical Monday
    const normalizedWeekStart = getWeekStart(parseIsoDateLocal(weekStartStr))
    const normalizedWeekStartStr = toISODate(normalizedWeekStart)

    if (isWeekLocked(normalizedWeekStart)) {
      return { success: false, error: 'Tuần này đã bị khoá tự động, không thể lưu.' }
    }
    const { data: lockRow } = await sb
      .from('attendance_locks')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('week_start', normalizedWeekStartStr)
      .maybeSingle()
    if (lockRow) {
      return { success: false, error: 'Tuần này đã bị khoá, không thể lưu.' }
    }

    const weekDates = getWeekDates(normalizedWeekStart)
    const validDates = new Set(weekDates.map(toISODate))
    const outOfRange = records.find((r) => !validDates.has(r.date))
    if (outOfRange) {
      return { success: false, error: 'Ngày chấm công nằm ngoài tuần đã chọn.' }
    }

    // Validate scheduleIds + employeeId is assigned to that schedule
    const scheduleIds = [...new Set(records.map((r) => r.scheduleId))]
    const { data: schCheck, error: schErr } = await sb
      .from('class_schedules')
      .select('id, teacher_id, assistant_id')
      .in('id', scheduleIds)
      .eq('branch_id', effectiveBranch)
    if (schErr) throw schErr
    const scheduleMap = new Map<string, { teacher_id: string; assistant_id: string }>(
      (schCheck ?? []).map((s: { id: string; teacher_id: string; assistant_id: string }) => [s.id, s])
    )
    for (const r of records) {
      const sched = scheduleMap.get(r.scheduleId)
      if (!sched) {
        return { success: false, error: 'Một số lịch học không thuộc chi nhánh này.' }
      }
      if (r.employeeId !== sched.teacher_id && r.employeeId !== sched.assistant_id) {
        return { success: false, error: 'Nhân viên không được phân công vào lịch học này.' }
      }
    }

    const upsertRows = records.map((r) => ({
      schedule_id: r.scheduleId,
      employee_id: r.employeeId,
      date: r.date,
      status: r.status,
      marked_by: user.id,
    }))

    const { error: upsErr } = await sb
      .from('attendance')
      .upsert(upsertRows, { onConflict: 'schedule_id,employee_id,date' })
    if (upsErr) throw upsErr

    return { success: true }
  } catch (err) {
    console.error('[saveAttendanceBatch]', err)
    return { success: false, error: 'Không thể lưu chấm công.' }
  }
}

export async function lockWeek(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canLock = user.role === 'admin' || user.role === 'branch_manager'
    if (!canLock) return { success: false, error: 'Bạn không có quyền khoá tuần.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('attendance_locks')
      .insert({
        branch_id: effectiveBranch,
        week_start: canonicalWeekStart,
        locked_by: user.id,
        locked_at: new Date().toISOString(),
      })

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return { success: true } // already locked
      }
      throw error
    }
    return { success: true }
  } catch (err) {
    console.error('[lockWeek]', err)
    return { success: false, error: 'Không thể khoá tuần.' }
  }
}

export async function unlockWeek(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Chỉ admin mới có thể mở khoá tuần.' }
    }

    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('attendance_locks')
      .delete()
      .eq('branch_id', branchId)
      .eq('week_start', canonicalWeekStart)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[unlockWeek]', err)
    return { success: false, error: 'Không thể mở khoá tuần.' }
  }
}
