'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { ClassSchedule, ClassScheduleInsert, ClassScheduleUpdate } from '@/lib/types/database'
import type { ActionResult } from './class-schedule-query-actions'

// ─── Shared validation helpers ──────────────────────────────────────────────

/** UUID v4 format regex */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validate a string is a valid UUID (prevents PostgreSQL "invalid input syntax for type uuid") */
function isValidUUID(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Validate UUID fields and return error if invalid. Returns null if all valid. */
function validateUUIDs(
  fields: { value: string | undefined | null; label: string }[]
): ActionResult | null {
  for (const { value, label } of fields) {
    if (!value) return { success: false, error: `${label} là bắt buộc.` }
    if (!isValidUUID(value)) return { success: false, error: `${label} không hợp lệ. Vui lòng chọn lại.` }
  }
  return null
}

/** Shared input validation for class schedule create/update data */
function validateScheduleInput(
  data: { teacher_id?: string; assistant_id?: string; days_of_week?: number[] },
  opts: { requireStaff: boolean }
): ActionResult | null {
  if (opts.requireStaff) {
    const uuidErr = validateUUIDs([
      { value: data.teacher_id, label: 'Giáo viên' },
      { value: data.assistant_id, label: 'Trợ giảng' },
    ])
    if (uuidErr) return uuidErr
  } else {
    // Update path: only validate UUIDs if provided
    if (data.teacher_id && !isValidUUID(data.teacher_id)) {
      return { success: false, error: 'Giáo viên không hợp lệ. Vui lòng chọn lại.' }
    }
    if (data.assistant_id && !isValidUUID(data.assistant_id)) {
      return { success: false, error: 'Trợ giảng không hợp lệ. Vui lòng chọn lại.' }
    }
  }

  if (data.teacher_id && data.assistant_id && data.teacher_id === data.assistant_id) {
    return { success: false, error: 'Giáo viên và trợ giảng phải là hai người khác nhau.' }
  }
  if (data.days_of_week !== undefined) {
    if (!Array.isArray(data.days_of_week) || data.days_of_week.length === 0) {
      return { success: false, error: 'Phải chọn ít nhất một ngày học.' }
    }
  }
  return null
}

/** Parse DB error into user-friendly message */
function parseDbError(msg: string, context: 'create' | 'update'): string {
  if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('Duplicate')) {
    return 'Mã lớp đã tồn tại trong chi nhánh này. Vui lòng chọn mã lớp khác.'
  }
  if (msg.includes('foreign key') || msg.includes('no rows returned')) {
    return 'Giáo viên hoặc trợ giảng không tồn tại. Vui lòng chọn nhân viên khác.'
  }
  if (msg.includes('chk_teacher_ne_assistant') || msg.includes('teacher_ne_assistant')) {
    return 'Giáo viên và trợ giảng phải là hai người khác nhau.'
  }
  if (msg.includes('chk_days_of_week') || msg.includes('days_of_week')) {
    return 'Ngày học không hợp lệ. Phải chọn từ Thứ 2 đến Chủ nhật.'
  }
  if (msg.includes('permission denied') || msg.includes('policy violation') || msg.includes('new row violates')) {
    return context === 'create'
      ? 'Bạn không có quyền tạo lịch lớp cho chi nhánh này. Vui lòng liên hệ quản trị viên.'
      : 'Bạn không có quyền sửa lịch lớp này.'
  }
  if (msg.includes('authentication') || msg.includes('jwt')) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
  }
  // Fallback with truncated error for debugging
  const details = msg.substring(0, 100)
  return context === 'create'
    ? `Không thể tạo lịch lớp. ${details}`
    : `Không thể cập nhật lịch lớp. ${details}`
}

// ─── Staff validation ───────────────────────────────────────────────────────

/** Validate teacher/assistant belong to branch AND have correct position AND are active */
async function validateStaffAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  checks: { id: string; requiredPosition: string; label: string }[]
): Promise<ActionResult | null> {
  for (const check of checks) {
    const { data: emp, error: empErr } = await sb
      .from('employees')
      .select('id, position, is_active, full_name')
      .eq('id', check.id)
      .eq('branch_id', branchId)
      .maybeSingle()

    if (empErr) throw empErr

    if (!emp) {
      return { success: false, error: `${check.label} không tồn tại hoặc không thuộc chi nhánh này.` }
    }
    if (!emp.is_active) {
      return { success: false, error: `${check.label} "${emp.full_name}" đã bị vô hiệu hóa. Vui lòng chọn nhân viên khác.` }
    }
    if (emp.position !== check.requiredPosition) {
      return { success: false, error: `${check.label} "${emp.full_name}" có chức vụ ${emp.position}, không phải ${check.requiredPosition}. Vui lòng chọn nhân viên phù hợp.` }
    }
  }
  return null
}

// ─── CRUD actions ───────────────────────────────────────────────────────────

export async function createClassSchedule(
  data: ClassScheduleInsert
): Promise<ActionResult<ClassSchedule>> {
  try {
    // ISSUE-1 fix: validate all UUID fields + input before DB call
    const inputErr = validateScheduleInput(data, { requireStaff: true })
    if (inputErr) return inputErr as ActionResult<ClassSchedule>

    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canCreate = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canCreate) return { success: false, error: 'Bạn không có quyền tạo lịch lớp.' }

    const isBM = user.roles.includes('branch_manager')
    const branchId = isBM ? user.branch_id! : data.branch_id

    if (!isValidUUID(branchId)) {
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
    return { success: false, error: parseDbError(msg, 'create') }
  }
}

export async function updateClassSchedule(
  id: string,
  data: ClassScheduleUpdate
): Promise<ActionResult<ClassSchedule>> {
  try {
    // ISSUE-1 fix: validate schedule ID is UUID
    if (!isValidUUID(id)) {
      return { success: false, error: 'Lịch lớp không hợp lệ.' }
    }

    // ISSUE-2 fix: validate input fields (UUIDs, teacher!=assistant, days)
    const inputErr = validateScheduleInput(data, { requireStaff: false })
    if (inputErr) return inputErr as ActionResult<ClassSchedule>

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

    // Cross-field check: teacher != assistant after merge with existing values
    const finalTeacher = data.teacher_id ?? existing.teacher_id
    const finalAssistant = data.assistant_id ?? existing.assistant_id
    if (finalTeacher && finalAssistant && finalTeacher === finalAssistant) {
      return { success: false, error: 'Giáo viên và trợ giảng phải là hai người khác nhau.' }
    }

    const empChecks: { id: string; requiredPosition: string; label: string }[] = []
    // Only validate staff that are actually being changed
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
    return { success: false, error: parseDbError(msg, 'update') }
  }
}

export async function deactivateClassSchedule(
  id: string
): Promise<ActionResult> {
  try {
    if (!isValidUUID(id)) return { success: false, error: 'Lịch lớp không hợp lệ.' }

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
    if (!isValidUUID(id)) return { success: false, error: 'Lịch lớp không hợp lệ.' }

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
