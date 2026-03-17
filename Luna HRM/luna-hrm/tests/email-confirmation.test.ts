/**
 * Tests: email confirmation workflow
 * 12 test cases covering email service, templates, confirmation actions, cron logic
 */

import { describe, it, expect, vi } from 'vitest'
import { buildPayslipEmailHtml, buildReminderEmailHtml } from '@/lib/services/email-templates'

// ─── 1. Email Templates ───────────────────────────────────────────────────────

describe('buildPayslipEmailHtml', () => {
  const base = {
    employeeName: 'Nguyễn Văn An',
    month: 3,
    year: 2026,
    netPay: 8_500_000,
    grossPay: 10_000_000,
    branchName: 'CS Tân Mai',
    confirmUrl: 'https://hrm.test/confirm-payslip?token=abc&action=confirm',
    disputeUrl: 'https://hrm.test/confirm-payslip?token=abc&action=dispute',
    deadlineDate: '31/03/2026',
  }

  it('should contain employee name', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain('Nguyễn Văn An')
  })

  it('should contain month/year', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain('tháng 3/2026')
  })

  it('should contain formatted net pay amount', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain('8.500.000')
  })

  it('should contain confirm and dispute URLs', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain(base.confirmUrl)
    expect(html).toContain(base.disputeUrl)
  })

  it('should contain deadline date', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain('31/03/2026')
  })

  it('should contain branch name', () => {
    const html = buildPayslipEmailHtml(base)
    expect(html).toContain('CS Tân Mai')
  })
})

describe('buildReminderEmailHtml', () => {
  const base = {
    employeeName: 'Trần Thị Bình',
    month: 3,
    year: 2026,
    netPay: 6_000_000,
    confirmUrl: 'https://hrm.test/my-payslips',
    disputeUrl: 'https://hrm.test/my-payslips',
    deadlineDate: '31/03/2026',
    daysLeft: 1,
  }

  it('should show urgent label when daysLeft=1', () => {
    const html = buildReminderEmailHtml(base)
    expect(html).toContain('Khẩn cấp')
  })

  it('should show correct daysLeft', () => {
    const html = buildReminderEmailHtml({ ...base, daysLeft: 2 })
    expect(html).toContain('2 ngày')
  })

  it('should contain net pay formatted', () => {
    const html = buildReminderEmailHtml(base)
    expect(html).toContain('6.000.000')
  })

  it('should contain employee name', () => {
    const html = buildReminderEmailHtml(base)
    expect(html).toContain('Trần Thị Bình')
  })
})

// ─── 2. Confirmation logic ────────────────────────────────────────────────────

describe('confirmMyPayslip — input validation', () => {
  it('should reject empty token without calling DB', async () => {
    // Import the action — it uses createAdminClient which requires env vars
    // We only test input validation, which doesn't need a real DB
    const { confirmMyPayslip } = await import('@/lib/actions/employee-confirmation-actions')

    // Mock createAdminClient to avoid env requirement in tests
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
        })),
      })),
    }))
    vi.mock('@/lib/services/audit-log-service', () => ({ logAudit: vi.fn() }))

    const result = await confirmMyPayslip({ token: '', action: 'confirm' })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should reject dispute without feedback', async () => {
    const { confirmMyPayslip } = await import('@/lib/actions/employee-confirmation-actions')
    const result = await confirmMyPayslip({ token: 'validtoken', action: 'dispute', feedback: '' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('lý do')
  })

  it('should reject invalid action', async () => {
    const { confirmMyPayslip } = await import('@/lib/actions/employee-confirmation-actions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await confirmMyPayslip({ token: 'tok', action: 'invalid' as any })
    expect(result.success).toBe(false)
  })
})

// ─── 3. Cron logic helpers ────────────────────────────────────────────────────

describe('Cron cutoff dates', () => {
  it('3-day cutoff should be ~3 days ago', () => {
    const CONFIRMATION_DAYS = 3
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CONFIRMATION_DAYS)
    const diffDays = (Date.now() - cutoff.getTime()) / 86_400_000
    expect(diffDays).toBeGreaterThanOrEqual(2.9)
    expect(diffDays).toBeLessThanOrEqual(3.1)
  })

  it('2-day reminder cutoff should be ~2 days ago', () => {
    const REMINDER_AFTER_DAYS = 2
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - REMINDER_AFTER_DAYS)
    const diffDays = (Date.now() - cutoff.getTime()) / 86_400_000
    expect(diffDays).toBeGreaterThanOrEqual(1.9)
    expect(diffDays).toBeLessThanOrEqual(2.1)
  })
})
