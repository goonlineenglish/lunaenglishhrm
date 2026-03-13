/**
 * Database entity types: Evaluation Templates, Periods, Scores, Employee Notes
 * Part 4 of 4 — see database-core-types, database-schedule-types, database-payroll-types
 * MUST match supabase/migrations/001_create_all_tables.sql exactly
 */

// ─── Evaluation enums ────────────────────────────────────────────────────────

export type EvaluationTemplateTarget = 'teacher' | 'assistant' | 'office' | 'all'

export type EvaluationPeriodStatus = 'open' | 'closed'

export type EvaluationStatus = 'draft' | 'confirmed'

export type EvalType = 'periodic' | 'ad_hoc'

export type EmployeeNoteType = 'praise' | 'warning' | 'observation' | 'general'

// ─── 12. evaluation_templates ──────────────────────────────────────────────

export interface EvaluationTemplate {
  id: string
  name: string
  applies_to: EvaluationTemplateTarget
  max_total_score: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type EvaluationTemplateInsert = Omit<EvaluationTemplate, 'id' | 'created_at' | 'updated_at'>
export type EvaluationTemplateUpdate = Partial<EvaluationTemplateInsert>

// ─── 13. evaluation_criteria ───────────────────────────────────────────────

export interface EvaluationCriteria {
  id: string
  template_id: string
  name: string
  description: string | null
  max_score: number
  weight: number          // NUMERIC, default 1.0
  sort_order: number
  created_at: string
}

export type EvaluationCriteriaInsert = Omit<EvaluationCriteria, 'id' | 'created_at'>

// ─── 14. evaluation_periods ────────────────────────────────────────────────

export interface EvaluationPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: EvaluationPeriodStatus
  created_by: string
  created_at: string
}

export type EvaluationPeriodInsert = Omit<EvaluationPeriod, 'id' | 'created_at'>
export type EvaluationPeriodUpdate = Partial<EvaluationPeriodInsert>

// ─── 15. employee_evaluations ──────────────────────────────────────────────

export interface EmployeeEvaluation {
  id: string
  employee_id: string
  evaluator_id: string
  template_id: string
  period_id: string | null     // null = ad-hoc
  eval_type: EvalType
  total_score: number          // NUMERIC
  overall_notes: string | null
  bonus_impact: number | null  // informational only
  status: EvaluationStatus
  created_at: string
  updated_at: string
}

export type EmployeeEvaluationInsert = Omit<EmployeeEvaluation, 'id' | 'created_at' | 'updated_at'>
export type EmployeeEvaluationUpdate = Partial<EmployeeEvaluationInsert>

// ─── 16. evaluation_scores ─────────────────────────────────────────────────

export interface EvaluationScore {
  id: string
  evaluation_id: string
  criterion_id: string         // FK → evaluation_criteria
  score: number                // NUMERIC
  comment: string | null
  created_at: string
}

export type EvaluationScoreInsert = Omit<EvaluationScore, 'id' | 'created_at'>
export type EvaluationScoreUpdate = Partial<EvaluationScoreInsert>

// ─── 17. employee_notes ────────────────────────────────────────────────────

export interface EmployeeNote {
  id: string
  employee_id: string
  author_id: string
  note_type: EmployeeNoteType
  content: string
  created_at: string
}

export type EmployeeNoteInsert = Omit<EmployeeNote, 'id' | 'created_at'>
export type EmployeeNoteUpdate = Partial<EmployeeNoteInsert>
