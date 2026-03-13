/**
 * Database entity types: KPI, Payroll, Payslips, Salary Components
 * MUST match supabase/migrations/001_create_all_tables.sql exactly
 */

// ─── Payroll enums ────────────────────────────────────────────────────────────

export type PayrollStatus = 'draft' | 'confirmed' | 'sent'

// ─── 8. kpi_evaluations ──────────────────────────────────────────────────────

export interface KpiEvaluation {
  id: string
  employee_id: string
  branch_id: string
  month: number               // 1–12
  year: number
  /** 4 mandatory criteria met → eligible for bonus */
  base_pass: boolean
  // 5 KPI criteria with individual scores
  tsi_score: number           // 0-1
  tsi_comment: string | null
  funtime_score: number       // 0-3
  funtime_comment: string | null
  parent_score: number        // 0-2
  parent_comment: string | null
  student_score: number       // 0-3
  student_comment: string | null
  demeanor_score: number      // 0-1
  demeanor_comment: string | null
  total_score: number         // sum of all scores (0-10)
  /** total_score × 50,000 VND (0 if base_pass=false) */
  bonus_amount: number
  evaluated_by: string
  created_at: string
  updated_at: string
}

export type KpiEvaluationInsert = Omit<KpiEvaluation, 'id' | 'created_at' | 'updated_at'>
export type KpiEvaluationUpdate = Partial<KpiEvaluationInsert>

// ─── 9. payroll_periods ──────────────────────────────────────────────────────

export interface PayrollPeriod {
  id: string
  branch_id: string
  month: number
  year: number
  status: PayrollStatus
  total_gross: number
  total_net: number
  created_by: string
  confirmed_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type PayrollPeriodInsert = Omit<PayrollPeriod, 'id' | 'created_at' | 'updated_at'>
export type PayrollPeriodUpdate = Partial<PayrollPeriodInsert>

// ─── 10. payslips ────────────────────────────────────────────────────────────

export type PayslipPosition = 'teacher' | 'assistant' | 'office'

export interface Payslip {
  id: string
  payroll_period_id: string
  employee_id: string
  branch_id: string
  position: PayslipPosition
  sessions_worked: number       // NUMERIC — supports 0.5
  rate_per_session: number      // snapshot at calc time
  teaching_pay: number
  substitute_sessions: number   // NUMERIC — supports 0.5
  substitute_rate: number       // snapshot at calc time
  substitute_pay: number
  other_pay: number             // phụ đạo, manual
  kpi_bonus: number             // assistants only
  allowances: number
  gross_pay: number
  bhxh: number                  // 8% if has_labor_contract
  bhyt: number                  // 1.5%
  bhtn: number                  // 1%
  tncn: number                  // progressive tax
  deductions: number             // recurring deductions from salary_components
  penalties: number
  net_pay: number
  extra_notes: string | null
  is_reviewed: boolean          // set true when accountant saves/reviews row; gates confirmPayrollPeriod
  email_sent_at: string | null
  created_at: string
  updated_at: string
}

export type PayslipInsert = Omit<Payslip, 'id' | 'created_at' | 'updated_at'>
export type PayslipUpdate = Partial<PayslipInsert>

// ─── Semi-manual payroll types ───────────────────────────────────────────────

/** Pre-filled values sourced from KPI, salary_components, and weekly_notes */
export interface PrefillData {
  kpi_bonus: number
  allowances: number
  deductions: number
  penalties: number
  other_pay: number
}

/** Full payslip init data returned by initializePayslipData() */
export interface PayslipInitData {
  // Auto-calculated (read-only in UI)
  sessions_worked: number
  rate_per_session: number
  teaching_pay: number
  substitute_sessions: number
  substitute_rate: number
  substitute_pay: number
  // Pre-filled from source data (editable in UI)
  kpi_bonus: number
  allowances: number
  deductions: number
  penalties: number
  other_pay: number
  // Manual entry — always starts at 0
  bhxh: number
  bhyt: number
  bhtn: number
  tncn: number
  gross_pay: number
  net_pay: number
}

/** Editable fields accountant can update in spreadsheet UI */
export interface EditablePayslipFields {
  kpi_bonus?: number
  allowances?: number
  deductions?: number
  penalties?: number
  other_pay?: number
  bhxh?: number
  bhyt?: number
  bhtn?: number
  tncn?: number
  gross_pay?: number
  net_pay?: number
  extra_notes?: string | null
}

/** Single field-level audit entry for payslip_audit_logs */
export interface PayslipAuditEntry {
  payslip_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
}

// ─── 11. salary_components ───────────────────────────────────────────────────

export interface SalaryComponent {
  id: string
  employee_id: string
  component_type: 'allowance' | 'deduction'
  name: string
  amount: number
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export type SalaryComponentInsert = Omit<SalaryComponent, 'id' | 'created_at' | 'updated_at'>
export type SalaryComponentUpdate = Partial<SalaryComponentInsert>
