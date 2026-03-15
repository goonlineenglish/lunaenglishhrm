'use server'

/**
 * Batch import employees from parsed Excel data.
 * Creates auth user + employee record for each row.
 * Auth rollback on batch DB insert failure.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, createAuthUser, deleteAuthUser } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logAudit } from '@/lib/services/audit-log-service'
import type { ParsedEmployee } from '@/lib/utils/excel-employee-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeImportResult {
  success: boolean
  imported_count: number
  errors: { employee_code: string; message: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMPORT_ROWS = 200
const DEFAULT_PASSWORD = 'Luna@2026'
const BM_ALLOWED_ROLES = new Set(['employee'])

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Batch import employees from parsed Excel rows.
 * Admin: pass any branchId. BM: branchId is always overridden to own branch.
 * Auth users created sequentially; DB insert batched; rollback on batch failure.
 */
export async function batchImportEmployees(
  rows: ParsedEmployee[],
  branchId: string
): Promise<EmployeeImportResult> {
  const errors: { employee_code: string; message: string }[] = []

  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, imported_count: 0, errors: [{ employee_code: '', message: 'Chưa đăng nhập.' }] }
    }

    const canImport = user.role === 'admin' || user.role === 'branch_manager'
    if (!canImport) {
      return { success: false, imported_count: 0, errors: [{ employee_code: '', message: 'Bạn không có quyền nhập nhân viên.' }] }
    }

    // Server-side row limit
    if (rows.length > MAX_IMPORT_ROWS) {
      return {
        success: false,
        imported_count: 0,
        errors: [{ employee_code: '', message: `Tối đa ${MAX_IMPORT_ROWS} nhân viên mỗi lần nhập.` }],
      }
    }

    // BM always uses own branch
    const effectiveBranch = user.role === 'branch_manager' ? (user.branch_id ?? '') : branchId
    if (!effectiveBranch) {
      return { success: false, imported_count: 0, errors: [{ employee_code: '', message: 'Chưa chọn chi nhánh.' }] }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Pre-validate: existing employee_codes in this branch (per-branch uniqueness)
    const { data: existingInBranch, error: codeErr } = await sb
      .from('employees')
      .select('employee_code')
      .eq('branch_id', effectiveBranch)
    if (codeErr) throw codeErr
    const existingCodes = new Set(
      ((existingInBranch ?? []) as { employee_code: string }[]).map((e) => e.employee_code)
    )

    // Pre-validate: check only candidate emails via admin client (ISSUE-3+ISSUE-2 fix)
    // Admin client bypasses BM RLS; targeted IN query avoids full-table scan per chunk
    const adminSb = createAdminClient()
    const candidateEmails = rows.map((r) => r.email.toLowerCase())
    const { data: allEmps, error: emailErr } = await adminSb
      .from('employees')
      .select('email')
      .in('email', candidateEmails)
    if (emailErr) throw emailErr
    const existingEmails = new Set(
      ((allEmps ?? []) as { email: string }[]).map((e) => e.email.toLowerCase())
    )

    // Filter valid rows + reject BM trying to import non-employee roles
    const validRows: ParsedEmployee[] = []
    for (const row of rows) {
      if (user.role === 'branch_manager' && !BM_ALLOWED_ROLES.has(row.role)) {
        errors.push({ employee_code: row.employee_code, message: `BM không được nhập vai trò "${row.role}".` })
        continue
      }
      if (existingCodes.has(row.employee_code)) {
        errors.push({ employee_code: row.employee_code, message: `Mã NV "${row.employee_code}" đã tồn tại trong chi nhánh.` })
        continue
      }
      if (existingEmails.has(row.email.toLowerCase())) {
        errors.push({ employee_code: row.employee_code, message: `Email "${row.email}" đã tồn tại.` })
        continue
      }
      validRows.push(row)
    }

    if (validRows.length === 0) {
      return { success: true, imported_count: 0, errors }
    }

    // Auth user creation loop (sequential — Supabase admin API rate limit)
    const created: { authUserId: string; row: ParsedEmployee }[] = []
    for (const row of validRows) {
      try {
        const authUser = await createAuthUser({
          email: row.email,
          password: DEFAULT_PASSWORD,
          role: row.role as 'admin' | 'branch_manager' | 'accountant' | 'employee',
          branchId: effectiveBranch,
        })
        created.push({ authUserId: authUser.id, row })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        const friendly =
          msg.includes('already registered') || msg.includes('already been registered')
            ? `Email "${row.email}" đã tồn tại trong hệ thống auth.`
            : `Không thể tạo tài khoản cho "${row.employee_code}": ${msg}`
        errors.push({ employee_code: row.employee_code, message: friendly })
      }
    }

    if (created.length === 0) {
      return { success: true, imported_count: 0, errors }
    }

    // Batch DB insert
    const insertRows = created.map(({ authUserId, row }) => ({
      id: authUserId,
      employee_code: row.employee_code,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      position: row.position,
      role: row.role,
      branch_id: effectiveBranch,
      rate_per_session: row.rate_per_session,
      sub_rate: row.sub_rate,
      has_labor_contract: row.has_labor_contract,
      dependent_count: row.dependent_count,
      is_active: true,
      join_date: row.join_date ?? new Date().toISOString().split('T')[0],
      id_number: row.id_number,
      id_issue_date: row.id_issue_date,
      id_issue_place: row.id_issue_place,
      date_of_birth: row.date_of_birth,
      address: row.address,
      emergency_contact: row.emergency_contact,
      bank_account_number: row.bank_account_number,
      bank_name: row.bank_name,
      nationality: row.nationality,
      qualifications: row.qualifications,
      teaching_license: row.teaching_license,
      characteristics: row.characteristics,
    }))

    const { error: insertErr } = await sb.from('employees').insert(insertRows)
    if (insertErr) {
      // Rollback: delete all created auth users to avoid orphaned auth records
      await Promise.all(
        created.map(({ authUserId }) =>
          deleteAuthUser(authUserId).catch((e) =>
            console.error('[batchImportEmployees] auth rollback failed:', e)
          )
        )
      )
      throw insertErr
    }

    // Fire-and-forget audit log
    logAudit({
      tableName: 'employees',
      recordId: effectiveBranch,
      action: 'INSERT',
      userId: user.id,
      userEmail: user.email,
      newData: { batch_count: created.length, source: 'excel_import' },
    })

    return { success: true, imported_count: created.length, errors }
  } catch (err) {
    console.error('[batchImportEmployees]', err)
    return {
      success: false,
      imported_count: 0,
      errors: [...errors, { employee_code: '', message: 'Lỗi nhập liệu.' }],
    }
  }
}
