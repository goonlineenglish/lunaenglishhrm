import { describe, it, expect } from 'vitest'
import {
  calculateTotalScore,
  calculateKpiBonus,
  validateScore,
  validateAllScores,
  KPI_BONUS_BASE,
} from '@/lib/services/kpi-calculation-service'

describe('KPI Calculation — new scale (2026-03)', () => {
  describe('calculateTotalScore', () => {
    it('perfect score: tsi=10, funtime=30, parent=20, student=30, demeanor=10 → total=100', () => {
      expect(calculateTotalScore({ tsi: 10, funtime: 30, parent: 20, student: 30, demeanor: 10 })).toBe(100)
    })

    it('zero score: all zeros → total=0', () => {
      expect(calculateTotalScore({ tsi: 0, funtime: 0, parent: 0, student: 0, demeanor: 0 })).toBe(0)
    })

    it('half max: tsi=5, funtime=15, parent=10, student=15, demeanor=5 → total=50', () => {
      expect(calculateTotalScore({ tsi: 5, funtime: 15, parent: 10, student: 15, demeanor: 5 })).toBe(50)
    })

    it('mixed values: tsi=7, funtime=20, parent=12, student=25, demeanor=8 → total=72', () => {
      expect(calculateTotalScore({ tsi: 7, funtime: 20, parent: 12, student: 25, demeanor: 8 })).toBe(72)
    })
  })

  describe('calculateKpiBonus — new formula: 40k × (score/10) × attendance_ratio', () => {
    // Perfect score + full attendance = 40,000 × 10 × 1.0 = 400,000
    it('perfect score (100) + full attendance (20/20) + base_pass=true → 400,000 VND', () => {
      expect(calculateKpiBonus(100, true, 20, 0, 20)).toBe(400_000)
    })

    it('perfect score (100) + base_pass=false → 0 (base override)', () => {
      expect(calculateKpiBonus(100, false, 20, 0, 20)).toBe(0)
    })

    it('zero score + full attendance + base_pass=true → 0', () => {
      expect(calculateKpiBonus(0, true, 20, 0, 20)).toBe(0)
    })

    it('total_scheduled=0 → 0 (no TKB data)', () => {
      expect(calculateKpiBonus(100, true, 0, 0, 0)).toBe(0)
    })

    // score=100 (normalized 10), ratio=0.5 → 40,000 × 10 × 0.5 = 200,000
    it('perfect score (100) + half attendance (10/20) → 200,000 VND', () => {
      expect(calculateKpiBonus(100, true, 10, 0, 20)).toBe(200_000)
    })

    // score=50 (normalized 5), ratio=1.0 → 40,000 × 5 × 1 = 200,000
    it('half score (50) + full attendance (20/20) → 200,000 VND', () => {
      expect(calculateKpiBonus(50, true, 20, 0, 20)).toBe(200_000)
    })

    it('attendance ratio >1 capped at 1.0: sessions=15, sub=10, scheduled=20 → ratio=1.0', () => {
      expect(calculateKpiBonus(100, true, 15, 10, 20)).toBe(400_000)
    })

    // Include substitute sessions in numerator
    it('sessions=10, sub=5, scheduled=20 → ratio=0.75 → score=100 → 300,000 VND', () => {
      expect(calculateKpiBonus(100, true, 10, 5, 20)).toBe(300_000)
    })

    // Zero attendance with scheduled sessions (ratio=0) → bonus=0
    it('zero attendance (worked=0, sub=0) + scheduled=20 + base_pass=true → 0 (ratio=0)', () => {
      expect(calculateKpiBonus(100, true, 0, 0, 20)).toBe(0)
    })

    // Negative substitute (edge-case) must clamp to 0 not go negative
    it('negative substitute sessions clamped: sub=-5, worked=2, scheduled=10 → ratio clamped to 0', () => {
      // (2 + -5) / 10 = -0.3, clamped to 0 → bonus=0
      expect(calculateKpiBonus(100, true, 2, -5, 10)).toBe(0)
    })

    it('KPI_BONUS_BASE constant is 40,000', () => {
      expect(KPI_BONUS_BASE).toBe(40_000)
    })

    // Rounding check: score=70 (normalized 7), ratio=1/3 → 40000 × 7 × 0.333... = 93,333.33 → rounded = 93,333
    it('rounding: score=70, attendance=1/3 → ROUND(40,000 × 7 × 0.333) = 93,333', () => {
      expect(calculateKpiBonus(70, true, 1, 0, 3)).toBe(93_333)
    })
  })

  describe('validateScore — new max values', () => {
    describe('tsi criterion (max 10)', () => {
      it('validateScore("tsi", 0) → true', () => expect(validateScore('tsi', 0)).toBe(true))
      it('validateScore("tsi", 10) → true', () => expect(validateScore('tsi', 10)).toBe(true))
      it('validateScore("tsi", 5) → true', () => expect(validateScore('tsi', 5)).toBe(true))
      it('validateScore("tsi", 11) → false (exceeds max)', () => expect(validateScore('tsi', 11)).toBe(false))
      it('validateScore("tsi", -1) → false (negative)', () => expect(validateScore('tsi', -1)).toBe(false))
      it('validateScore("tsi", 0.5) → false (not integer)', () => expect(validateScore('tsi', 0.5)).toBe(false))
    })

    describe('funtime criterion (max 30)', () => {
      it('validateScore("funtime", 30) → true', () => expect(validateScore('funtime', 30)).toBe(true))
      it('validateScore("funtime", 31) → false (exceeds max)', () => expect(validateScore('funtime', 31)).toBe(false))
      it('validateScore("funtime", 15) → true', () => expect(validateScore('funtime', 15)).toBe(true))
    })

    describe('parent criterion (max 20)', () => {
      it('validateScore("parent", 20) → true', () => expect(validateScore('parent', 20)).toBe(true))
      it('validateScore("parent", 21) → false (exceeds max)', () => expect(validateScore('parent', 21)).toBe(false))
    })

    describe('student criterion (max 30)', () => {
      it('validateScore("student", 30) → true', () => expect(validateScore('student', 30)).toBe(true))
      it('validateScore("student", 31) → false (exceeds max)', () => expect(validateScore('student', 31)).toBe(false))
    })

    describe('demeanor criterion (max 10)', () => {
      it('validateScore("demeanor", 10) → true', () => expect(validateScore('demeanor', 10)).toBe(true))
      it('validateScore("demeanor", 11) → false (exceeds max)', () => expect(validateScore('demeanor', 11)).toBe(false))
    })

    describe('unknown criterion', () => {
      it('validateScore("unknown_key", 1) → false', () => expect(validateScore('unknown_key', 1)).toBe(false))
    })

    describe('custom maxScore override', () => {
      it('validateScore("tsi", 15, 20) → true (custom max=20)', () => expect(validateScore('tsi', 15, 20)).toBe(true))
      it('validateScore("tsi", 5, 3) → false (exceeds custom max=3)', () => expect(validateScore('tsi', 5, 3)).toBe(false))
    })
  })

  describe('validateAllScores', () => {
    it('all max scores valid → null (no error)', () => {
      expect(validateAllScores({ tsi: 10, funtime: 30, parent: 20, student: 30, demeanor: 10 })).toBeNull()
    })

    it('zero scores (all valid) → null', () => {
      expect(validateAllScores({ tsi: 0, funtime: 0, parent: 0, student: 0, demeanor: 0 })).toBeNull()
    })

    it('tsi=11 exceeds max 10 → error containing "tsi"', () => {
      const result = validateAllScores({ tsi: 11, funtime: 30, parent: 20, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
      expect(result).toContain('tsi')
    })

    it('funtime=31 exceeds max 30 → error containing "funtime"', () => {
      const result = validateAllScores({ tsi: 10, funtime: 31, parent: 20, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
      expect(result).toContain('funtime')
    })

    it('parent=21 exceeds max 20 → error containing "parent"', () => {
      const result = validateAllScores({ tsi: 10, funtime: 30, parent: 21, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
      expect(result).toContain('parent')
    })

    it('student=31 exceeds max 30 → error containing "student"', () => {
      const result = validateAllScores({ tsi: 10, funtime: 30, parent: 20, student: 31, demeanor: 10 })
      expect(result).not.toBeNull()
      expect(result).toContain('student')
    })

    it('demeanor=11 exceeds max 10 → error containing "demeanor"', () => {
      const result = validateAllScores({ tsi: 10, funtime: 30, parent: 20, student: 30, demeanor: 11 })
      expect(result).not.toBeNull()
      expect(result).toContain('demeanor')
    })

    it('multiple invalid scores → returns first error', () => {
      const result = validateAllScores({ tsi: 11, funtime: 31, parent: 20, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
    })

    it('negative score → error', () => {
      const result = validateAllScores({ tsi: -1, funtime: 30, parent: 20, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
    })

    it('non-integer score → error', () => {
      const result = validateAllScores({ tsi: 0.5, funtime: 30, parent: 20, student: 30, demeanor: 10 })
      expect(result).not.toBeNull()
    })
  })
})
