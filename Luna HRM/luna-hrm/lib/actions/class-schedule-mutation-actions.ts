'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { ClassSchedule, ClassScheduleInsert, ClassScheduleUpdate } from '@/lib/types/database'
import type { ActionResult } from './class-schedule-query-actions'

/** Validate teacher/assistant belong to branch AND have correct position AND are active */
async function validateStaffAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  checks: { id: string; requiredPosition: string; label: string }[]
): Promise<ActionResult | null> {
  for (const check of checks) {
    // First check: is employee active?
    const { data: emp, error: empErr } = await sb
      .from('employees')
      .select('id, position, is_active, full_name')
      .eq('id', check.id)
      .eq('branch_id', branchId)
      .maybeSingle()

    if (empErr) throw empErr

    if (!emp) {
      // Employee doesn't exist in this branch at all
      return {
        success: false,
        error: `${check.label} không tồn tại hoặc không thuộc chi nhánh này.`
      }
    }

    if (!emp.is_active) {
      return {
        success: false,
        error: `${check.label} "${emp.full_name}" đã bị vô hiệu hóa. Vui lòng chọn nhân viên khác.`
      }
    }

    if (emp.position !== check.requiredPosition) {
      return {
        success: false,
        error: `${check.label} "${emp.full_name}" có chức vụ ${emp.position}, không phải ${check.requiredPosition}. Vui lòng chọn nhân viên phù hợp.`
      }
    }
  }
  return null // all valid
}

export async function createClassSchedule(
  data: ClassScheduleInsert
): Promise<ActionResult<ClassSchedule>> {
  try {
    // Validate input data structure before DB call
    if (!data.teacher_id) return { success: false, error: 'Giáo viên là bắt buộc.' }
    if (!data.assistant_id) return { success: false, error: 'Trợ giảng là bắt buộc.' }
    if (data.teacher_id === data.assistant_id) {
      return { success: false, error: 'Giáo viên và trợ giảng phải là hai người khác nhau.' }
    }
    if (!Array.isArray(data.days_of_week) || data.days_of_week.length === 0) {
      return { success: false, error: 'Phải chọn ít nhất một ngày học.' }
    }

    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canCreate = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canCreate) return { success: false, error: 'Bạn không có quyền tạo lịch lớp.' }

    const isBM = user.roles.includes('branch_manager')
    const branchId = isBM ? user.branch_id! : data.branch_id

    // Validate branchId is a valid UUID before DB call (prevents "invalid input syntax for type uuid")
    if (!branchId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) {
      return { success: false, error: 'Vui lòng chọn chi nhánh trước khi tạo lịch lớp.' }
    }

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
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[createClassSchedule] Error:', { message: msg, data })

    // Parse specific error patterns
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('Duplicate')) {
      return { success: false, error: 'Mã lớp đã tồn tại trong chi nhánh này. Vui lòng chọn mã lớp khác.' }
    }
    if (msg.includes('foreign key') || msg.includes('no rows returned')) {
      return { success: false, error: 'Giáo viên hoặc trợ giảng không tồn tại. Vui lòng chọn nhân viên khác.' }
    }
    if (msg.includes('chk_teacher_ne_assistant') || msg.includes('teacher_ne_assistant')) {
      return { success: false, error: 'Giáo viên và trợ giảng phải là hai người khác nhau.' }
    }
    if (msg.includes('chk_days_of_week') || msg.includes('days_of_week')) {
      return { success: false, error: 'Ngày học không hợp lệ. Phải chọn từ Thứ 2 đến Chủ nhật.' }
    }
    if (msg.includes('permission denied') || msg.includes('policy violation') || msg.includes('new row violates')) {
      return { success: false, error: 'Bạn không có quyền tạo lịch lớp cho chi nhánh này. Vui lòng liên hệ quản trị viên.' }
    }
    if (msg.includes('authentication') || msg.includes('jwt')) {
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' }
    }

    // Fallback: provide original message for debugging (limited length)
    const details = msg.substring(0, 100)
    return { success: false, error: `Không thể tạo lịch lớp. ${details}` }
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
    // Only validate staff that are actually being changed — skip if same as existing
    // (inactive existing staff should not block unrelated field edits)
    if (data.teacher_id && data.teacher_id !== existing.teacher_id) {
      empChecks.push({ id: data.teacher_id, requiredPosition: 'teacher', label: 'Giáo viên' })
    }
    if (data.assistant_id && data.assistant_id !== existing.assistant_id) {
      empChecks.push({ id: data.assistant_id, requiredPosition: 'assistant', label: 'Trợ giảng' })
    }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[updateClassSchedule] Error:', { message: msg, scheduleId: id })

    // Parse specific error patterns
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('Duplicate')) {
      return { success: false, error: 'Mã lớp đã tồn tại trong chi nhánh này. Vui lòng chọn mã lớp khác.' }
    }
    if (msg.includes('chk_teacher_ne_assistant')) {
      return { success: false, error: 'Giáo viên và trợ giảng phải là hai người khác nhau.' }
    }
    if (msg.includes('permission denied') || msg.includes('policy violation')) {
      return { success: false, error: 'Bạn không có quyền sửa lịch lớp này.' }
    }

    return { success: false, error: 'Không thể cập nhật lịch lớp. Vui lòng kiểm tra dữ liệu và thử lại.' }
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
