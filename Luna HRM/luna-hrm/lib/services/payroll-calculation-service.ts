/**
 * Pure payroll calculation functions — no Supabase, no side effects.
 * Semi-manual mode: auto-fill attendance + rates, zero manual fields.
 * All currency values in VND, rounded with Math.round().
 */

import type { PayslipInitData, PrefillData } from '@/lib/types/database-payroll-types'

// ─── Employee snapshot type (from payroll-calculate-actions) ─────────────────

export interface EmployeeSnapshot {
  position: 'teacher' | 'assistant' | 'office'
  sessionsWorked: number       // NUMERIC — supports 0.5
  ratePerSession: number
  substituteSessions: number   // NUMERIC — supports 0.5
  substituteRate: number
}

// ─── Simple pay calculators ───────────────────────────────────────────────────

/** Teaching pay: sessions × rate, rounded */
export function calculateTeachingPay(sessions: number, rate: number): number {
  return Math.round(sessions * rate)
}

/** Substitute pay: sub sessions × sub rate, rounded */
export function calculateSubstitutePay(sessions: number, rate: number): number {
  return Math.round(sessions * rate)
}

// ─── Payslip initializer ──────────────────────────────────────────────────────

/**
 * Build initial payslip data for semi-manual mode.
 * Auto-calculates session pay, pre-fills from source data, zeros manual fields.
 * Accountant fills in bhxh, bhyt, bhtn, tncn, gross_pay, net_pay manually.
 */
export function initializePayslipData(
  employee: EmployeeSnapshot,
  prefill: PrefillData
): PayslipInitData {
  const teaching_pay = calculateTeachingPay(employee.sessionsWorked, employee.ratePerSession)
  const substitute_pay = calculateSubstitutePay(employee.substituteSessions, employee.substituteRate)

  return {
    // Auto-calculated
    sessions_worked: employee.sessionsWorked,
    rate_per_session: employee.ratePerSession,
    teaching_pay,
    substitute_sessions: employee.substituteSessions,
    substitute_rate: employee.substituteRate,
    substitute_pay,
    // Pre-filled from source data
    kpi_bonus: prefill.kpi_bonus,
    allowances: prefill.allowances,
    deductions: prefill.deductions,
    penalties: prefill.penalties,
    other_pay: prefill.other_pay,
    // Manual — starts at 0, accountant fills in
    bhxh: 0,
    bhyt: 0,
    bhtn: 0,
    tncn: 0,
    gross_pay: 0,
    net_pay: 0,
  }
}

// ─── Comparison helper ────────────────────────────────────────────────────────

/**
 * Compare net pay vs previous period. Returns change % and alert flag (>20%).
 * Returns null values when no previous data is available.
 */
export function compareNetPay(
  currentNet: number,
  previousNet: number | null
): { changePercent: number | null; isAlert: boolean } {
  if (previousNet === null || previousNet === 0) {
    return { changePercent: null, isAlert: false }
  }
  const changePercent = ((currentNet - previousNet) / previousNet) * 100
  return {
    changePercent: Math.round(changePercent * 10) / 10,
    isAlert: Math.abs(changePercent) > 20,
  }
}
