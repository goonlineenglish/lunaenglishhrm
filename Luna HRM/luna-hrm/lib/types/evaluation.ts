/**
 * Evaluation module — UI-facing types, view/join shapes, and form types.
 * DB entity types live in database-evaluation-types.ts.
 * Re-exports key types for convenience.
 */

// Re-export base DB types for action consumers
export type {
  EvaluationTemplate,
  EvaluationTemplateInsert,
  EvaluationTemplateUpdate,
  EvaluationCriteria,
  EvaluationCriteriaInsert,
  EvaluationPeriod,
  EvaluationPeriodInsert,
  EvaluationPeriodStatus,
  EmployeeEvaluation,
  EmployeeEvaluationInsert,
  EvaluationScore,
  EvaluationScoreInsert,
  EmployeeNote,
  EmployeeNoteInsert,
  EmployeeNoteType,
  EvalType,
  EvaluationStatus,
  EvaluationTemplateTarget,
} from '@/lib/types/database-evaluation-types'

// ─── Joined/view shapes returned by query actions ────────────────────────────

/** Template with criteria count (list view) */
export interface EvaluationTemplateWithCount {
  id: string
  name: string
  applies_to: string
  max_total_score: number
  is_active: boolean
  created_at: string
  criteria_count: number
}

/** Template detail with full criteria list */
export interface EvaluationTemplateDetail {
  id: string
  name: string
  applies_to: string
  max_total_score: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  criteria: CriterionRow[]
}

export interface CriterionRow {
  id: string
  template_id: string
  name: string
  description: string | null
  max_score: number
  weight: number
  sort_order: number
}

/** Criterion input (no id, for create/update forms) */
export interface CriterionInput {
  name: string
  description?: string | null
  max_score: number
  weight?: number
  sort_order?: number
}

/** Evaluation list row (with template name + evaluator name) */
export interface EvaluationListRow {
  id: string
  employee_id: string
  evaluator_id: string
  evaluator_name: string
  template_id: string
  template_name: string
  period_id: string | null
  eval_type: string
  total_score: number
  status: string
  created_at: string
}

/** Evaluation detail with per-criterion scores */
export interface EvaluationDetail {
  id: string
  employee_id: string
  evaluator_id: string
  evaluator_name: string
  template_id: string
  template_name: string
  period_id: string | null
  eval_type: string
  total_score: number
  overall_notes: string | null
  bonus_impact: number | null
  status: string
  created_at: string
  scores: ScoreWithCriterion[]
}

export interface ScoreWithCriterion {
  id: string
  criterion_id: string
  criterion_name: string
  max_score: number
  score: number
  comment: string | null
}

/** Score input for create/update forms */
export interface ScoreInput {
  criterion_id: string
  score: number
  comment?: string | null
}

/** Extended profile fields for updateEmployeeProfile */
export interface EmployeeProfileUpdate {
  date_of_birth?: string | null
  id_number?: string | null
  id_issue_date?: string | null
  id_issue_place?: string | null
  address?: string | null
  emergency_contact?: string | null
  bank_account_number?: string | null
  bank_name?: string | null
  nationality?: string | null
  qualifications?: string | null
  teaching_license?: string | null
  characteristics?: string | null
  phone?: string | null
}
