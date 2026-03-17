'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { ClassSchedule, ClassScheduleInsert, ClassScheduleUpdate } from '@/lib/types/database'
import type { ActionResult } from './class-schedule-query-actions'

/** Validate teacher/assistant belong to branch AND have correct position */
async function validateStaffAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  checks: { id: string; requiredPosition: string; label: string }[]
): Promise<ActionResult | null> {
  for (const check of checks) {
    const { data: emp, error: empErr } = await sb
      .from('employees')
      .select('id, position')
      .eq('id', check.id)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .maybeSingle()
    if (empErr) throw empErr
    if (!emp) return { success: false, error: `${check.label} không thuộc chi nhánh này.` }
    if (emp.position !== check.requiredPosition) {
      return { success: false, error: `${check.label} không có chức vụ phù hợp.` }
    }
  }
  return null // all valid
}

export async function createClassSchedule(
  data: ClassScheduleInsert
): Promise<ActionResult<ClassSchedule>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canCreate = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canCreate) return { success: false, error: 'Bạn không có quyền tạo lịch lớp.' }

    const isBM = user.roles.includes('branch_manager')
    const branchId = isBM ? user.branch_id! : data.branch_id

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const empChecks: { id: string; requiredPosition: string; label: string }[] = []
    if (data.teacher_id) empChecks.push({ id: data.teacher_id, requiredPosition: 'teacher', label: 'Giáo viên' })
    if (data.assistant_id) empChecks.push({ id: data.assistant_id, requiredPosition: 'assistant', label: 'Trợ giảng' })

    const validationError = await validateStaffAssignment(sb, branchId, empChecks)
    if (validationError) return validationError as ActionResult<ClassSchedule>

    const { data: schedule, error } = await sb
      .from('class_schedules')
      .insert({ ...data, branch_id: branchId })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: schedule as ClassSchedule }
  } catch (err: unknown) {
    console.error('[createClassSchedule]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { success: false, error: 'Mã lớp đã tồn tại trong chi nhánh này.' }
    }
    return { success: false, error: 'Không thể tạo lịch lớp.' }
  }
}

export async function updateClassSchedule(
  id: string,
  data: ClassScheduleUpdate
): Promise<ActionResult<ClassSchedule>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canEdit) return { success: false, error: 'Bạn không có quyền sửa lịch lớp.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: existing, error: fetchErr } = await sb
      .from('class_schedules')
      .select('id, branch_id, teacher_id, assistant_id')
      .eq('id', id)
      .single()
    if (fetchErr || !existing) return { success: false, error: 'Lịch lớp không tồn tại.' }

    const isBM = user.roles.includes('branch_manager')
    const effectiveBranch = isBM ? user.branch_id! : existing.branch_id

    const empChecks: { id: string; requiredPosition: string; label: string }[] = []
    if (data.teacher_id) empChecks.push({ id: data.teacher_id, requiredPosition: 'teacher', label: 'Giáo viên' })
    if (data.assistant_id) empChecks.push({ id: data.assistant_id, requiredPosition: 'assistant', label: 'Trợ giảng' })

    const validationError = await validateStaffAssignment(sb, effectiveBranch, empChecks)
    if (validationError) return validationError as ActionResult<ClassSchedule>

    // Warn if reassigning staff with existing attendance records
    const staffChanged =
      (data.teacher_id && data.teacher_id !== existing.teacher_id) ||
      (data.assistant_id && data.assistant_id !== existing.assistant_id)
    if (staffChanged) {
      const { count } = await sb
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('schedule_id', id)
      if ((count ?? 0) > 0) {
        return {
          success: false,
          error: `Lịch lớp đã có ${count} bản ghi chấm công. Không thể đổi giáo viên/trợ giảng. Hãy tạo lịch mới thay thế.`,
        }
      }
    }

    const { data: schedule, error } = await sb
      .from('class_schedules')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: schedule as ClassSchedule }
  } catch (err) {
    console.error('[updateClassSchedule]', err)
    return { success: false, error: 'Không thể cập nhật lịch lớp.' }
  }
}

export async function deactivateClassSchedule(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canEdit) return { success: false, error: 'Bạn không có quyền ngừng lớp.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('class_schedules')
      .update({ status: 'inactive' })
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy lớp hoặc bạn không có quyền.' }
    return { success: true }
  } catch (err) {
    console.error('[deactivateClassSchedule]', err)
    return { success: false, error: 'Không thể ngừng lớp.' }
  }
}

export async function reactivateClassSchedule(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canEdit) return { success: false, error: 'Bạn không có quyền mở lại lớp.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('class_schedules')
      .update({ status: 'active' })
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy lớp hoặc bạn không có quyền.' }
    return { success: true }
  } catch (err) {
    console.error('[reactivateClassSchedule]', err)
    return { success: false, error: 'Không thể mở lại lớp.' }
  }
}
