/**
 * KPI-specific types and UI constants for teaching assistant evaluations.
 * Two-part system: Part A (4 mandatory pass/fail) + Part B (5 scored criteria, 0-100 total).
 *
 * 2026-03 update: Score scale expanded — tsi/10, funtime/30, parent/20, student/30, demeanor/10.
 * Bonus formula: 40,000 × (total/10) × attendance_ratio
 */

// ─── KPI Criteria definitions ─────────────────────────────────────────────────

export const KPI_CRITERIA = [
  {
    key: 'tsi',
    label: 'Hỗ trợ GV (Giờ tương tác)',
    maxScore: 10,
    description: 'Hỗ trợ GV duy trì kỷ luật, tương tác với học sinh trong giờ học',
  },
  {
    key: 'funtime',
    label: 'Giờ Funtime',
    maxScore: 30,
    description: 'Theo kế hoạch, hiểu học sinh, đạt mục tiêu giờ Funtime',
  },
  {
    key: 'parent',
    label: 'Phụ huynh',
    maxScore: 20,
    description: 'Thân thiện, chia sẻ tiến bộ học sinh, giải đáp thắc mắc',
  },
  {
    key: 'student',
    label: 'Học sinh',
    maxScore: 30,
    description: 'Giao tiếp tiếng Anh, kỷ luật lớp học, đảm bảo an toàn trẻ',
  },
  {
    key: 'demeanor',
    label: 'Tác phong',
    maxScore: 10,
    description: 'Nghỉ ≤2 buổi, đồng phục đúng quy định, không dùng điện thoại',
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
  tsi_score: number       // 0-10
  tsi_comment: string
  funtime_score: number   // 0-30
  funtime_comment: string
  parent_score: number    // 0-20
  parent_comment: string
  student_score: number   // 0-30
  student_comment: string
  demeanor_score: number  // 0-10
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
