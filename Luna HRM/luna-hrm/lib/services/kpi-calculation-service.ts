/**
 * Pure KPI calculation functions — no side effects, no DB access.
 * Used by kpi-actions.ts when saving evaluations.
 */

export const KPI_BONUS_PER_POINT = 50_000  // VND per point

/** Score constraints per criterion key (must match DB CHECK constraints) */
const SCORE_MAX: Record<string, number> = {
  tsi: 1,
  funtime: 3,
  parent: 2,
  student: 3,
  demeanor: 1,
}

/** Calculates Part B total score from individual criteria scores (max 10) */
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
 * Calculates bonus amount.
 * If base_pass=false → bonus=0 (base salary still paid normally).
 * Range: 0 – 500,000 VND/month.
 */
export function calculateKpiBonus(totalScore: number, basePassed: boolean): number {
  if (!basePassed) return 0
  return totalScore * KPI_BONUS_PER_POINT
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
