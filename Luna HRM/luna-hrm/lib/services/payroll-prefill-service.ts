/**
 * Fetch pre-fill data for payslip initialization.
 * Aggregates KPI bonus, recurring allowances/deductions, and weekly notes.
 * Returns PrefillData with 0 defaults for missing data.
 * NOT a server action file — called from server action files that carry 'use server'.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrefillData } from '@/lib/types/database-payroll-types'

/**
 * Fetch all pre-fillable payslip data for one employee in a period.
 * Caller passes a shared Supabase client to avoid N+1 client creation.
 * @param periodStart ISO date string e.g. '2026-03-01' — used to derive month/year for KPI lookup
 */
export async function fetchPrefillData(
  supabase: SupabaseClient,
  employeeId: string,
  periodStart: string,  // ISO date e.g. '2026-03-01'
  periodEnd: string     // ISO date e.g. '2026-03-31'
): Promise<PrefillData> {
  // Derive month/year from periodStart for KPI exact-match lookup
  const d = new Date(periodStart)
  const kpiMonth = d.getUTCMonth() + 1
  const kpiYear = d.getUTCFullYear()

  const [kpiResult, allowanceResult, deductionResult, penaltyResult, otherResult] =
    await Promise.all([
      // KPI bonus: exact month/year match (kpi_evaluations has dedicated month/year INT columns)
      supabase
        .from('kpi_evaluations')
        .select('bonus_amount')
        .eq('employee_id', employeeId)
        .eq('month', kpiMonth)
        .eq('year', kpiYear)
        .maybeSingle(),

      // Recurring allowances from salary_components
      supabase
        .from('salary_components')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('component_type', 'allowance')
        .eq('is_recurring', true),

      // Recurring deductions from salary_components
      supabase
        .from('salary_components')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('component_type', 'deduction')
        .eq('is_recurring', true),

      // Penalties from employee_weekly_notes — skip rows with NULL amount
      supabase
        .from('employee_weekly_notes')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('note_type', 'penalty')
        .not('amount', 'is', null)
        .gte('week_start', periodStart)
        .lte('week_start', periodEnd),

      // Bonus / extra_job pay from employee_weekly_notes — skip rows with NULL amount
      supabase
        .from('employee_weekly_notes')
        .select('amount')
        .eq('employee_id', employeeId)
        .in('note_type', ['bonus', 'extra_job'])
        .not('amount', 'is', null)
        .gte('week_start', periodStart)
        .lte('week_start', periodEnd),
    ])

  const sumAmounts = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.amount ?? 0), 0)

  return {
    kpi_bonus: kpiResult.data?.bonus_amount ?? 0,
    allowances: sumAmounts(allowanceResult.data),
    deductions: sumAmounts(deductionResult.data),
    penalties: sumAmounts(penaltyResult.data),
    other_pay: sumAmounts(otherResult.data),
  }
}
