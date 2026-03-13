'use server'

/**
 * Attendance lock management actions: unlock, override auto-lock, remove override.
 * Extracted here to keep attendance-save-actions.ts under 200 lines.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekStart, parseIsoDateLocal, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
import { logAudit } from '@/lib/services/audit-log-service'
import type { ActionResult } from './attendance-query-actions'

/**
 * Unlock a manually-locked week (admin or BM — own branch).
 * Only removes the manual lock row (is_override=false).
 */
export async function unlockWeek(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canUnlock = user.role === 'admin' || user.role === 'branch_manager'
    if (!canUnlock) return { success: false, error: 'Bạn không có quyền mở khoá tuần.' }

    // BM scoped to own branch
    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('attendance_locks')
      .delete()
      .eq('branch_id', effectiveBranch)
      .eq('week_start', canonicalWeekStart)
      .eq('is_override', false)

    if (error) throw error

    logAudit({
      tableName: 'attendance_locks',
      recordId: `${effectiveBranch}:${canonicalWeekStart}`,
      action: 'DELETE',
      userId: user.id,
      userEmail: user.email ?? undefined,
      newData: { action: 'unlock_manual', branch_id: effectiveBranch, week_start: canonicalWeekStart },
    })

    return { success: true }
  } catch (err) {
    console.error('[unlockWeek]', err)
    return { success: false, error: 'Không thể mở khoá tuần.' }
  }
}

/**
 * Insert an override row to allow editing an auto-locked week.
 * Blocked if payroll for EITHER bounding month is confirmed.
 * Blocked if the week is not actually auto-locked.
 */
export async function overrideAutoLock(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canOverride = user.role === 'admin' || user.role === 'branch_manager'
    if (!canOverride) return { success: false, error: 'Bạn không có quyền mở khoá tuần.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Guard: cannot override if already manually locked (P1-1 fix)
    const { data: existingManualLock } = await sb
      .from('attendance_locks')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('week_start', canonicalWeekStart)
      .eq('is_override', false)
      .maybeSingle()
    if (existingManualLock) {
      return { success: false, error: 'Tuần này đã bị khoá thủ công.' }
    }

    // Guard: only allow if week is actually auto-locked
    const weekDate = parseIsoDateLocal(canonicalWeekStart)
    if (!isWeekLocked(weekDate)) {
      return { success: false, error: 'Tuần này chưa bị khoá tự động.' }
    }

    // Cross-month payroll guard
    const weekEndDate = new Date(weekDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const startMonth = weekDate.getMonth() + 1
    const startYear = weekDate.getFullYear()
    const endMonth = weekEndDate.getMonth() + 1
    const endYear = weekEndDate.getFullYear()
    let payrollFilter = `and(month.eq.${startMonth},year.eq.${startYear})`
    if (startMonth !== endMonth || startYear !== endYear) {
      payrollFilter += `,and(month.eq.${endMonth},year.eq.${endYear})`
    }
    const { data: confirmedPeriod } = await sb
      .from('payroll_periods')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('status', 'confirmed')
      .or(payrollFilter)
      .limit(1)
      .maybeSingle()
    if (confirmedPeriod) {
      return { success: false, error: 'Không thể mở khoá — bảng lương tháng này đã được xác nhận.' }
    }

    const { error } = await sb
      .from('attendance_locks')
      .insert({
        branch_id: effectiveBranch,
        week_start: canonicalWeekStart,
        locked_by: user.id,
        locked_at: new Date().toISOString(),
        is_override: true,
      })

    if (error) {
      // Idempotent — already overridden
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return { success: true }
      }
      throw error
    }

    logAudit({
      tableName: 'attendance_locks',
      recordId: `${effectiveBranch}:${canonicalWeekStart}`,
      action: 'INSERT',
      userId: user.id,
      userEmail: user.email ?? undefined,
      newData: { action: 'override_auto_lock', branch_id: effectiveBranch, week_start: canonicalWeekStart },
    })

    return { success: true }
  } catch (err) {
    console.error('[overrideAutoLock]', err)
    return { success: false, error: 'Không thể mở khoá tuần.' }
  }
}

/**
 * Remove the override row — re-locks an overridden auto-locked week.
 */
export async function removeOverride(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canRemove = user.role === 'admin' || user.role === 'branch_manager'
    if (!canRemove) return { success: false, error: 'Bạn không có quyền khoá lại tuần.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('attendance_locks')
      .delete()
      .eq('branch_id', effectiveBranch)
      .eq('week_start', canonicalWeekStart)
      .eq('is_override', true)

    if (error) throw error

    logAudit({
      tableName: 'attendance_locks',
      recordId: `${effectiveBranch}:${canonicalWeekStart}`,
      action: 'DELETE',
      userId: user.id,
      userEmail: user.email ?? undefined,
      newData: { action: 'remove_override', branch_id: effectiveBranch, week_start: canonicalWeekStart },
    })

    return { success: true }
  } catch (err) {
    console.error('[removeOverride]', err)
    return { success: false, error: 'Không thể khoá lại tuần.' }
  }
}
