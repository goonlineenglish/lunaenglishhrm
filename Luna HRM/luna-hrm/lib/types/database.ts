/**
 * Main database type entry point.
 * Re-exports all entity types and provides the Supabase Database wrapper.
 *
 * Entity types split for file size compliance (<200 lines):
 * - database-core-types.ts       — Branches, Employees, enums (tables 1-2)
 * - database-schedule-types.ts   — Classes, Attendance, Locks, Notes (tables 3-7)
 * - database-payroll-types.ts    — KPI, Payroll (tables 8-11)
 * - database-evaluation-types.ts — Evaluations, Notes (tables 12-17)
 */

export * from './database-core-types'
export * from './database-schedule-types'
export * from './database-payroll-types'
export * from './database-evaluation-types'

import type {
  Branch, BranchInsert, BranchUpdate,
  Employee, EmployeeInsert, EmployeeUpdate,
} from './database-core-types'

import type {
  ClassSchedule, ClassScheduleInsert, ClassScheduleUpdate,
  Attendance, AttendanceInsert, AttendanceUpdate,
  OfficeAttendance, OfficeAttendanceInsert, OfficeAttendanceUpdate,
  AttendanceLock, AttendanceLockInsert,
  EmployeeWeeklyNote, EmployeeWeeklyNoteInsert, EmployeeWeeklyNoteUpdate,
} from './database-schedule-types'

import type {
  KpiEvaluation, KpiEvaluationInsert, KpiEvaluationUpdate,
  PayrollPeriod, PayrollPeriodInsert, PayrollPeriodUpdate,
  Payslip, PayslipInsert, PayslipUpdate,
  SalaryComponent, SalaryComponentInsert, SalaryComponentUpdate,
} from './database-payroll-types'

import type {
  EvaluationTemplate, EvaluationTemplateInsert, EvaluationTemplateUpdate,
  EvaluationCriteria, EvaluationCriteriaInsert,
  EvaluationPeriod, EvaluationPeriodInsert, EvaluationPeriodUpdate,
  EmployeeEvaluation, EmployeeEvaluationInsert, EmployeeEvaluationUpdate,
  EvaluationScore, EvaluationScoreInsert, EvaluationScoreUpdate,
  EmployeeNote, EmployeeNoteInsert, EmployeeNoteUpdate,
} from './database-evaluation-types'

// ─── Supabase Database wrapper ───────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      branches: { Row: Branch; Insert: BranchInsert; Update: BranchUpdate; Relationships: [] }
      employees: { Row: Employee; Insert: EmployeeInsert; Update: EmployeeUpdate; Relationships: [] }
      class_schedules: { Row: ClassSchedule; Insert: ClassScheduleInsert; Update: ClassScheduleUpdate; Relationships: [] }
      attendance: { Row: Attendance; Insert: AttendanceInsert; Update: AttendanceUpdate; Relationships: [] }
      office_attendance: { Row: OfficeAttendance; Insert: OfficeAttendanceInsert; Update: OfficeAttendanceUpdate; Relationships: [] }
      attendance_locks: { Row: AttendanceLock; Insert: AttendanceLockInsert; Update: Partial<AttendanceLockInsert>; Relationships: [] }
      employee_weekly_notes: { Row: EmployeeWeeklyNote; Insert: EmployeeWeeklyNoteInsert; Update: EmployeeWeeklyNoteUpdate; Relationships: [] }
      kpi_evaluations: { Row: KpiEvaluation; Insert: KpiEvaluationInsert; Update: KpiEvaluationUpdate; Relationships: [] }
      payroll_periods: { Row: PayrollPeriod; Insert: PayrollPeriodInsert; Update: PayrollPeriodUpdate; Relationships: [] }
      payslips: { Row: Payslip; Insert: PayslipInsert; Update: PayslipUpdate; Relationships: [] }
      salary_components: { Row: SalaryComponent; Insert: SalaryComponentInsert; Update: SalaryComponentUpdate; Relationships: [] }
      evaluation_templates: { Row: EvaluationTemplate; Insert: EvaluationTemplateInsert; Update: EvaluationTemplateUpdate; Relationships: [] }
      evaluation_criteria: { Row: EvaluationCriteria; Insert: EvaluationCriteriaInsert; Update: Partial<EvaluationCriteriaInsert>; Relationships: [] }
      evaluation_periods: { Row: EvaluationPeriod; Insert: EvaluationPeriodInsert; Update: EvaluationPeriodUpdate; Relationships: [] }
      employee_evaluations: { Row: EmployeeEvaluation; Insert: EmployeeEvaluationInsert; Update: EmployeeEvaluationUpdate; Relationships: [] }
      evaluation_scores: { Row: EvaluationScore; Insert: EvaluationScoreInsert; Update: EvaluationScoreUpdate; Relationships: [] }
      employee_notes: { Row: EmployeeNote; Insert: EmployeeNoteInsert; Update: EmployeeNoteUpdate; Relationships: [] }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, string>
  }
}
