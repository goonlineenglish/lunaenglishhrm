import { describe, it, expect } from 'vitest'
import {
  calculateTotalScore,
  calculateKpiBonus,
  validateScore,
  validateAllScores,
  KPI_BONUS_PER_POINT,
} from '@/lib/services/kpi-calculation-service'

describe('KPI Calculation — KPI scoring and validation', () => {
  describe('calculateTotalScore', () => {
    it('perfect score: tsi=1, funtime=3, parent=2, student=3, demeanor=1 → total=10', () => {
      const score = calculateTotalScore({
        tsi: 1,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(score).toBe(10)
    })

    it('zero score: all zeros → total=0', () => {
      const score = calculateTotalScore({
        tsi: 0,
        funtime: 0,
        parent: 0,
        student: 0,
        demeanor: 0,
      })
      expect(score).toBe(0)
    })

    it('mid-range score: tsi=1, funtime=2, parent=1, student=2, demeanor=1 → total=7', () => {
      const score = calculateTotalScore({
        tsi: 1,
        funtime: 2,
        parent: 1,
        student: 2,
        demeanor: 1,
      })
      expect(score).toBe(7)
    })
  })

  describe('calculateKpiBonus', () => {
    it('perfect score (10) with base_pass=true → 500,000 VND', () => {
      expect(calculateKpiBonus(10, true)).toBe(500_000)
    })

    it('perfect score (10) with base_pass=false → 0 (base_pass=false override)', () => {
      expect(calculateKpiBonus(10, false)).toBe(0)
    })

    it('zero score with base_pass=true → 0', () => {
      expect(calculateKpiBonus(0, true)).toBe(0)
    })

    it('zero score with base_pass=false → 0', () => {
      expect(calculateKpiBonus(0, false)).toBe(0)
    })

    it('mid-range score (6) with base_pass=true → 300,000 VND', () => {
      expect(calculateKpiBonus(6, true)).toBe(300_000)
    })

    it('mid-range score (6) with base_pass=false → 0', () => {
      expect(calculateKpiBonus(6, false)).toBe(0)
    })

    it('KPI_BONUS_PER_POINT constant is 50,000', () => {
      expect(KPI_BONUS_PER_POINT).toBe(50_000)
    })
  })

  describe('validateScore', () => {
    describe('tsi criterion (max 1)', () => {
      it('validateScore("tsi", 0) → true', () => {
        expect(validateScore('tsi', 0)).toBe(true)
      })

      it('validateScore("tsi", 1) → true', () => {
        expect(validateScore('tsi', 1)).toBe(true)
      })

      it('validateScore("tsi", 2) → false (exceeds max)', () => {
        expect(validateScore('tsi', 2)).toBe(false)
      })

      it('validateScore("tsi", -1) → false (negative)', () => {
        expect(validateScore('tsi', -1)).toBe(false)
      })

      it('validateScore("tsi", 0.5) → false (not integer)', () => {
        expect(validateScore('tsi', 0.5)).toBe(false)
      })
    })

    describe('funtime criterion (max 3)', () => {
      it('validateScore("funtime", 3) → true', () => {
        expect(validateScore('funtime', 3)).toBe(true)
      })

      it('validateScore("funtime", 4) → false (exceeds max)', () => {
        expect(validateScore('funtime', 4)).toBe(false)
      })

      it('validateScore("funtime", 2) → true', () => {
        expect(validateScore('funtime', 2)).toBe(true)
      })
    })

    describe('parent criterion (max 2)', () => {
      it('validateScore("parent", 2) → true', () => {
        expect(validateScore('parent', 2)).toBe(true)
      })

      it('validateScore("parent", 3) → false (exceeds max)', () => {
        expect(validateScore('parent', 3)).toBe(false)
      })
    })

    describe('student criterion (max 3)', () => {
      it('validateScore("student", 3) → true', () => {
        expect(validateScore('student', 3)).toBe(true)
      })

      it('validateScore("student", 4) → false (exceeds max)', () => {
        expect(validateScore('student', 4)).toBe(false)
      })
    })

    describe('demeanor criterion (max 1)', () => {
      it('validateScore("demeanor", 1) → true', () => {
        expect(validateScore('demeanor', 1)).toBe(true)
      })

      it('validateScore("demeanor", 2) → false (exceeds max)', () => {
        expect(validateScore('demeanor', 2)).toBe(false)
      })
    })

    describe('unknown criterion', () => {
      it('validateScore("unknown_key", 1) → false (unknown criterion)', () => {
        expect(validateScore('unknown_key', 1)).toBe(false)
      })

      it('validateScore("invalid", 0) → false (unknown criterion)', () => {
        expect(validateScore('invalid', 0)).toBe(false)
      })
    })

    describe('custom maxScore override', () => {
      it('validateScore("tsi", 5, 10) → true (custom max=10)', () => {
        expect(validateScore('tsi', 5, 10)).toBe(true)
      })

      it('validateScore("tsi", 2, 1) → false (exceeds custom max=1)', () => {
        expect(validateScore('tsi', 2, 1)).toBe(false)
      })
    })
  })

  describe('validateAllScores', () => {
    it('all valid scores → null (no error)', () => {
      const result = validateAllScores({
        tsi: 1,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).toBeNull()
    })

    it('zero scores (all valid) → null', () => {
      const result = validateAllScores({
        tsi: 0,
        funtime: 0,
        parent: 0,
        student: 0,
        demeanor: 0,
      })
      expect(result).toBeNull()
    })

    it('one invalid score (tsi=2 exceeds max 1) → error string', () => {
      const result = validateAllScores({
        tsi: 2,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
      expect(result).toContain('tsi')
    })

    it('one invalid score (funtime=4 exceeds max 3) → error string', () => {
      const result = validateAllScores({
        tsi: 1,
        funtime: 4,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
      expect(result).toContain('funtime')
    })

    it('one invalid score (parent=3 exceeds max 2) → error string', () => {
      const result = validateAllScores({
        tsi: 1,
        funtime: 3,
        parent: 3,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
      expect(result).toContain('parent')
    })

    it('one invalid score (student=4 exceeds max 3) → error string', () => {
      const result = validateAllScores({
        tsi: 1,
        funtime: 3,
        parent: 2,
        student: 4,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
      expect(result).toContain('student')
    })

    it('one invalid score (demeanor=2 exceeds max 1) → error string', () => {
      const result = validateAllScores({
        tsi: 1,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 2,
      })
      expect(result).not.toBeNull()
      expect(result).toContain('demeanor')
    })

    it('multiple invalid scores → returns first error', () => {
      const result = validateAllScores({
        tsi: 2,
        funtime: 4,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
      // Should return first invalid (tsi comes first in iteration)
      expect(typeof result).toBe('string')
    })

    it('negative score → error', () => {
      const result = validateAllScores({
        tsi: -1,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
    })

    it('non-integer score → error', () => {
      const result = validateAllScores({
        tsi: 0.5,
        funtime: 3,
        parent: 2,
        student: 3,
        demeanor: 1,
      })
      expect(result).not.toBeNull()
    })
  })
})
