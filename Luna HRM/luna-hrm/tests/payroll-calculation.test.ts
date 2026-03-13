import { describe, it, expect } from 'vitest'
import {
  calculateTeachingPay,
  calculateSubstitutePay,
  initializePayslipData,
  compareNetPay,
} from '@/lib/services/payroll-calculation-service'
import type { PrefillData } from '@/lib/types/database-payroll-types'

// ─── Empty prefill helper ─────────────────────────────────────────────────────
const zeroPrefill: PrefillData = {
  kpi_bonus: 0,
  allowances: 0,
  deductions: 0,
  penalties: 0,
  other_pay: 0,
}

// ─── calculateTeachingPay ─────────────────────────────────────────────────────

describe('calculateTeachingPay', () => {
  it('20 sessions × 200k = 4,000,000', () => {
    expect(calculateTeachingPay(20, 200_000)).toBe(4_000_000)
  })

  it('15.5 sessions × 100k = 1,550,000 (rounds correctly)', () => {
    expect(calculateTeachingPay(15.5, 100_000)).toBe(1_550_000)
  })

  it('0 sessions = 0', () => {
    expect(calculateTeachingPay(0, 500_000)).toBe(0)
  })

  it('0 rate = 0', () => {
    expect(calculateTeachingPay(20, 0)).toBe(0)
  })
})

// ─── calculateSubstitutePay ───────────────────────────────────────────────────

describe('calculateSubstitutePay', () => {
  it('5 sub sessions × 400k = 2,000,000', () => {
    expect(calculateSubstitutePay(5, 400_000)).toBe(2_000_000)
  })

  it('0 sessions = 0', () => {
    expect(calculateSubstitutePay(0, 400_000)).toBe(0)
  })

  it('0.5 sessions × 200k = 100,000', () => {
    expect(calculateSubstitutePay(0.5, 200_000)).toBe(100_000)
  })
})

// ─── initializePayslipData ────────────────────────────────────────────────────

describe('initializePayslipData — semi-manual mode', () => {
  describe('Auto-calculated fields (attendance + rate)', () => {
    it('teacher: 20 sessions × 200k auto-fills teaching_pay', () => {
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 20, ratePerSession: 200_000, substituteSessions: 0, substituteRate: 0 },
        zeroPrefill
      )
      expect(result.sessions_worked).toBe(20)
      expect(result.rate_per_session).toBe(200_000)
      expect(result.teaching_pay).toBe(4_000_000)
      expect(result.substitute_sessions).toBe(0)
      expect(result.substitute_pay).toBe(0)
    })

    it('office staff: 25 sessions + 5 sub sessions auto-filled', () => {
      const result = initializePayslipData(
        { position: 'office', sessionsWorked: 25, ratePerSession: 400_000, substituteSessions: 5, substituteRate: 400_000 },
        zeroPrefill
      )
      expect(result.teaching_pay).toBe(10_000_000)  // 25 × 400k
      expect(result.substitute_pay).toBe(2_000_000)  // 5 × 400k
    })

    it('half session: 15.5 sessions × 100k = 1,550,000', () => {
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 15.5, ratePerSession: 100_000, substituteSessions: 0, substituteRate: 0 },
        zeroPrefill
      )
      expect(result.teaching_pay).toBe(1_550_000)
    })
  })

  describe('Pre-filled fields from source data', () => {
    it('KPI bonus pre-filled from kpi_evaluations', () => {
      const prefill: PrefillData = { ...zeroPrefill, kpi_bonus: 300_000 }
      const result = initializePayslipData(
        { position: 'assistant', sessionsWorked: 20, ratePerSession: 75_000, substituteSessions: 0, substituteRate: 0 },
        prefill
      )
      expect(result.kpi_bonus).toBe(300_000)
    })

    it('allowances + deductions + penalties + other_pay all pre-filled', () => {
      const prefill: PrefillData = {
        kpi_bonus: 0,
        allowances: 500_000,
        deductions: 200_000,
        penalties: 100_000,
        other_pay: 300_000,
      }
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 20, ratePerSession: 200_000, substituteSessions: 0, substituteRate: 0 },
        prefill
      )
      expect(result.allowances).toBe(500_000)
      expect(result.deductions).toBe(200_000)
      expect(result.penalties).toBe(100_000)
      expect(result.other_pay).toBe(300_000)
    })
  })

  describe('Manual fields always start at zero (accountant fills in)', () => {
    it('bhxh, bhyt, bhtn, tncn, gross_pay, net_pay all initialized to 0', () => {
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 20, ratePerSession: 500_000, substituteSessions: 0, substituteRate: 0 },
        { kpi_bonus: 100_000, allowances: 500_000, deductions: 200_000, penalties: 50_000, other_pay: 0 }
      )
      // Manual fields must always start at 0 regardless of other data
      expect(result.bhxh).toBe(0)
      expect(result.bhyt).toBe(0)
      expect(result.bhtn).toBe(0)
      expect(result.tncn).toBe(0)
      expect(result.gross_pay).toBe(0)
      expect(result.net_pay).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('zero sessions still passes prefill data through', () => {
      const prefill: PrefillData = { ...zeroPrefill, other_pay: 1_000_000, allowances: 500_000 }
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 0, ratePerSession: 500_000, substituteSessions: 0, substituteRate: 0 },
        prefill
      )
      expect(result.teaching_pay).toBe(0)
      expect(result.other_pay).toBe(1_000_000)
      expect(result.allowances).toBe(500_000)
    })

    it('all zero prefill → all pre-filled fields are 0', () => {
      const result = initializePayslipData(
        { position: 'teacher', sessionsWorked: 10, ratePerSession: 200_000, substituteSessions: 0, substituteRate: 0 },
        zeroPrefill
      )
      expect(result.kpi_bonus).toBe(0)
      expect(result.allowances).toBe(0)
      expect(result.deductions).toBe(0)
      expect(result.penalties).toBe(0)
      expect(result.other_pay).toBe(0)
    })
  })
})

// ─── compareNetPay ────────────────────────────────────────────────────────────

describe('compareNetPay', () => {
  it('current 5M vs prev 4M → +25% change, isAlert=true (>20%)', () => {
    const result = compareNetPay(5_000_000, 4_000_000)
    expect(result.changePercent).toBe(25)
    expect(result.isAlert).toBe(true)
  })

  it('current 4.5M vs prev 5M → -10% change, isAlert=false (<20%)', () => {
    const result = compareNetPay(4_500_000, 5_000_000)
    expect(result.changePercent).toBe(-10)
    expect(result.isAlert).toBe(false)
  })

  it('null previous → null changePercent, isAlert=false', () => {
    const result = compareNetPay(5_000_000, null)
    expect(result.changePercent).toBeNull()
    expect(result.isAlert).toBe(false)
  })

  it('zero previous → null changePercent, isAlert=false (avoid division by zero)', () => {
    const result = compareNetPay(5_000_000, 0)
    expect(result.changePercent).toBeNull()
    expect(result.isAlert).toBe(false)
  })

  it('negative change exactly 20% should not alert', () => {
    const result = compareNetPay(4_000_000, 5_000_000)
    expect(result.changePercent).toBe(-20)
    expect(result.isAlert).toBe(false)
  })

  it('negative change > 20% should alert', () => {
    const result = compareNetPay(3_900_000, 5_000_000)
    expect(Math.abs(result.changePercent!)).toBeGreaterThan(20)
    expect(result.isAlert).toBe(true)
  })

  it('exact 20% change should not alert', () => {
    const result = compareNetPay(6_000_000, 5_000_000)
    expect(result.changePercent).toBe(20)
    expect(result.isAlert).toBe(false)
  })
})
