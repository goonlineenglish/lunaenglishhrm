'use server'

/**
 * Payroll notification actions — send payslip emails to employees.
 * sendPayslipEmails: send all payslips for a confirmed period, advance status draft→confirmed→sent.
 * resendPayslipEmail: resend to a single employee.
 * finalizePayrollPeriod: move sent→finalized after all employees have confirmed/auto-confirmed.
 */

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import { logAudit } from '@/lib/services/audit-log-service'
import { sendBulkEmails, sendEmail } from '@/lib/services/email-service'
import { buildPayslipEmailHtml } from '@/lib/services/email-templates'
import type { ActionResult } from '@/lib/actions/employee-actions'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Days employees have to confirm/dispute before auto-confirm */
const CONFIRMATION_DAYS = 3

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function getDeadlineDate(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface PayslipRow {
  id: string
  employee_id: string
  net_pay: number
  gross_pay: number
  employee_status: string
  employees: { full_name: string; email: string; branch_id: string } | null
  payroll_periods: { month: number; year: number; branch_id: string } | null
}

interface BranchRow {
  id: string
  name: string
}

export interface SendPayslipEmailsResult {
  sent: number
  skipped: number
  failed: number
  errors: string[]
}

/** Send payslip emails for all employees in a period. Advances period to 'sent'. */
export async function sendPayslipEmails(
  periodId: string
): Promise<ActionResult<SendPayslipEmailsResult>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền gửi email lương.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Fetch period + validate status
    const { data: period, error: pErr } = await admin
      .from('payroll_periods')
      .select('id, status, month, year, branch_id')
      .eq('id', periodId)
      .maybeSingle()

    if (pErr) throw pErr
    if (!period) return { success: false, error: 'Không tìm thấy kỳ lương.' }
    if (!['confirmed', 'sent'].includes((period as { status: string }).status)) {
      return { success: false, error: 'Chỉ có thể gửi email khi kỳ lương đã duyệt hoặc đã gửi.' }
    }

    // Fetch payslips with employee emails
    const { data: payslips, error: slipErr } = await admin
      .from('payslips')
      .select('id, employee_id, net_pay, gross_pay, employee_status, employees(full_name, email, branch_id)')
      .eq('payroll_period_id', periodId)

    if (slipErr) throw slipErr

    // Fetch branch name for email
    const { data: branch } = await admin
      .from('branches')
      .select('id, name')
      .eq('id', (period as { branch_id: string }).branch_id)
      .maybeSingle()

    const branchName = (branch as BranchRow | null)?.name ?? 'Luna HRM'
    const p = period as { month: number; year: number }
    const deadline = getDeadlineDate(CONFIRMATION_DAYS)
    const deadlineStr = formatDeadline(deadline)

    const recipients: Array<{ email: string; subject: string; html: string; payslipId: string; token: string }> = []
    const skipped: string[] = []

    for (const row of (payslips ?? []) as PayslipRow[]) {
      const emp = row.employees
      if (!emp?.email) {
        skipped.push(row.id)
        continue
      }
      // Skip already confirmed/disputed
      if (['confirmed', 'disputed'].includes(row.employee_status)) {
        skipped.push(row.id)
        continue
      }
      const token = generateToken()
      const confirmUrl = `${APP_URL}/confirm-payslip?token=${token}&action=confirm`
      const disputeUrl = `${APP_URL}/confirm-payslip?token=${token}&action=dispute`

      recipients.push({
        email: emp.email,
        subject: `Phiếu lương tháng ${p.month}/${p.year} — ${emp.full_name}`,
        html: buildPayslipEmailHtml({
          employeeName: emp.full_name,
          month: p.month,
          year: p.year,
          netPay: row.net_pay,
          grossPay: row.gross_pay,
          branchName,
          confirmUrl,
          disputeUrl,
          deadlineDate: deadlineStr,
        }),
        payslipId: row.id,
        token,
      })
    }

    // Send all emails
    const results = await sendBulkEmails(
      recipients.map((r) => ({ email: r.email, subject: r.subject, html: r.html }))
    )

    // Update payslip tokens + employee_status → sent
    const successIds: string[] = []
    const failedEmails: string[] = []

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      if (results[i]?.ok) {
        await admin
          .from('payslips')
          .update({
            confirmation_token: r.token,
            employee_status: 'sent',
            email_sent_at: new Date().toISOString(),
            reminder_sent_at: null,
          })
          .eq('id', r.payslipId)
        successIds.push(r.payslipId)
      } else {
        failedEmails.push(results[i]?.error ?? 'unknown')
      }
    }

    // Advance period status to 'sent' if not already
    if ((period as { status: string }).status === 'confirmed') {
      await admin
        .from('payroll_periods')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          confirmation_deadline: deadline.toISOString(),
        })
        .eq('id', periodId)

      logAudit({
        tableName: 'payroll_periods',
        recordId: periodId,
        action: 'UPDATE',
        userId: user.id,
        userEmail: user.email,
        newData: { status: 'sent', sent_at: new Date().toISOString() },
      })
    }

    return {
      success: true,
      data: {
        sent: successIds.length,
        skipped: skipped.length,
        failed: failedEmails.length,
        errors: failedEmails,
      },
    }
  } catch (err) {
    console.error('[sendPayslipEmails]', err)
    return { success: false, error: 'Không thể gửi email lương.' }
  }
}

/** Resend payslip email to a single employee. */
export async function resendPayslipEmail(payslipId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'accountant')) {
      return { success: false, error: 'Bạn không có quyền gửi lại email.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    const { data: row, error: rowErr } = await admin
      .from('payslips')
      .select('id, employee_id, net_pay, gross_pay, employee_status, payroll_period_id, employees(full_name, email), payroll_periods(month, year, branch_id, branches(name))')
      .eq('id', payslipId)
      .maybeSingle()

    if (rowErr) throw rowErr
    if (!row) return { success: false, error: 'Không tìm thấy phiếu lương.' }

    type FullPayslipRow = {
      id: string; employee_id: string; net_pay: number; gross_pay: number;
      employee_status: string; payroll_period_id: string;
      employees: { full_name: string; email: string } | null;
      payroll_periods: { month: number; year: number; branch_id: string; branches: { name: string } | null } | null;
    }
    const r = row as FullPayslipRow
    if (!r.employees?.email) return { success: false, error: 'Nhân viên không có email.' }
    if (['confirmed', 'disputed'].includes(r.employee_status)) {
      return { success: false, error: 'Phiếu đã được xác nhận/khiếu nại, không cần gửi lại.' }
    }

    const token = generateToken()
    const month = r.payroll_periods?.month ?? 0
    const year = r.payroll_periods?.year ?? 0
    const branchName = r.payroll_periods?.branches?.name ?? 'Luna HRM'
    const deadline = getDeadlineDate(CONFIRMATION_DAYS)
    const deadlineStr = formatDeadline(deadline)

    const confirmUrl = `${APP_URL}/confirm-payslip?token=${token}&action=confirm`
    const disputeUrl = `${APP_URL}/confirm-payslip?token=${token}&action=dispute`

    const result = await sendEmail({
      to: r.employees.email,
      subject: `Phiếu lương tháng ${month}/${year} — ${r.employees.full_name}`,
      html: buildPayslipEmailHtml({
        employeeName: r.employees.full_name,
        month,
        year,
        netPay: r.net_pay,
        grossPay: r.gross_pay,
        branchName,
        confirmUrl,
        disputeUrl,
        deadlineDate: deadlineStr,
      }),
    })

    if (!result.ok) return { success: false, error: `Gửi email thất bại: ${result.error}` }

    await admin
      .from('payslips')
      .update({
        confirmation_token: token,
        employee_status: 'sent',
        email_sent_at: new Date().toISOString(),
        reminder_sent_at: null,
      })
      .eq('id', payslipId)

    return { success: true }
  } catch (err) {
    console.error('[resendPayslipEmail]', err)
    return { success: false, error: 'Không thể gửi lại email.' }
  }
}
