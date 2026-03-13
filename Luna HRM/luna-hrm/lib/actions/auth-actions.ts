'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    // Return user-friendly Vietnamese messages
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
  // After signInWithPassword, the server client already has the user session
  type EmployeeRow = { id: string; is_active: boolean; role: string }
  const empResult = await supabase
    .from('employees')
    .select('id, is_active, role')
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

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // ISSUE-2 fix: read role/branch_id from JWT app_metadata (immutable by client)
  // app_metadata is set by admin API and cannot be forged by the user
  const meta = (user.app_metadata ?? {}) as Record<string, string | null>
  const jwtRole = (meta.role ?? null) as string | null
  const jwtBranchId = (meta.branch_id ?? null) as string | null

  type EmpRow = {
    id: string; full_name: string; position: string; is_active: boolean
  }
  const empResult = await supabase
    .from('employees')
    .select('id, full_name, position, is_active')
    .eq('id', user.id)
    .maybeSingle()

  const employee = empResult.data as EmpRow | null

  if (!employee) return null
  if (!employee.is_active) return null

  // Role/branch come from JWT app_metadata — not the employees table
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: employee.full_name,
    role: jwtRole ?? 'employee',
    position: employee.position,
    branch_id: jwtBranchId,
  }
}
