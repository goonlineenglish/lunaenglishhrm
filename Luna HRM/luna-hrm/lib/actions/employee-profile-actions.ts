'use server'

/**
 * Employee profile update action — extended personal/bank/qualification fields.
 * Only admin + BM can update. BM scoped to own branch employees.
 * Extracted from employee-actions.ts to keep file sizes under 200 lines.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { Employee } from '@/lib/types/database'

/** Allowed extended profile fields — prevents updating role/position/branch via this action */
const PROFILE_FIELDS = new Set([
  'date_of_birth', 'id_number', 'id_issue_date', 'id_issue_place',
  'address', 'emergency_contact', 'bank_account_number', 'bank_name',
  'nationality', 'qualifications', 'teaching_license', 'characteristics', 'phone',
])

export async function updateEmployeeProfile(
  id: string,
  fields: Record<string, unknown>
): Promise<ActionResult<Employee>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canEdit) return { success: false, error: 'Bạn không có quyền cập nhật hồ sơ nhân viên.' }

    // Filter to only allowed profile keys — prevent privilege escalation
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([k]) => PROFILE_FIELDS.has(k))
    )
    if (Object.keys(safeFields).length === 0) {
      return { success: false, error: 'Không có trường hồ sơ hợp lệ để cập nhật.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: branch scope check
    if (user.roles.includes('branch_manager') && !user.roles.includes('admin')) {
      const { data: existing } = await sb
        .from('employees').select('branch_id').eq('id', id).maybeSingle()
      const e = existing as { branch_id: string | null } | null
      if (e?.branch_id !== user.branch_id) {
        return { success: false, error: 'Bạn không có quyền cập nhật hồ sơ nhân viên này.' }
      }
    }

    const { data: employee, error } = await sb
      .from('employees').update(safeFields).eq('id', id).select().single()

    if (error) throw error
    return { success: true, data: employee as Employee }
  } catch (err) {
    console.error('[updateEmployeeProfile]', err)
    return { success: false, error: 'Không thể cập nhật hồ sơ nhân viên.' }
  }
}
