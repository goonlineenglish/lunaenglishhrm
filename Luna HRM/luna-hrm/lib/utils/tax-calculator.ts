/**
 * Vietnamese Personal Income Tax (TNCN) — 7 progressive brackets
 * Input: taxable income in VND (after deductions)
 * Output: tax amount in VND
 */
export function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  const brackets: [number, number][] = [
    [5_000_000, 0.05], // 0 - 5M at 5%
    [10_000_000, 0.1], // 5M - 10M at 10%
    [18_000_000, 0.15], // 10M - 18M at 15%
    [32_000_000, 0.2], // 18M - 32M at 20%
    [52_000_000, 0.25], // 32M - 52M at 25%
    [80_000_000, 0.3], // 52M - 80M at 30%
    [Infinity, 0.35], // > 80M at 35%
  ]

  let tax = 0
  let cumulative = 0

  for (const [threshold, rate] of brackets) {
    if (taxableIncome <= cumulative) break

    const bracketIncome = Math.min(taxableIncome, threshold) - cumulative
    tax += bracketIncome * rate
    cumulative = threshold
  }

  return Math.round(tax)
}

// Insurance rates (employee portion)
export const INSURANCE_RATES = {
  BHXH: 0.08, // Social insurance 8%
  BHYT: 0.015, // Health insurance 1.5%
  BHTN: 0.01, // Unemployment insurance 1%
} as const

// Tax deductions
export const TAX_DEDUCTIONS = {
  PERSONAL: 11_000_000, // Personal deduction: 11M VND/month
  DEPENDENT: 4_400_000, // Per dependent: 4.4M VND/month
} as const
