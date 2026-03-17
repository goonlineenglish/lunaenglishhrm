'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { Branch, BranchInsert, BranchUpdate } from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ─── Get branches ─────────────────────────────────────────────────────────────

/**
 * Get branches scoped by role:
 * - admin: all branches
 * - branch_manager: own branch only
 * - accountant: all branches (read-only, needed for payroll)
 */
export async function getBranches(): Promise<ActionResult<Branch[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    if (hasAnyRole(user, 'admin', 'accountant')) {
      const { data, error } = await sb.from('branches').select('*').order('name')
      if (error) throw error
      return { success: true, data: (data ?? []) as Branch[] }
    }

    if (user.roles.includes('branch_manager') && user.branch_id) {
      const { data, error } = await sb
        .from('branches')
        .select('*')
        .eq('id', user.branch_id)
        .maybeSingle()
      if (error) throw error
      return { success: true, data: data ? [data as Branch] : [] }
    }

    return { success: false, error: 'Bạn không có quyền xem chi nhánh.' }
  } catch (err) {
    console.error('[getBranches]', err)
    return { success: false, error: 'Không thể tải danh sách chi nhánh.' }
  }
}

// ─── Create branch ────────────────────────────────────────────────────────────

/** Admin only: create a new branch */
export async function createBranch(
  data: BranchInsert
): Promise<ActionResult<Branch>> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.roles.includes('admin')) {
      return { success: false, error: 'Chỉ admin mới có thể tạo chi nhánh.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: branch, error } = await sb
      .from('branches')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: branch as Branch }
  } catch (err) {
    console.error('[createBranch]', err)
    return { success: false, error: 'Không thể tạo chi nhánh.' }
  }
}

// ─── Update branch ────────────────────────────────────────────────────────────

/** Admin only: update an existing branch */
export async function updateBranch(
  id: string,
  data: BranchUpdate
): Promise<ActionResult<Branch>> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.roles.includes('admin')) {
      return { success: false, error: 'Chỉ admin mới có thể sửa chi nhánh.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: branch, error } = await sb
      .from('branches')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: branch as Branch }
  } catch (err) {
    console.error('[updateBranch]', err)
    return { success: false, error: 'Không thể cập nhật chi nhánh.' }
  }
}
