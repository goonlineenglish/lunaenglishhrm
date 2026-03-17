'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { ClassSchedule, Employee } from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface EmployeeLookup {
  id: string
  employee_code: string
  full_name: string
  position: string
  rate_per_session: number
}

/** Get class schedules for branch, with teacher/assistant names */
export async function getClassSchedules(
  branchId?: string,
  status?: 'active' | 'inactive'
): Promise<ActionResult<(ClassSchedule & { teacher_name: string; assistant_name: string })[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canView) return { success: false, error: 'Bạn không có quyền xem lịch lớp.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const isBM = user.roles.includes('branch_manager')
    const effectiveBranch = isBM ? user.branch_id : branchId

    let query = sb
      .from('class_schedules')
      .select('*, teacher:employees!class_schedules_teacher_id_fkey(full_name), assistant:employees!class_schedules_assistant_id_fkey(full_name)')
      .order('class_code')

    if (effectiveBranch) query = query.eq('branch_id', effectiveBranch)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    type RawRow = ClassSchedule & {
      teacher: { full_name: string } | null
      assistant: { full_name: string } | null
    }
    const rows = ((data ?? []) as RawRow[]).map((r) => ({
      ...r,
      teacher_name: r.teacher?.full_name ?? '—',
      assistant_name: r.assistant?.full_name ?? '—',
      teacher: undefined,
      assistant: undefined,
    }))

    return { success: true, data: rows }
  } catch (err) {
    console.error('[getClassSchedules]', err)
    return { success: false, error: 'Không thể tải lịch lớp.' }
  }
}

/** Fetch all active employees for combobox selection. Role-gated + branch-scoped. */
export async function getEmployeesForSelection(
  branchId?: string
): Promise<ActionResult<EmployeeLookup[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    // Role gate: only admin/BM/accountant can fetch bulk list
    const canAccess = hasAnyRole(user, 'admin', 'branch_manager', 'accountant')
    if (!canAccess) return { success: false, error: 'Không có quyền.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM always scoped to own branch. Admin with empty branchId → fetch all
    const effectiveBranch = user.roles.includes('branch_manager')
      ? user.branch_id
      : (branchId || undefined)

    let query = sb
      .from('employees')
      .select('id, employee_code, full_name, position, rate_per_session')
      .eq('is_active', true)
      .order('full_name')

    if (effectiveBranch) query = query.eq('branch_id', effectiveBranch)

    const { data, error } = await query
    if (error) throw error
    return { success: true, data: (data ?? []) as EmployeeLookup[] }
  } catch (err) {
    console.error('[getEmployeesForSelection]', err)
    return { success: false, error: 'Không thể tải danh sách nhân viên.' }
  }
}

/** Lookup employee by code (partial match). Branch-scoped for BM. */
export async function lookupEmployeeByCode(
  code: string,
  position?: Employee['position']
): Promise<ActionResult<EmployeeLookup[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb
      .from('employees')
      .select('id, employee_code, full_name, position, rate_per_session')
      .eq('is_active', true)
      .ilike('employee_code', `%${code}%`)
      .order('employee_code')
      .limit(10)

    if (user.roles.includes('branch_manager') && user.branch_id) {
      query = query.eq('branch_id', user.branch_id)
    }
    if (position) query = query.eq('position', position)

    const { data, error } = await query
    if (error) throw error
    return { success: true, data: (data ?? []) as EmployeeLookup[] }
  } catch (err) {
    console.error('[lookupEmployeeByCode]', err)
    return { success: false, error: 'Không thể tìm nhân viên.' }
  }
}
