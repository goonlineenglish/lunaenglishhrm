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
      // KPI bonus: exact month/year match. Select base_pass to apply same rule as batch helper.
      supabase
        .from('kpi_evaluations')
        .select('bonus_amount, base_pass')
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

  // Apply base_pass rule: bonus=0 when base_pass=false (aligns with batch helper behavior)
  const kpiRow = kpiResult.data as { bonus_amount: number; base_pass: boolean } | null
  const kpiBonus = kpiRow?.base_pass ? (kpiRow.bonus_amount ?? 0) : 0

  return {
    kpi_bonus: kpiBonus,
    allowances: sumAmounts(allowanceResult.data),
    deductions: sumAmounts(deductionResult.data),
    penalties: sumAmounts(penaltyResult.data),
    other_pay: sumAmounts(otherResult.data),
  }
}

// ─── Batch version: all employees in 3 queries ───────────────────────────────

/**
 * Batch fetch pre-fill data for multiple employees in one period.
 * Replaces N×5 individual queries with 3 batch queries using IN clause.
 * ~35x faster for 21 employees (105 → 3 DB round-trips).
 *
 * @returns Map of employeeId → PrefillData
 */
export async function fetchPrefillDataBatch(
  supabase: SupabaseClient,
  employeeIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<Map<string, PrefillData>> {
  if (employeeIds.length === 0) return new Map()

  const d = new Date(periodStart)
  const kpiMonth = d.getUTCMonth() + 1
  const kpiYear = d.getUTCFullYear()

  // 3 batch queries in parallel — covers all employees at once
  const [salaryResult, kpiResult, notesResult] = await Promise.all([
    // salary_components: all allowances + deductions for all employees
    supabase
      .from('salary_components')
      .select('employee_id, component_type, amount')
      .in('employee_id', employeeIds)
      .eq('is_recurring', true)
      .in('component_type', ['allowance', 'deduction']),

    // kpi_evaluations: KPI bonus for this month/year for all employees
    supabase
      .from('kpi_evaluations')
      .select('employee_id, bonus_amount, base_pass')
      .in('employee_id', employeeIds)
      .eq('month', kpiMonth)
      .eq('year', kpiYear),

    // employee_weekly_notes: penalty + bonus + extra_job in period for all employees
    supabase
      .from('employee_weekly_notes')
      .select('employee_id, note_type, amount')
      .in('employee_id', employeeIds)
      .in('note_type', ['penalty', 'bonus', 'extra_job'])
      .not('amount', 'is', null)
      .gte('week_start', periodStart)
      .lte('week_start', periodEnd),
  ])

  if (salaryResult.error) throw new Error(`[fetchPrefillDataBatch] salary_components: ${salaryResult.error.message}`)
  if (kpiResult.error) throw new Error(`[fetchPrefillDataBatch] kpi_evaluations: ${kpiResult.error.message}`)
  if (notesResult.error) throw new Error(`[fetchPrefillDataBatch] employee_weekly_notes: ${notesResult.error.message}`)

  type SalaryRow = { employee_id: string; component_type: string; amount: number }
  type KpiRow = { employee_id: string; bonus_amount: number; base_pass: boolean }
  type NoteRow = { employee_id: string; note_type: string; amount: number }

  const salaryRows = (salaryResult.data ?? []) as SalaryRow[]
  const kpiRows = (kpiResult.data ?? []) as KpiRow[]
  const noteRows = (notesResult.data ?? []) as NoteRow[]

  // Build KPI map (employee_id → bonus, respecting base_pass)
  const kpiMap = new Map<string, number>()
  for (const row of kpiRows) {
    kpiMap.set(row.employee_id, row.base_pass ? (row.bonus_amount ?? 0) : 0)
  }

  // Build result map with zeros as defaults
  const result = new Map<string, PrefillData>()
  for (const id of employeeIds) {
    result.set(id, { kpi_bonus: 0, allowances: 0, deductions: 0, penalties: 0, other_pay: 0 })
  }

  // Accumulate salary components
  for (const row of salaryRows) {
    const entry = result.get(row.employee_id)
    if (!entry) continue
    if (row.component_type === 'allowance') entry.allowances += row.amount ?? 0
    else if (row.component_type === 'deduction') entry.deductions += row.amount ?? 0
  }

  // Set KPI bonuses
  for (const [empId, bonus] of kpiMap) {
    const entry = result.get(empId)
    if (entry) entry.kpi_bonus = bonus
  }

  // Accumulate note amounts
  for (const row of noteRows) {
    const entry = result.get(row.employee_id)
    if (!entry) continue
    if (row.note_type === 'penalty') entry.penalties += row.amount ?? 0
    else if (row.note_type === 'bonus' || row.note_type === 'extra_job') entry.other_pay += row.amount ?? 0
  }

  return result
}

