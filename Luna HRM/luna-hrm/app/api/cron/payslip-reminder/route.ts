/**
 * Payslip reminder cron — runs on day 2 after email sent.
 * Sends reminder emails to employees who haven't confirmed/disputed.
 * Idempotent: skips payslips where reminder_sent_at is already set.
 * Secured with CRON_SECRET (timing-safe comparison).
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBulkEmails } from '@/lib/services/email-service'
import { buildReminderEmailHtml } from '@/lib/services/email-templates'

function verifySecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

const REMINDER_AFTER_DAYS = 2
const CONFIRMATION_DAYS = 3

export async function GET(request: NextRequest) {
  if (!verifySecret(request.headers.get('x-cron-secret'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Payslips: sent status, 2+ days since email, no reminder sent yet, not expired
    const reminderCutoff = new Date()
    reminderCutoff.setDate(reminderCutoff.getDate() - REMINDER_AFTER_DAYS)
    const expiryCutoff = new Date()
    expiryCutoff.setDate(expiryCutoff.getDate() - CONFIRMATION_DAYS)

    const { data: payslips, error: fetchErr } = await admin
      .from('payslips')
      .select('id, net_pay, email_sent_at, employees(full_name, email), payroll_periods(month, year, branches(name))')
      .eq('employee_status', 'sent')
      .lt('email_sent_at', reminderCutoff.toISOString())
      .gt('email_sent_at', expiryCutoff.toISOString())  // not yet expired (auto-confirm handles those)
      .is('reminder_sent_at', null)

    if (fetchErr) throw fetchErr

    type PayslipRow = {
      id: string; net_pay: number; email_sent_at: string;
      employees: { full_name: string; email: string } | null;
      payroll_periods: { month: number; year: number; branches: { name: string } | null } | null;
    }

    const rows = (payslips ?? []) as PayslipRow[]
    if (rows.length === 0) {
      return NextResponse.json({ success: true, reminders_sent: 0 })
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const successIds: string[] = []

    const recipients = rows
      .filter((r) => r.employees?.email)
      .map((r) => {
        const emailSentAt = new Date(r.email_sent_at)
        const deadline = new Date(emailSentAt)
        deadline.setDate(deadline.getDate() + CONFIRMATION_DAYS)
        const daysLeft = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000))
        const deadlineStr = deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const month = r.payroll_periods?.month ?? 0
        const year = r.payroll_periods?.year ?? 0
        const branchName = r.payroll_periods?.branches?.name ?? 'Luna HRM'

        // Token already invalidated — use generic confirm page
        const confirmUrl = `${APP_URL}/my-payslips`
        const disputeUrl = `${APP_URL}/my-payslips`

        return {
          id: r.id,
          email: r.employees!.email,
          subject: `Nhắc nhở: Xác nhận phiếu lương tháng ${month}/${year}`,
          html: buildReminderEmailHtml({
            employeeName: r.employees!.full_name,
            month,
            year,
            netPay: r.net_pay,
            confirmUrl,
            disputeUrl,
            deadlineDate: deadlineStr,
            daysLeft,
          }),
        }
      })

    const results = await sendBulkEmails(recipients)
    for (let i = 0; i < recipients.length; i++) {
      if (results[i]?.ok) successIds.push(recipients[i].id)
    }

    // Mark reminder_sent_at for successful sends
    if (successIds.length > 0) {
      await admin
        .from('payslips')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', successIds)
    }

    console.log(`[payslip-reminder] Sent ${successIds.length}/${rows.length} reminders`)
    return NextResponse.json({ success: true, reminders_sent: successIds.length })
  } catch (err) {
    console.error('[payslip-reminder]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
