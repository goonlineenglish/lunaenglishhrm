/**
 * KPI-specific types and UI constants for teaching assistant evaluations.
 * Two-part system: Part A (4 mandatory pass/fail) + Part B (5 scored criteria, 0-10 total).
 */

// ─── KPI Criteria definitions (matches Excel template) ───────────────────────

export const KPI_CRITERIA = [
  {
    key: 'tsi',
    label: 'Hỗ trợ GV (TSI)',
    maxScore: 1,
    description: 'Hỗ trợ GV duy trì kỷ luật 80% HS',
  },
  {
    key: 'funtime',
    label: 'Giờ Funtime',
    maxScore: 3,
    description: 'Theo kế hoạch (1), hiểu HS (1), đạt mục tiêu (1)',
  },
  {
    key: 'parent',
    label: 'Phụ huynh',
    maxScore: 2,
    description: 'Thân thiện (1), chia sẻ tiến bộ HS (1)',
  },
  {
    key: 'student',
    label: 'Học sinh',
    maxScore: 3,
    description: 'Giao tiếp tiếng Anh (1), kỷ luật (1), an toàn trẻ (1)',
  },
  {
    key: 'demeanor',
    label: 'Tác phong',
    maxScore: 1,
    description: 'Nghỉ ≤2 buổi, đồng phục, không dùng ĐT',
  },
] as const

export type KpiCriterionKey = typeof KPI_CRITERIA[number]['key']

// ─── Part A: 4 mandatory criteria (all must pass for base_pass=true) ─────────

export const MANDATORY_CRITERIA = [
  'Hoàn thành nhiệm vụ TG theo mô tả công việc',
  'Chuẩn bị phòng học: bàn ghế, vật tư, vệ sinh; bảo quản thiết bị',
  'Đúng giờ (trước 15 phút)',
  'Điểm danh HS hàng ngày + báo vắng cho BM',
] as const

// ─── KPI form state ───────────────────────────────────────────────────────────

export interface KpiFormData {
  base_pass: boolean
  /** 4 boolean items mapped to MANDATORY_CRITERIA indices */
  mandatory_checks: boolean[]
  tsi_score: number
  tsi_comment: string
  funtime_score: number
  funtime_comment: string
  parent_score: number
  parent_comment: string
  student_score: number
  student_comment: string
  demeanor_score: number
  demeanor_comment: string
}

// ─── KPI status summary per assistant (list view) ────────────────────────────

export interface AssistantKpiStatus {
  employee_id: string
  employee_code: string
  employee_name: string
  /** Primary class code this assistant is assigned to (may be null) */
  class_code: string | null
  total_score: number | null
  bonus_amount: number | null
  is_evaluated: boolean
}
