'use server'

/**
 * Detect schedule conflicts for a branch.
 * Fetches active class_schedules with teacher/assistant info,
 * then runs detectConflicts() to find same-shift overlaps.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import { detectConflicts, type ScheduleConflict } from '@/lib/services/attendance-grid-helpers'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/** Detect schedule conflicts for active classes in a branch */
export async function getScheduleConflicts(
  branchId?: string
): Promise<ActionResult<ScheduleConflict[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canView) return { success: false, error: 'Không có quyền.' }

    const isBM = user.roles.includes('branch_manager')
    const effectiveBranch = isBM ? user.branch_id : branchId

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb
      .from('class_schedules')
      .select('id, class_code, class_name, shift_time, days_of_week, teacher_id, assistant_id, teacher:employees!class_schedules_teacher_id_fkey(employee_code, full_name), assistant:employees!class_schedules_assistant_id_fkey(employee_code, full_name)')
      .eq('status', 'active')
      .order('class_code')

    if (effectiveBranch) query = query.eq('branch_id', effectiveBranch)

    const { data, error } = await query
    if (error) throw error

    const conflicts = detectConflicts(data ?? [])
    return { success: true, data: conflicts }
  } catch (err) {
    console.error('[getScheduleConflicts]', err)
    return { success: false, error: 'Không thể kiểm tra xung đột lịch.' }
  }
}
