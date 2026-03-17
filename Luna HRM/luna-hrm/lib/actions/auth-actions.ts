'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/database'

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean
  error?: string
}

export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Email hoặc mật khẩu không đúng.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Email chưa được xác nhận.' }
    }
    return { success: false, error: 'Đăng nhập thất bại. Vui lòng thử lại.' }
  }

  if (!data.user) {
    return { success: false, error: 'Không tìm thấy tài khoản.' }
  }

  // Verify employee record exists and is active
  type EmployeeRow = { id: string; is_active: boolean }
  const empResult = await supabase
    .from('employees')
    .select('id, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  const employee = empResult.data as EmployeeRow | null

  if (empResult.error || !employee) {
    await supabase.auth.signOut()
    return { success: false, error: 'Tài khoản nhân viên không tồn tại.' }
  }

  if (!employee.is_active) {
    await supabase.auth.signOut()
    return { success: false, error: 'Tài khoản đã bị vô hiệu hóa.' }
  }

  redirect('/dashboard')
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export interface ResetPasswordResult {
  success: boolean
  error?: string
}

export async function resetPasswordAction(
  email: string
): Promise<ResetPasswordResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/update`,
    }
  )

  if (error) {
    return { success: false, error: 'Không thể gửi email đặt lại mật khẩu.' }
  }

  return { success: true }
}

// ─── Get current session user ────────────────────────────────────────────────

/**
 * Returns the current authenticated session user.
 * Multi-Role RBAC: reads app_metadata.roles[] (with fallback to legacy role string).
 * role/roles/branch_id come from JWT app_metadata — immutable by client.
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // Read from JWT app_metadata — immutable by client (set via admin API only)
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const jwtBranchId = (meta.branch_id as string | null) ?? null

  // Multi-role: read roles[] array first, fall back to legacy role string
  let jwtRoles: UserRole[]
  if (Array.isArray(meta.roles) && meta.roles.length > 0) {
    jwtRoles = meta.roles as UserRole[]
  } else if (typeof meta.role === 'string' && meta.role) {
    jwtRoles = [meta.role as UserRole]
  } else {
    jwtRoles = ['employee']
  }

  type EmpRow = {
    id: string
    full_name: string
    position: string
    is_active: boolean
  }
  const empResult = await supabase
    .from('employees')
    .select('id, full_name, position, is_active')
    .eq('id', user.id)
    .maybeSingle()

  const employee = empResult.data as EmpRow | null

  if (!employee) return null
  if (!employee.is_active) return null

  return {
    id: user.id,
    email: user.email ?? '',
    full_name: employee.full_name,
    /** Primary role for display (first in array) */
    role: jwtRoles[0],
    /** All roles — use for permission checks */
    roles: jwtRoles,
    position: employee.position,
    branch_id: jwtBranchId,
  }
}

// ─── Admin: Update user roles in app_metadata ────────────────────────────────

export interface UpdateUserRolesResult {
  success: boolean
  error?: string
}

/**
 * Admin-only: update a user's roles in Supabase auth.users app_metadata.
 * Also syncs employees.roles[] column for RLS enforcement.
 * Requires service_role key — called from admin server actions only.
 */
export async function updateUserRoles(
  userId: string,
  roles: UserRole[],
  branchId: string | null
): Promise<UpdateUserRolesResult> {
  // ISSUE-1 fix: enforce admin-only server-side
  const caller = await getCurrentUser()
  if (!caller) return { success: false, error: 'Chưa đăng nhập.' }
  if (!caller.roles.includes('admin')) {
    return { success: false, error: 'Chỉ admin mới có thể thay đổi vai trò.' }
  }

  // Validate roles against allowed enum values
  const ALLOWED_ROLES: UserRole[] = ['admin', 'branch_manager', 'accountant', 'employee']
  const invalidRoles = roles.filter(r => !ALLOWED_ROLES.includes(r))
  if (invalidRoles.length) {
    return { success: false, error: `Vai trò không hợp lệ: ${invalidRoles.join(', ')}` }
  }

  if (!roles.length) {
    return { success: false, error: 'Phải có ít nhất 1 vai trò.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // Get current app_metadata for rollback
  const { data: currentAuthUser } = await adminClient.auth.admin.getUserById(userId)
  const previousMeta = currentAuthUser?.user?.app_metadata ?? {}

  // Update app_metadata.roles via Supabase Admin API
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      roles,
      role: roles[0], // backward compat
      branch_id: branchId,
    },
  })

  if (authError) {
    console.error('[updateUserRoles] auth error:', authError)
    return { success: false, error: 'Không thể cập nhật vai trò tài khoản.' }
  }

  // Sync employees.roles[] column
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: empError } = await (adminClient as any)
    .from('employees')
    .update({ roles, role: roles[0], branch_id: branchId })
    .eq('id', userId)

  if (empError) {
    console.error('[updateUserRoles] employees sync error:', empError)
    // Rollback auth metadata to maintain consistency
    await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: previousMeta,
    })
    return { success: false, error: 'Không thể đồng bộ vai trò nhân viên. Đã hoàn tác thay đổi.' }
  }

  return { success: true }
}
