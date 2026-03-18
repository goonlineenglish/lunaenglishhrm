'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { Employee } from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface EmployeeWithBranch extends Employee {
  branch_name?: string | null
}

export async function getEmployees(
  branchId?: string,
  isActive?: boolean
): Promise<ActionResult<EmployeeWithBranch[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = hasAnyRole(user, 'admin', 'branch_manager', 'accountant')
    if (!canView) return { success: false, error: 'Bạn không có quyền xem nhân viên.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb.from('employees').select('*, branches!employees_branch_id_fkey(name)').order('full_name')

    if (user.roles.includes('branch_manager') && user.branch_id) {
      query = query.eq('branch_id', user.branch_id)
    } else if (branchId && !user.roles.includes('branch_manager')) {
      query = query.eq('branch_id', branchId)
    }

    // Filter by is_active if specified (undefined = return all)
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    const { data, error } = await query
    if (error) throw error

    const employees: EmployeeWithBranch[] = ((data as unknown[]) ?? []).map((emp) => {
      const e = emp as Employee & { branches: { name: string } | null }
      const { branches, ...rest } = e
      return { ...rest, branch_name: branches?.name ?? null }
    })

    return { success: true, data: employees }
  } catch (err) {
    console.error('[getEmployees]', err)
    return { success: false, error: 'Không thể tải danh sách nhân viên.' }
  }
}

export async function getEmployeeById(
  id: string
): Promise<ActionResult<EmployeeWithBranch>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data, error } = await sb
      .from('employees')
      .select('*, branches!employees_branch_id_fkey(name)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy nhân viên.' }

    const emp = data as Employee & { branches: { name: string } | null }

    if (user.roles.includes('branch_manager') && !user.roles.includes('admin') && emp.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền xem nhân viên này.' }
    }
    if (user.roles.includes('employee') && !user.roles.includes('branch_manager') && !user.roles.includes('admin') && emp.id !== user.id) {
      return { success: false, error: 'Bạn không có quyền xem nhân viên này.' }
    }

    const { branches, ...rest } = emp
    return { success: true, data: { ...rest, branch_name: emp.branches?.name ?? null } }
  } catch (err) {
    console.error('[getEmployeeById]', err)
    return { success: false, error: 'Không thể tải thông tin nhân viên.' }
  }
}

export async function checkEmployeeClassAssignments(
  employeeId: string
): Promise<ActionResult<string[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb
      .from('class_schedules')
      .select('class_code')
      .eq('status', 'active')
      .or(`teacher_id.eq.${employeeId},assistant_id.eq.${employeeId}`)

    // BM: scope to own branch only
    if (user.roles.includes('branch_manager') && user.branch_id) {
      query = query.eq('branch_id', user.branch_id)
    }

    const { data, error } = await query
    if (error) throw error

    const codes = ((data ?? []) as { class_code: string }[]).map((d) => d.class_code)
    return { success: true, data: codes }
  } catch (err) {
    console.error('[checkEmployeeClassAssignments]', err)
    return { success: false, error: 'Không thể kiểm tra lịch lớp.' }
  }
}

// ─── Dashboard stats (count-only, no full objects) ────────────────────────────

export interface EmployeeCountStats {
  total: number
  active: number
}

/**
 * Count-only query for dashboard stats.
 * Uses aggregate counts instead of fetching all employee rows.
 * ~100x lighter than getEmployees() for dashboard use.
 */
export async function getEmployeeCountStats(
  branchId?: string
): Promise<ActionResult<EmployeeCountStats>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = hasAnyRole(user, 'admin', 'branch_manager', 'accountant')
    if (!canView) return { success: false, error: 'Bạn không có quyền xem thống kê.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Resolve effective branch scope
    const effectiveBranchId = user.roles.includes('branch_manager') && user.branch_id
      ? user.branch_id
      : branchId

    // Build base query with count-only (head: true = no row data returned)
    const buildQuery = (isActiveFilter?: boolean) => {
      let q = sb.from('employees').select('id', { count: 'exact', head: true })
      if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
      if (isActiveFilter !== undefined) q = q.eq('is_active', isActiveFilter)
      return q
    }

    const [totalResult, activeResult] = await Promise.all([
      buildQuery(),
      buildQuery(true),
    ])

    if (totalResult.error) throw totalResult.error
    if (activeResult.error) throw activeResult.error

    return {
      success: true,
      data: {
        total: totalResult.count ?? 0,
        active: activeResult.count ?? 0,
      },
    }
  } catch (err) {
    console.error('[getEmployeeCountStats]', err)
    return { success: false, error: 'Không thể tải thống kê nhân viên.' }
  }
}
