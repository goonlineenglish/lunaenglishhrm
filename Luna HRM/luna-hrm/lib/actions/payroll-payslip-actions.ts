'use server'

/**
 * Server actions for payslip queries and manual field updates.
 * Semi-manual mode: accountant enters bhxh/bhyt/bhtn/tncn/gross/net directly.
 * batchUpdatePayslips: bulk update editable fields + field-level audit log.
 * markPayslipsReviewed: mark rows as reviewed, gating confirmPayrollPeriod.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { buildAuditLogEntries, insertAuditLogs } from '@/lib/services/payroll-audit-service'
import { syncPeriodTotals } from '@/lib/actions/payroll-calculate-actions'
import { hasAnyRole } from '@/lib/types/user'
import type { Payslip } from '@/lib/types/database'
import type { EditablePayslipFields, ClassBreakdownEntry } from '@/lib/types/database-payroll-types'
import type { ActionResult } from '@/lib/actions/employee-actions'

// ─── Extended types ───────────────────────────────────────────────────────────

export interface PayslipWithEmployee extends Payslip {
  employee_name: string
  employee_code: string
  employee_position: string
}

export interface PayslipBatchItem {
  payslip_id: string
  fields: EditablePayslipFields
}

// ─── Get payslips by period ───────────────────────────────────────────────────

export async function getPayslipsByPeriod(
  periodId: string
): Promise<ActionResult<PayslipWithEmployee[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền xem phiếu lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('payslips')
      .select('*, employees(full_name, employee_code, position)')
      .eq('payroll_period_id', periodId)
      .order('created_at')

    if (error) throw error

    const payslips: PayslipWithEmployee[] = ((data as unknown[]) ?? []).map((row) => {
      const r = row as Payslip & { employees: { full_name: string; employee_code: string; position: string } | null }
      const { employees, ...rest } = r
      return {
        ...rest,
        employee_name: employees?.full_name ?? '',
        employee_code: employees?.employee_code ?? '',
        employee_position: employees?.position ?? '',
      }
    })

    return { success: true, data: payslips }
  } catch (err) {
    console.error('[getPayslipsByPeriod]', err)
    return { success: false, error: 'Không thể tải danh sách phiếu lương.' }
  }
}

// ─── Get single payslip detail ────────────────────────────────────────────────

export async function getPayslipDetail(
  payslipId: string
): Promise<ActionResult<PayslipWithEmployee>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền xem phiếu lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('payslips')
      .select('*, employees(full_name, employee_code, position)')
      .eq('id', payslipId)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy phiếu lương.' }

    const r = data as Payslip & { employees: { full_name: string; employee_code: string; position: string } | null }
    const { employees, ...rest } = r
    return {
      success: true,
      data: {
        ...rest,
        employee_name: employees?.full_name ?? '',
        employee_code: employees?.employee_code ?? '',
        employee_position: employees?.position ?? '',
      },
    }
  } catch (err) {
    console.error('[getPayslipDetail]', err)
    return { success: false, error: 'Không thể tải phiếu lương.' }
  }
}

// ─── Editable field whitelist (ISSUE-6: runtime security) ─────────────────────

const EDITABLE_KEYS = ['kpi_bonus', 'allowances', 'deductions', 'penalties', 'other_pay', 'bhxh', 'bhyt', 'bhtn', 'tncn', 'gross_pay', 'net_pay', 'extra_notes', 'class_breakdown', 'teaching_pay', 'sessions_worked'] as const
const NUMERIC_EDITABLE_KEYS = new Set<string>(['kpi_bonus', 'allowances', 'deductions', 'penalties', 'other_pay', 'bhxh', 'bhyt', 'bhtn', 'tncn', 'gross_pay', 'net_pay', 'teaching_pay', 'sessions_worked'])
const MAX_BATCH_SIZE = 200

/** Whitelist + validate a single item's fields. Returns sanitized object or error string. */
function sanitizeBatchFields(fields: Record<string, unknown>): EditablePayslipFields | string {
  const safe: Record<string, unknown> = {}
  for (const k of EDITABLE_KEYS) {
    if (!(k in fields)) continue
    const v = fields[k]

    // JSONB validation for class_breakdown
    if (k === 'class_breakdown') {
      if (!Array.isArray(v)) return 'class_breakdown phải là mảng.'
      if ((v as unknown[]).length > 50) return 'class_breakdown quá lớn (tối đa 50 lớp).'
      const validated: ClassBreakdownEntry[] = []
      for (const entry of v as ClassBreakdownEntry[]) {
        if (typeof entry.sessions !== 'number' || entry.sessions < 0) return 'class_breakdown: sessions không hợp lệ.'
        if (typeof entry.rate !== 'number' || entry.rate < 0) return 'class_breakdown: rate không hợp lệ.'
        if (typeof entry.class_code !== 'string' || !entry.class_code.trim()) return 'class_breakdown: class_code không hợp lệ.'
        if (typeof entry.class_name !== 'string') return 'class_breakdown: class_name không hợp lệ.'
        // Server-side recalculation — never trust client-sent amount
        validated.push({ ...entry, amount: entry.sessions * entry.rate })
      }
      safe[k] = validated
      continue
    }

    if (NUMERIC_EDITABLE_KEYS.has(k)) {
      if (v !== undefined && v !== null && (typeof v !== 'number' || !isFinite(v as number))) {
        return `Giá trị ${k} không hợp lệ.`
      }
    }
    safe[k] = v
  }
  return safe as unknown as EditablePayslipFields
}

// ─── Batch update payslip editable fields ─────────────────────────────────────

/**
 * Bulk update editable fields for multiple payslips in one action call.
 * Validates period is draft. Logs field-level changes to payslip_audit_logs.
 * Sets is_reviewed=true on each successfully saved row.
 */
export async function batchUpdatePayslips(
  periodId: string,
  items: PayslipBatchItem[]
): Promise<ActionResult<{ updatedCount: number }>> {
  if (items.length === 0) return { success: true, data: { updatedCount: 0 } }
  if (items.length > MAX_BATCH_SIZE) {
    return { success: false, error: 'Quá nhiều phiếu lương trong một lần cập nhật.' }
  }

  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền chỉnh sửa phiếu lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Verify period is draft
    const { data: periodRow, error: periodErr } = await sb
      .from('payroll_periods')
      .select('status, branch_id')
      .eq('id', periodId)
      .maybeSingle()

    if (periodErr) throw periodErr
    if (!periodRow) return { success: false, error: 'Không tìm thấy kỳ lương.' }

    const pRow = periodRow as { status: string; branch_id: string }
    if (pRow.status !== 'draft') {
      return { success: false, error: 'Phiếu lương đã xác nhận, không thể chỉnh sửa.' }
    }

    // Branch guard: BM+accountant hybrid is branch-scoped; pure accountant is global (ISSUE-4)
    if (user.roles.includes('branch_manager') && user.branch_id && pRow.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền chỉnh sửa kỳ lương này.' }
    }

    // Sanitize + validate all items before any DB writes (ISSUE-5, ISSUE-6)
    const sanitizedItems: { payslip_id: string; fields: EditablePayslipFields }[] = []
    for (const item of items) {
      const result = sanitizeBatchFields(item.fields as unknown as Record<string, unknown>)
      if (typeof result === 'string') return { success: false, error: result }
      sanitizedItems.push({ payslip_id: item.payslip_id, fields: result })
    }

    // Fetch current values for all payslips in batch (for audit diff)
    const payslipIds = sanitizedItems.map((i) => i.payslip_id)
    const { data: currentRows, error: fetchErr } = await sb
      .from('payslips')
      .select('id, payroll_period_id, kpi_bonus, allowances, deductions, penalties, other_pay, bhxh, bhyt, bhtn, tncn, gross_pay, net_pay, extra_notes')
      .in('id', payslipIds)

    if (fetchErr) throw fetchErr

    type CurrentRow = EditablePayslipFields & { id: string; payroll_period_id: string }
    const currentMap = new Map<string, CurrentRow>()
    for (const row of ((currentRows as unknown[]) ?? [])) {
      const r = row as CurrentRow
      // Verify payslip belongs to this period (security check)
      if (r.payroll_period_id !== periodId) continue
      currentMap.set(r.id, r)
    }

    // Parallelize updates across rows (ISSUE-3)
    const results = await Promise.all(sanitizedItems.map(async (item) => {
      const current = currentMap.get(item.payslip_id)
      if (!current) return false  // payslip not found or belongs to different period

      // Build audit log entries (only changed fields)
      const auditEntries = buildAuditLogEntries(item.payslip_id, current, item.fields, user.id)

      // Update payslip fields + mark as reviewed
      const { error: updateErr } = await sb
        .from('payslips')
        .update({ ...item.fields, is_reviewed: true, updated_at: new Date().toISOString() })
        .eq('id', item.payslip_id)

      if (updateErr) throw new Error(`Update failed for payslip ${item.payslip_id}: ${updateErr.message}`)

      // Fire-and-forget audit log
      void insertAuditLogs(auditEntries)
      return true
    }))

    const updatedCount = results.filter(Boolean).length

    // Sync period totals using shared helper (avoids DRY violation)
    await syncPeriodTotals(sb, periodId)

    return { success: true, data: { updatedCount } }
  } catch (err) {
    console.error('[batchUpdatePayslips]', err)
    return { success: false, error: 'Không thể cập nhật phiếu lương.' }
  }
}

// ─── Mark payslips as reviewed ────────────────────────────────────────────────

/**
 * Explicitly mark specific payslips as reviewed without changing field values.
 * Used when accountant confirms a row is correct without edits.
 */
export async function markPayslipsReviewed(
  periodId: string,
  payslipIds: string[]
): Promise<ActionResult<{ count: number }>> {
  if (payslipIds.length === 0) return { success: true, data: { count: 0 } }

  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền xác nhận phiếu lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Verify period is draft
    const { data: periodRow, error: periodErr } = await sb
      .from('payroll_periods')
      .select('status, branch_id')
      .eq('id', periodId)
      .maybeSingle()

    if (periodErr) throw periodErr
    if (!periodRow) return { success: false, error: 'Không tìm thấy kỳ lương.' }

    const mRow = periodRow as { status: string; branch_id: string }
    if (mRow.status !== 'draft') {
      return { success: false, error: 'Kỳ lương đã xác nhận, không thể thay đổi.' }
    }

    // Branch guard: BM+accountant hybrid is branch-scoped; pure accountant is global (ISSUE-4)
    if (user.roles.includes('branch_manager') && user.branch_id && mRow.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền xác nhận kỳ lương này.' }
    }

    // Only update payslips that belong to this period (security: filter by both)
    const { error, count } = await sb
      .from('payslips')
      .update({ is_reviewed: true, updated_at: new Date().toISOString() })
      .eq('payroll_period_id', periodId)
      .in('id', payslipIds)

    if (error) throw error

    return { success: true, data: { count: count ?? payslipIds.length } }
  } catch (err) {
    console.error('[markPayslipsReviewed]', err)
    return { success: false, error: 'Không thể đánh dấu đã kiểm tra.' }
  }
}

// ─── Legacy: single payslip manual field update ───────────────────────────────

/**
 * @deprecated Use batchUpdatePayslips instead.
 * Kept for backward compatibility with existing UI components (Phase 4 will remove).
 */
export async function updatePayslipManualFields(
  payslipId: string,
  data: { other_pay?: number; penalties?: number; extra_notes?: string | null }
): Promise<ActionResult<unknown>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập.' }
  // Role check before any DB access
  if (!hasAnyRole(user, 'admin', 'accountant')) {
    return { success: false, error: 'Bạn không có quyền chỉnh sửa phiếu lương.' }
  }

  // Delegate to batchUpdatePayslips with single item
  // We need the periodId — fetch it first
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: ps } = await sb
    .from('payslips')
    .select('payroll_period_id')
    .eq('id', payslipId)
    .maybeSingle()

  if (!ps) return { success: false, error: 'Không tìm thấy phiếu lương.' }

  const result = await batchUpdatePayslips((ps as { payroll_period_id: string }).payroll_period_id, [
    { payslip_id: payslipId, fields: data },
  ])
  if (!result.success) return result
  return { success: true }
}
