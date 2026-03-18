'use server'

/**
 * Actions for initializing payslips in semi-manual mode.
 * initializePayslips: create payslip rows with auto-filled attendance + pre-filled data.
 * reinitializePayslips: re-run initialization, preserving is_reviewed=true rows unless forced.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import {
  calculateTeachingPay,
  calculateSubstitutePay,
} from '@/lib/services/payroll-calculation-service'
import { fetchPrefillData, fetchPrefillDataBatch } from '@/lib/services/payroll-prefill-service'
import {
  countTeachingSessions,
  countOfficeDays,
  getSubstituteSessions,
} from '@/lib/services/payroll-session-counter'
import type { PayrollPeriod } from '@/lib/types/database'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { ClassBreakdownEntry } from '@/lib/types/database-payroll-types'
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

/**
 * Build class_breakdown[] for a teaching employee.
 * Queries attendance per class for the payroll month,
 * resolves rate from schedule or employee default.
 */
async function buildClassBreakdown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  employeeId: string,
  branchId: string,
  position: string,
  defaultRate: number,
  startDate: string,
  endDate: string
): Promise<ClassBreakdownEntry[]> {
  const roleCol = position === 'teacher' ? 'teacher_id' : 'assistant_id'
  const rateCol = position === 'teacher' ? 'teacher_rate' : 'assistant_rate'

  // Do NOT filter by status='active' — deactivated classes with attendance in month must still appear
  const { data: schedules, error: schErr } = await sb
    .from('class_schedules')
    .select(`id, class_code, class_name, ${rateCol}`)
    .eq('branch_id', branchId)
    .eq(roleCol, employeeId)

  if (schErr) throw schErr
  if (!schedules?.length) return []

  const scheduleIds = schedules.map((s: any) => s.id) // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: rows, error: attErr } = await sb
    .from('attendance')
    .select('schedule_id, status')
    .eq('employee_id', employeeId)
    .in('schedule_id', scheduleIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  if (attErr) throw attErr

  const sessionMap = new Map<string, number>()
  for (const row of rows ?? []) {
    const current = sessionMap.get(row.schedule_id) ?? 0
    sessionMap.set(row.schedule_id, current + (row.status === '0.5' ? 0.5 : 1))
  }

  return schedules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((sch: any) => {
      const sessions = sessionMap.get(sch.id) ?? 0
      const rate = sch[rateCol] ?? defaultRate
      return {
        class_code: sch.class_code,
        class_name: sch.class_name,
        sessions,
        rate,
        amount: sessions * rate,
        default_sessions: sessions,
        default_rate: rate,
      }
    })
    .filter((e: ClassBreakdownEntry) => e.sessions > 0) // Intentional: classes with 0 sessions produce 0 pay, omit from breakdown. Accountant can override totals via summary row if needed.
    .sort((a: ClassBreakdownEntry, b: ClassBreakdownEntry) => a.class_code.localeCompare(b.class_code))
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
    if (!hasAnyRole(user, 'admin', 'accountant')) {
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

    // Branch guard: BM+accountant hybrid is branch-scoped; pure accountant is global (ISSUE-4)
    if (user.roles.includes('branch_manager') && user.branch_id && period.branch_id !== user.branch_id) {
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

    // Fetch existing payslips to check is_reviewed status and class_breakdown population
    const { data: existingRows } = await sb
      .from('payslips')
      .select('id, employee_id, is_reviewed, class_breakdown')
      .eq('payroll_period_id', periodId)

    type ExistingPayslip = { id: string; employee_id: string; is_reviewed: boolean; class_breakdown: unknown[] | null }
    const existingMap = new Map<string, ExistingPayslip>()
    for (const p of ((existingRows as unknown[]) ?? [])) {
      const row = p as ExistingPayslip
      existingMap.set(row.employee_id, row)
    }

    let created = 0
    let skipped = 0

    // Batch-fetch all prefill data upfront (3 queries for all employees vs N×5 per-employee)
    const prefillMap = await fetchPrefillDataBatch(sb, employees.map(e => e.id), startDate, endDate)

    // Parallelize across employees (prefill data already loaded in batch)
    const results = await Promise.all(employees.map(async (emp) => {
      const existing = existingMap.get(emp.id)

      // Skip only if reviewed AND class_breakdown is already populated.
      // Reviewed rows with empty breakdown (e.g. payslips created before migration 009)
      // still need a partial update to show per-class rows in the spreadsheet.
      const existingHasBreakdown = Array.isArray(existing?.class_breakdown) && (existing.class_breakdown as unknown[]).length > 0
      if (existing?.is_reviewed && existingHasBreakdown) return { result: 'skipped' as const }

      const isOffice = emp.position === 'office' || emp.position === 'admin'
      const isTeaching = emp.position === 'teacher' || emp.position === 'assistant'
      const isAssistant = emp.position === 'assistant'
      const payslipPosition = isOffice ? 'office' : isAssistant ? 'assistant' : 'teacher'

      let classBreakdown: ClassBreakdownEntry[] = []
      let sessionsWorked: number
      let teachingPay: number

      const [substituteSessions, prefill] = await Promise.all([
        getSubstituteSessions(sb, emp.id, startDate, endDate),
        // Use batch-fetched prefill data (no per-employee query needed)
        Promise.resolve(prefillMap.get(emp.id) ?? { kpi_bonus: 0, allowances: 0, deductions: 0, penalties: 0, other_pay: 0 }),
      ])

      if (isTeaching) {
        classBreakdown = await buildClassBreakdown(
          sb, emp.id, period.branch_id, emp.position,
          emp.rate_per_session, startDate, endDate
        )
        sessionsWorked = classBreakdown.reduce((sum, e) => sum + e.sessions, 0)
        teachingPay = classBreakdown.reduce((sum, e) => sum + e.amount, 0)
      } else {
        sessionsWorked = await countOfficeDays(sb, emp.id, startDate, endDate)
        teachingPay = sessionsWorked * emp.rate_per_session
      }

      // Weighted average rate for multi-class teachers; fallback to employee default
      const effectiveRate = isTeaching && sessionsWorked > 0
        ? Math.round(teachingPay / sessionsWorked)
        : emp.rate_per_session

      const substitutePay = calculateSubstitutePay(substituteSessions, emp.sub_rate)

      // Partial update path: reviewed but class_breakdown is empty (e.g. payslip predates migration 009).
      // Update ONLY class fields — never touch bhxh, bhyt, tncn, gross/net (accountant's manual work).
      if (existing?.is_reviewed && isTeaching) {
        const { error: patchErr } = await sb.from('payslips').update({
          class_breakdown: classBreakdown,
          sessions_worked: sessionsWorked,
          rate_per_session: effectiveRate,
          teaching_pay: teachingPay,
        }).eq('id', existing.id)
        if (patchErr) throw new Error(`Class breakdown patch failed for ${emp.employee_code}: ${patchErr.message}`)
        return { result: 'created' as const }
      }

      const payslipData = {
        payroll_period_id: periodId,
        employee_id: emp.id,
        branch_id: period.branch_id,
        position: payslipPosition,
        sessions_worked: sessionsWorked,
        rate_per_session: effectiveRate,
        teaching_pay: teachingPay,
        substitute_sessions: substituteSessions,
        substitute_rate: emp.sub_rate,
        substitute_pay: substitutePay,
        other_pay: prefill.other_pay,
        kpi_bonus: prefill.kpi_bonus,
        allowances: prefill.allowances,
        deductions: prefill.deductions,
        penalties: prefill.penalties,
        class_breakdown: classBreakdown,
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
    if (!hasAnyRole(user, 'admin', 'accountant')) {
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

    // Branch guard: BM+accountant hybrid is branch-scoped; pure accountant is global (ISSUE-4)
    if (user.roles.includes('branch_manager') && user.branch_id && period.branch_id !== user.branch_id) {
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

    // Batch-fetch all prefill data upfront (3 queries for all employees vs N×5 per-employee)
    const prefillMap = await fetchPrefillDataBatch(sb, employees.map(e => e.id), startDate, endDate)

    // Parallelize across employees
    await Promise.all(employees.map(async (emp) => {
      const isOffice = emp.position === 'office' || emp.position === 'admin'
      const isTeaching = emp.position === 'teacher' || emp.position === 'assistant'
      const isAssistant = emp.position === 'assistant'
      const payslipPosition = isOffice ? 'office' : isAssistant ? 'assistant' : 'teacher'

      let classBreakdown: ClassBreakdownEntry[] = []
      let sessionsWorked: number
      let teachingPay: number

      const [substituteSessions, prefill] = await Promise.all([
        getSubstituteSessions(sb, emp.id, startDate, endDate),
        // Use batch-fetched prefill data (no per-employee query needed)
        Promise.resolve(prefillMap.get(emp.id) ?? { kpi_bonus: 0, allowances: 0, deductions: 0, penalties: 0, other_pay: 0 }),
      ])

      if (isTeaching) {
        classBreakdown = await buildClassBreakdown(
          sb, emp.id, period.branch_id, emp.position,
          emp.rate_per_session, startDate, endDate
        )
        sessionsWorked = classBreakdown.reduce((sum, e) => sum + e.sessions, 0)
        teachingPay = classBreakdown.reduce((sum, e) => sum + e.amount, 0)
      } else {
        sessionsWorked = await countOfficeDays(sb, emp.id, startDate, endDate)
        teachingPay = sessionsWorked * emp.rate_per_session
      }

      // Weighted average rate for multi-class teachers; fallback to employee default
      const effectiveRate = isTeaching && sessionsWorked > 0
        ? Math.round(teachingPay / sessionsWorked)
        : emp.rate_per_session

      const substitutePay = calculateSubstitutePay(substituteSessions, emp.sub_rate)

      const payslipData = {
        payroll_period_id: periodId,
        employee_id: emp.id,
        branch_id: period.branch_id,
        position: payslipPosition,
        sessions_worked: sessionsWorked,
        rate_per_session: effectiveRate,
        teaching_pay: teachingPay,
        substitute_sessions: substituteSessions,
        substitute_rate: emp.sub_rate,
        substitute_pay: substitutePay,
        other_pay: prefill.other_pay,
        kpi_bonus: prefill.kpi_bonus,
        allowances: prefill.allowances,
        deductions: prefill.deductions,
        penalties: prefill.penalties,
        class_breakdown: classBreakdown,
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
