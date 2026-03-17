/**
 * Additional payroll-specific types for UI state, tab navigation, and summary display.
 * These extend the database types (database-payroll-types.ts) with UI concerns.
 */

// ─── Tab navigation ───────────────────────────────────────────────────────────

/** Filter tab for viewing payslips by employee position */
export type PayrollTabType = 'assistant' | 'teacher' | 'office'

export const PAYROLL_TAB_LABELS: Record<PayrollTabType, string> = {
  assistant: 'Trợ giảng',
  teacher: 'Giáo viên',
  office: 'Văn phòng',
}

// ─── Summary aggregates ───────────────────────────────────────────────────────

/** Aggregate totals displayed at top of payroll period page */
export interface PayrollSummary {
  totalEmployees: number
  totalGross: number
  totalNet: number
}

// ─── Comparison / alert ───────────────────────────────────────────────────────

/** Used by payroll preview to flag >20% net pay changes vs previous period */
export interface PayslipComparison {
  /** Net pay from previous period — null if no prior period */
  previousNetPay: number | null
  /** Percentage change relative to previousNetPay — null if no prior data */
  changePercent: number | null
  /** True when |changePercent| > 20% — triggers visual warning */
  isAlert: boolean
}

// ─── Period status labels ─────────────────────────────────────────────────────

import type { PayrollStatus } from '@/lib/types/database-payroll-types'

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Nháp',
  confirmed: 'Đã xác nhận',
  sent: 'Đã gửi',
  finalized: 'Đã chốt',
}

export const PAYROLL_STATUS_COLORS: Record<PayrollStatus, string> = {
  draft: 'secondary',
  confirmed: 'default',
  sent: 'outline',
  finalized: 'outline',
}
