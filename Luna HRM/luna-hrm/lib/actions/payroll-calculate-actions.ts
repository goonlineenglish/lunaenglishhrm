'use server'

/**
 * Actions for initializing payslips in semi-manual mode.
 * initializePayslips: create payslip rows with auto-filled attendance + pre-filled data.
 * reinitializePayslips: re-run initialization, preserving is_reviewed=true rows unless forced.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import {
  initializePayslipData,
  calculateTeachingPay,
  calculateSubstitutePay,
} from '@/lib/services/payroll-calculation-service'
import { fetchPrefillData } from '@/lib/services/payroll-prefill-service'
import {
  countTeachingSessions,
  countOfficeDays,
  getSubstituteSessions,
} from '@/lib/services/payroll-session-counter'
import type { PayrollPeriod } from '@/lib/types/database'
import type { ActionResult } from '@/lib/actions/employee-actions'
import { getMonthBounds } from '@/lib/utils/date-helpers'

type EmployeeRow = {
  id: string
  full_name: string
  employee_code: string
  position: string
  rate_per_session: number
  sub_rate: number
  has_labor_contract: boolean
  dependent_count: number
}

/** Sync period total_gross / total_net from current payslip rows. Exported for reuse in payslip actions. */
export async function syncPeriodTotals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  periodId: string
): Promise<void> {
  const { data, error: fetchErr } = await sb
    .from('payslips')
    .select('gross_pay, net_pay')
    .eq('payroll_period_id', periodId)

  if (fetchErr) throw new Error(`[syncPeriodTotals] fetch failed: ${fetchErr.message}`)

  const rows = (data ?? []) as { gross_pay: number; net_pay: number }[]
  const totalGross = rows.reduce((s, r) => s + (r.gross_pay ?? 0), 0)
  const totalNet = rows.reduce((s, r) => s + (r.net_pay ?? 0), 0)

  const { error: updateErr } = await sb
    .from('payroll_periods')
    .update({ total_gross: totalGross, total_net: totalNet, updated_at: new Date().toISOString() })
    .eq('id', periodId)

  if (updateErr) throw new Error(`[syncPeriodTotals] update failed: ${updateErr.message}`)
}

// ─── Initialize payslips ──────────────────────────────────────────────────────

/**
 * Create / upsert payslip rows for all active employees in a draft period.
 * Auto-fills: sessions_worked, rate_per_session, teaching_pay, substitute_pay.
 * Pre-fills: kpi_bonus, allowances, deductions, penalties, other_pay.
 * Zeros: bhxh, bhyt, bhtn, tncn, gross_pay, net_pay (accountant fills manually).
 * Skips employees who already have is_reviewed=true (use reinitializePayslips to force).
 */
export async function initializePayslips(
  periodId: string
): Promise<ActionResult<{ created: number; skipped: number }>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return { success: false, error: 'Bạn không có quyền khởi tạo bảng lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Fetch period (must be draft)
    const { data: periodRow, error: periodErr } = await sb
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle()

    if (periodErr) throw periodErr
    if (!periodRow) return { success: false, error: 'Không tìm thấy kỳ lương.' }

    const period = periodRow as PayrollPeriod
    if (period.status !== 'draft') {
      return { success: false, error: 'Chỉ có thể khởi tạo kỳ lương ở trạng thái nháp.' }
    }

    // Branch guard: accountant can only init their own branch
    if (user.role === 'accountant' && user.branch_id && period.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền khởi tạo kỳ lương này.' }
    }

    const { startDate, endDate } = getMonthBounds(period.month, period.year)

    // Fetch active employees for this branch
    const { data: empRows, error: empErr } = await sb
      .from('employees')
      .select('id, full_name, employee_code, position, rate_per_session, sub_rate, has_labor_contract, dependent_count')
      .eq('branch_id', period.branch_id)
      .eq('is_active', true)

    if (empErr) throw empErr
    const employees = (empRows ?? []) as EmployeeRow[]

    // Fetch existing payslips to check is_reviewed status
    const { data: existingRows } = await sb
      .from('payslips')
      .select('id, employee_id, is_reviewed')
      .eq('payroll_period_id', periodId)

    type ExistingPayslip = { id: string; employee_id: string; is_reviewed: boolean }
    const existingMap = new Map<string, ExistingPayslip>()
    for (const p of ((existingRows as unknown[]) ?? [])) {
      const row = p as ExistingPayslip
      existingMap.set(row.employee_id, row)
    }

    let created = 0
    let skipped = 0

    // Parallelize across employees (each employee's sub-queries already use Promise.all internally)
    const results = await Promise.all(employees.map(async (emp) => {
      const existing = existingMap.get(emp.id)

      // Skip employees already reviewed — preserves accountant's manual work
      if (existing?.is_reviewed) return { result: 'skipped' as const }

      const isOffice = emp.position === 'office' || emp.position === 'admin'
      const isAssistant = emp.position === 'assistant'
      const payslipPosition = isOffice ? 'office' : isAssistant ? 'assistant' : 'teacher'

      const [sessionsWorked, substituteSessions, prefill] = await Promise.all([
        isOffice
          ? countOfficeDays(sb, emp.id, startDate, endDate)
          : countTeachingSessions(sb, emp.id, startDate, endDate),
        getSubstituteSessions(sb, emp.id, startDate, endDate),
        fetchPrefillData(sb, emp.id, startDate, endDate),
      ])

      const initData = initializePayslipData(
        { position: payslipPosition, sessionsWorked, ratePerSession: emp.rate_per_session, substituteSessions, substituteRate: emp.sub_rate },
        prefill
      )

      const payslipData = {
        payroll_period_id: periodId,
        employee_id: emp.id,
        branch_id: period.branch_id,
        position: payslipPosition,
        sessions_worked: initData.sessions_worked,
        rate_per_session: initData.rate_per_session,
        teaching_pay: initData.teaching_pay,
        substitute_sessions: initData.substitute_sessions,
        substitute_rate: initData.substitute_rate,
        substitute_pay: initData.substitute_pay,
        other_pay: initData.other_pay,
        kpi_bonus: initData.kpi_bonus,
        allowances: initData.allowances,
        deductions: initData.deductions,
        penalties: initData.penalties,
        gross_pay: 0,
        bhxh: 0,
        bhyt: 0,
        bhtn: 0,
        tncn: 0,
        net_pay: 0,
        extra_notes: null,
        is_reviewed: false,
      }

      if (existing) {
        const { error: updateErr } = await sb.from('payslips').update(payslipData).eq('id', existing.id)
        if (updateErr) throw new Error(`Payslip update failed for ${emp.employee_code}: ${updateErr.message}`)
      } else {
        const { error: insertErr } = await sb.from('payslips').insert(payslipData)
        if (insertErr) throw new Error(`Payslip insert failed for ${emp.employee_code}: ${insertErr.message}`)
      }
      return { result: 'created' as const }
    }))

    for (const r of results) {
      if (r.result === 'skipped') skipped++
      else created++
    }

    await syncPeriodTotals(sb, periodId)
    return { success: true, data: { created, skipped } }
  } catch (err) {
    console.error('[initializePayslips]', err)
    return { success: false, error: 'Không thể khởi tạo bảng lương.' }
  }
}

// ─── Re-initialize payslips (force refresh) ───────────────────────────────────

/**
 * Force re-initialize all payslip rows, including is_reviewed=true ones.
 * Resets is_reviewed to false on all rows.
 * Use when attendance data changes after initial initialization.
 */
export async function reinitializePayslips(
  periodId: string
): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'accountant') {
      return { success: false, error: 'Bạn không có quyền khởi tạo lại bảng lương.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: periodRow, error: periodErr } = await sb
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle()

    if (periodErr) throw periodErr
    if (!periodRow) return { success: false, error: 'Không tìm thấy kỳ lương.' }

    const period = periodRow as PayrollPeriod
    if (period.status !== 'draft') {
      return { success: false, error: 'Chỉ có thể khởi tạo lại kỳ lương đang ở trạng thái nháp.' }
    }

    // Branch guard: accountant can only reinit their own branch
    if (user.role === 'accountant' && user.branch_id && period.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền khởi tạo lại kỳ lương này.' }
    }

    const { startDate, endDate } = getMonthBounds(period.month, period.year)

    const { data: empRows, error: empErr } = await sb
      .from('employees')
      .select('id, full_name, employee_code, position, rate_per_session, sub_rate, has_labor_contract, dependent_count')
      .eq('branch_id', period.branch_id)
      .eq('is_active', true)

    if (empErr) throw empErr
    const employees = (empRows ?? []) as EmployeeRow[]

    const { data: existingRows } = await sb
      .from('payslips')
      .select('id, employee_id')
      .eq('payroll_period_id', periodId)

    type ExistingRow = { id: string; employee_id: string }
    const existingMap = new Map<string, ExistingRow>()
    for (const p of ((existingRows as unknown[]) ?? [])) {
      const row = p as ExistingRow
      existingMap.set(row.employee_id, row)
    }

    // Parallelize across employees
    await Promise.all(employees.map(async (emp) => {
      const isOffice = emp.position === 'office' || emp.position === 'admin'
      const isAssistant = emp.position === 'assistant'
      const payslipPosition = isOffice ? 'office' : isAssistant ? 'assistant' : 'teacher'

      const [sessionsWorked, substituteSessions, prefill] = await Promise.all([
        isOffice
          ? countOfficeDays(sb, emp.id, startDate, endDate)
          : countTeachingSessions(sb, emp.id, startDate, endDate),
        getSubstituteSessions(sb, emp.id, startDate, endDate),
        fetchPrefillData(sb, emp.id, startDate, endDate),
      ])

      const initData = initializePayslipData(
        { position: payslipPosition, sessionsWorked, ratePerSession: emp.rate_per_session, substituteSessions, substituteRate: emp.sub_rate },
        prefill
      )

      const payslipData = {
        payroll_period_id: periodId,
        employee_id: emp.id,
        branch_id: period.branch_id,
        position: payslipPosition,
        sessions_worked: initData.sessions_worked,
        rate_per_session: initData.rate_per_session,
        teaching_pay: initData.teaching_pay,
        substitute_sessions: initData.substitute_sessions,
        substitute_rate: initData.substitute_rate,
        substitute_pay: initData.substitute_pay,
        other_pay: initData.other_pay,
        kpi_bonus: initData.kpi_bonus,
        allowances: initData.allowances,
        deductions: initData.deductions,
        penalties: initData.penalties,
        gross_pay: 0,
        bhxh: 0,
        bhyt: 0,
        bhtn: 0,
        tncn: 0,
        net_pay: 0,
        extra_notes: null,
        is_reviewed: false,  // force reset
      }

      const existing = existingMap.get(emp.id)
      if (existing) {
        const { error: updateErr } = await sb.from('payslips').update(payslipData).eq('id', existing.id)
        if (updateErr) throw new Error(`Reinit update failed for ${emp.employee_code}: ${updateErr.message}`)
      } else {
        const { error: insertErr } = await sb.from('payslips').insert(payslipData)
        if (insertErr) throw new Error(`Reinit insert failed for ${emp.employee_code}: ${insertErr.message}`)
      }
    }))

    await syncPeriodTotals(sb, periodId)
    return { success: true, data: { count: employees.length } }
  } catch (err) {
    console.error('[reinitializePayslips]', err)
    return { success: false, error: 'Không thể khởi tạo lại bảng lương.' }
  }
}

// Keep re-exporting teaching/substitute pay helpers for UI use
export { calculateTeachingPay, calculateSubstitutePay }
