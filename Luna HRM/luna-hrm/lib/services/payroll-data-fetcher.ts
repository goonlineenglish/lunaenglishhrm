'use server'

/**
 * Data fetcher queries for payroll calculation inputs.
 * Fetches recurring salary components, KPI bonus, penalty amounts,
 * and other pay from employee_weekly_notes.
 * Accepts a shared Supabase client to avoid N+1 client creation.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ─── Recurring salary components ─────────────────────────────────────────────

/** Get total recurring allowances for an employee. */
export async function getRecurringAllowances(sb: SupabaseClient, employeeId: string): Promise<number> {
  const { data, error } = await sb
    .from('salary_components')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('component_type', 'allowance')
    .eq('is_recurring', true)

  if (error) throw new Error(`[getRecurringAllowances] ${error.message}`)

  const rows = (data as { amount: number }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

/** Get total recurring deductions for an employee. */
export async function getRecurringDeductions(sb: SupabaseClient, employeeId: string): Promise<number> {
  const { data, error } = await sb
    .from('salary_components')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('component_type', 'deduction')
    .eq('is_recurring', true)

  if (error) throw new Error(`[getRecurringDeductions] ${error.message}`)

  const rows = (data as { amount: number }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

// ─── KPI bonus ────────────────────────────────────────────────────────────────

/**
 * Get KPI bonus from kpi_evaluations for a specific month/year.
 * Returns 0 if no evaluation found or base_pass=false.
 */
export async function getKpiBonus(
  sb: SupabaseClient,
  employeeId: string,
  month: number,
  year: number
): Promise<number> {
  const { data, error } = await sb
    .from('kpi_evaluations')
    .select('base_pass, bonus_amount')
    .eq('employee_id', employeeId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (error) throw new Error(`[getKpiBonus] ${error.message}`)
  if (!data) return 0

  const row = data as { base_pass: boolean; bonus_amount: number }
  return row.base_pass ? (row.bonus_amount ?? 0) : 0
}

// ─── One-time note amounts ────────────────────────────────────────────────────

/** Get total penalty amount from employee_weekly_notes where note_type='penalty'. */
export async function getPenaltyAmount(
  sb: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await sb
    .from('employee_weekly_notes')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('note_type', 'penalty')
    .gte('week_start', startDate)
    .lte('week_start', endDate)

  if (error) throw new Error(`[getPenaltyAmount] ${error.message}`)

  const rows = (data as { amount: number | null }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

/** Get other pay from employee_weekly_notes where note_type='bonus' or 'extra_job'. */
export async function getOtherPay(
  sb: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await sb
    .from('employee_weekly_notes')
    .select('amount')
    .eq('employee_id', employeeId)
    .in('note_type', ['bonus', 'extra_job'])
    .gte('week_start', startDate)
    .lte('week_start', endDate)

  if (error) throw new Error(`[getOtherPay] ${error.message}`)

  const rows = (data as { amount: number | null }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}
