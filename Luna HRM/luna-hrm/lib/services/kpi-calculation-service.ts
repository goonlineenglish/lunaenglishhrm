/**
 * Pure KPI calculation functions — no side effects, no DB access.
 * Used by kpi-actions.ts when saving evaluations.
 *
 * New scoring scale (2026-03 update):
 *   tsi: 0–10, funtime: 0–30, parent: 0–20, student: 0–30, demeanor: 0–10
 *   total_score: 0–100 (raw sum)
 *
 * New bonus formula:
 *   bonus = ROUND(40,000 × (total_score / 10) × attendance_ratio)
 *   attendance_ratio = (sessions_worked + substitute_sessions) / total_scheduled_sessions
 *   If total_scheduled_sessions = 0 or base_pass = false → bonus = 0
 */

export const KPI_BONUS_BASE = 40_000  // VND per 10 score points at full attendance

/** Score constraints per criterion key (must match DB CHECK constraints) */
const SCORE_MAX: Record<string, number> = {
  tsi: 10,
  funtime: 30,
  parent: 20,
  student: 30,
  demeanor: 10,
}

/** Calculates Part B total score from individual criteria scores (max 100) */
export function calculateTotalScore(scores: {
  tsi: number
  funtime: number
  parent: number
  student: number
  demeanor: number
}): number {
  return scores.tsi + scores.funtime + scores.parent + scores.student + scores.demeanor
}

/**
 * Calculates bonus amount using new attendance-weighted formula.
 *
 * bonus = ROUND(40,000 × (totalScore / 10) × attendanceRatio)
 * attendanceRatio = (sessionsWorked + substituteSessions) / totalScheduledSessions
 *
 * Rules:
 * - base_pass=false → bonus=0 (base salary still paid normally)
 * - totalScheduledSessions=0 → bonus=0 (no TKB data)
 * - attendanceRatio capped at 1.0 (substitute cannot inflate beyond 100%)
 *
 * Max bonus example: total=100, ratio=1.0 → 40,000 × 10 × 1.0 = 400,000 VND
 */
export function calculateKpiBonus(
  totalScore: number,
  basePassed: boolean,
  sessionsWorked: number,
  substituteSessions: number,
  totalScheduledSessions: number,
): number {
  if (!basePassed) return 0
  if (totalScheduledSessions <= 0) return 0
  // Clamp ratio to [0, 1]: floor at 0 to prevent negative bonus, cap at 1 to prevent inflation
  const attendanceRatio = Math.max(0, Math.min(1, (sessionsWorked + substituteSessions) / totalScheduledSessions))
  return Math.round(KPI_BONUS_BASE * (totalScore / 10) * attendanceRatio)
}

/**
 * Validates that a criterion score is a non-negative integer within its allowed max.
 * Returns true if valid.
 */
export function validateScore(key: string, score: number, maxScore?: number): boolean {
  const max = maxScore ?? SCORE_MAX[key]
  if (max === undefined) return false
  return Number.isInteger(score) && score >= 0 && score <= max
}

/** Validates all 5 Part B scores. Returns first error message or null if all valid. */
export function validateAllScores(scores: {
  tsi: number
  funtime: number
  parent: number
  student: number
  demeanor: number
}): string | null {
  for (const [key, value] of Object.entries(scores)) {
    if (!validateScore(key, value)) {
      return `Điểm ${key} không hợp lệ (nhận ${value}, tối đa ${SCORE_MAX[key]}).`
    }
  }
  return null
}
