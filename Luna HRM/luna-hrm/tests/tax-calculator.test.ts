import { describe, it, expect } from 'vitest'
import { calculateProgressiveTax, INSURANCE_RATES, TAX_DEDUCTIONS } from '@/lib/utils/tax-calculator'

describe('calculateProgressiveTax — Vietnamese TNCN progressive tax', () => {
  it('zero or negative income should return 0 tax', () => {
    expect(calculateProgressiveTax(0)).toBe(0)
    expect(calculateProgressiveTax(-1)).toBe(0)
    expect(calculateProgressiveTax(-1_000_000)).toBe(0)
  })

  it('income in bracket 1 only (≤5M) should apply 5% rate', () => {
    expect(calculateProgressiveTax(1_000_000)).toBe(50_000) // 1M × 5%
    expect(calculateProgressiveTax(5_000_000)).toBe(250_000) // 5M × 5%
  })

  it('income crossing bracket 1-2 (5M-10M) should combine rates', () => {
    // 7M: 5M×5% + 2M×10% = 250k + 200k = 450k
    expect(calculateProgressiveTax(7_000_000)).toBe(450_000)
  })

  it('income at exactly 5M boundary', () => {
    expect(calculateProgressiveTax(5_000_000)).toBe(250_000) // 5M × 5%
  })

  it('income at exactly 10M boundary should have 5M×5% + 5M×10% = 750k', () => {
    expect(calculateProgressiveTax(10_000_000)).toBe(750_000)
  })

  it('income crossing bracket 2-3 (10M-18M) should apply 15% on excess', () => {
    // 12M: 5M×5% + 5M×10% + 2M×15% = 250k + 500k + 300k = 1.05M
    expect(calculateProgressiveTax(12_000_000)).toBe(1_050_000)
  })

  it('income crossing all 7 brackets (100M)', () => {
    // 5M×5% + 5M×10% + 8M×15% + 14M×20% + 20M×25% + 28M×30% + 20M×35%
    // = 250k + 500k + 1.2M + 2.8M + 5M + 8.4M + 7M = 25.15M
    expect(calculateProgressiveTax(100_000_000)).toBe(25_150_000)
  })

  it('small amount < 5M bracket', () => {
    expect(calculateProgressiveTax(3_500_000)).toBe(175_000) // 3.5M × 5%
  })

  it('large amount > 80M applies 35% rate', () => {
    // 85M: 5M×5% + 5M×10% + 8M×15% + 14M×20% + 20M×25% + 28M×30% + 5M×35%
    // = 250k + 500k + 1.2M + 2.8M + 5M + 8.4M + 1.75M = 19.9M
    expect(calculateProgressiveTax(85_000_000)).toBe(19_900_000)
  })

  it('Math.round is applied (no decimals)', () => {
    // Result should always be integer
    const result = calculateProgressiveTax(7_654_321)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('INSURANCE_RATES constants are correct', () => {
    expect(INSURANCE_RATES.BHXH).toBe(0.08)
    expect(INSURANCE_RATES.BHYT).toBe(0.015)
    expect(INSURANCE_RATES.BHTN).toBe(0.01)
  })

  it('TAX_DEDUCTIONS constants are correct', () => {
    expect(TAX_DEDUCTIONS.PERSONAL).toBe(11_000_000)
    expect(TAX_DEDUCTIONS.DEPENDENT).toBe(4_400_000)
  })
})
