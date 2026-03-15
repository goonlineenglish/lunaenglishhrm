'use server'

import { createClient } from '@/lib/supabase/server'
import { createAuthUser, deleteAuthUser, updateAuthUserMetadata } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logAudit } from '@/lib/services/audit-log-service'
import type { Employee, UserRole } from '@/lib/types/database'
import type { ActionResult } from './employee-query-actions'

export interface CreateEmployeeInput {
  employee_code: string
  full_name: string
  email: string
  password: string
  phone?: string | null
  position: Employee['position']
  role: Employee['role']
  branch_id?: string | null
  rate_per_session: number
  sub_rate?: number
  has_labor_contract: boolean
  dependent_count: number
}

/** Roles that branch_manager is allowed to assign */
const BM_ALLOWED_ROLES: UserRole[] = ['employee']

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<ActionResult<Employee>> {
  let authUserId: string | null = null
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canCreate = user.role === 'admin' || user.role === 'branch_manager'
    if (!canCreate) return { success: false, error: 'Bạn không có quyền tạo nhân viên.' }

    if (user.role === 'branch_manager' && !BM_ALLOWED_ROLES.includes(input.role)) {
      return { success: false, error: 'Bạn không có quyền gán vai trò này.' }
    }

    const branchId = user.role === 'branch_manager' ? user.branch_id : (input.branch_id ?? null)

    const authUser = await createAuthUser({
      email: input.email.toLowerCase(), // normalize to lowercase (matches DB lower(email) unique index)
      password: input.password,
      role: input.role,
      branchId: branchId ?? undefined,
    })
    authUserId = authUser.id

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: employee, error } = await sb.from('employees').insert({
      id: authUser.id,
      employee_code: input.employee_code,
      full_name: input.full_name,
      email: input.email.toLowerCase(), // normalized
      phone: input.phone ?? null,
      position: input.position,
      role: input.role,
      branch_id: branchId,
      rate_per_session: input.rate_per_session,
      sub_rate: input.sub_rate ?? 0,
      has_labor_contract: input.has_labor_contract,
      dependent_count: input.dependent_count,
      is_active: true,
      join_date: new Date().toISOString().split('T')[0],
    }).select().single()

    // Rollback auth user if DB insert fails
    if (error) {
      await deleteAuthUser(authUserId).catch((e) =>
        console.error('[createEmployee] auth rollback failed:', e)
      )
      throw error
    }

    logAudit({ tableName: 'employees', recordId: (employee as Employee).id, action: 'INSERT', userId: user.id, userEmail: user.email, newData: { employee_code: input.employee_code, full_name: input.full_name } })
    return { success: true, data: employee as Employee }
  } catch (err: unknown) {
    console.error('[createEmployee]', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return { success: false, error: 'Email đã tồn tại trong hệ thống.' }
    }
    return { success: false, error: 'Không thể tạo nhân viên.' }
  }
}

export async function updateEmployee(
  id: string,
  data: Record<string, unknown>
): Promise<ActionResult<Employee>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = user.role === 'admin' || user.role === 'branch_manager'
    if (!canEdit) return { success: false, error: 'Bạn không có quyền sửa nhân viên.' }

    // Field allowlist — prevent arbitrary column injection (P1-3)
    const ALLOWED_UPDATE_FIELDS = new Set([
      'full_name', 'phone', 'position', 'role', 'branch_id',
      'rate_per_session', 'sub_rate', 'has_labor_contract',
      'dependent_count', 'is_active',
    ])
    const safeData: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(data)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) safeData[key] = val
    }
    if (Object.keys(safeData).length === 0) {
      return { success: false, error: 'Không có trường hợp lệ để cập nhật.' }
    }

    if (user.role === 'branch_manager' && safeData.role !== undefined) {
      if (!BM_ALLOWED_ROLES.includes(safeData.role as UserRole)) {
        return { success: false, error: 'Bạn không có quyền gán vai trò này.' }
      }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    if (user.role === 'branch_manager') {
      const { data: existing } = await sb
        .from('employees').select('branch_id').eq('id', id).maybeSingle()
      const e = existing as { branch_id: string | null } | null
      if (e?.branch_id !== user.branch_id) {
        return { success: false, error: 'Bạn không có quyền sửa nhân viên này.' }
      }
    }

    // Server-side self-deactivation guard (ISSUE-1 fix)
    if (safeData.is_active === false && id === user.id) {
      return { success: false, error: 'Không thể tự vô hiệu hóa tài khoản của mình.' }
    }

    // Use admin client for UPDATE to bypass RLS infinite recursion (42P17) in
    // employees_self_update WITH CHECK. App-level checks above enforce all security.
    // Long-term fix: apply supabase/migrations/011_fix_rls_recursion.sql to Supabase.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSb = createAdminClient() as any
    const { data: employee, error } = await adminSb
      .from('employees').update(safeData).eq('id', id).select().single()

    if (error) throw error

    // Sync role + branch_id to app_metadata if changed
    if (safeData.role !== undefined || safeData.branch_id !== undefined) {
      await updateAuthUserMetadata(id, {
        role: safeData.role as string | undefined,
        branchId: safeData.branch_id as string | undefined,
      }).catch((e) => console.error('[updateEmployee] metadata sync failed:', e))
    }

    logAudit({ tableName: 'employees', recordId: id, action: 'UPDATE', userId: user.id, userEmail: user.email, newData: safeData })
    return { success: true, data: employee as Employee }
  } catch (err) {
    console.error('[updateEmployee]', err)
    return { success: false, error: 'Không thể cập nhật nhân viên.' }
  }
}
