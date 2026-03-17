'use server'

/**
 * Employee payslip confirmation actions.
 * confirmMyPayslip  — employee clicks "Xác nhận" in email → token-based, admin client.
 * disputeMyPayslip  — employee clicks "Khiếu nại" in email → token-based, max 2 disputes.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/services/audit-log-service'
import type { ActionResult } from '@/lib/actions/employee-actions'

type ConfirmAction = 'confirm' | 'dispute'

export interface ConfirmPayslipInput {
  token: string
  action: ConfirmAction
  feedback?: string
}

/** Token-based confirm or dispute. No auth session required (email link flow). */
export async function confirmMyPayslip(
  input: ConfirmPayslipInput
): Promise<ActionResult<{ employeeName: string; month: number; year: number }>> {
  try {
    if (!input.token || !['confirm', 'dispute'].includes(input.action)) {
      return { success: false, error: 'Yêu cầu không hợp lệ.' }
    }
    if (input.action === 'dispute' && !input.feedback?.trim()) {
      return { success: false, error: 'Vui lòng ghi rõ lý do khiếu nại.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Look up payslip by token
    const { data: payslip, error: lookupErr } = await admin
      .from('payslips')
      .select('id, employee_id, employee_status, dispute_count, payroll_period_id, employees(full_name), payroll_periods(month, year)')
      .eq('confirmation_token', input.token)
      .maybeSingle()

    if (lookupErr) throw lookupErr
    if (!payslip) return { success: false, error: 'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.' }

    type PayslipRow = {
      id: string; employee_id: string; employee_status: string; dispute_count: number;
      payroll_period_id: string;
      employees: { full_name: string } | null;
      payroll_periods: { month: number; year: number } | null;
    }
    const row = payslip as PayslipRow

    // Idempotent: already confirmed → return success
    if (row.employee_status === 'confirmed' && input.action === 'confirm') {
      return {
        success: true,
        data: {
          employeeName: row.employees?.full_name ?? '',
          month: row.payroll_periods?.month ?? 0,
          year: row.payroll_periods?.year ?? 0,
        },
      }
    }

    // Dispute limit
    if (input.action === 'dispute' && row.dispute_count >= 2) {
      return { success: false, error: 'Bạn đã đạt giới hạn khiếu nại (tối đa 2 lần).' }
    }

    const now = new Date().toISOString()
    const updateData =
      input.action === 'confirm'
        ? {
            employee_status: 'confirmed',
            employee_confirmed_at: now,
            confirmation_token: null,
          }
        : {
            employee_status: 'disputed',
            employee_feedback: input.feedback?.trim(),
            dispute_count: row.dispute_count + 1,
            confirmation_token: null,
          }

    const { error: updateErr } = await admin
      .from('payslips')
      .update(updateData)
      .eq('id', row.id)

    if (updateErr) throw updateErr

    logAudit({
      tableName: 'payslips',
      recordId: row.id,
      action: 'UPDATE',
      newData: { employee_status: updateData.employee_status },
    })

    return {
      success: true,
      data: {
        employeeName: row.employees?.full_name ?? '',
        month: row.payroll_periods?.month ?? 0,
        year: row.payroll_periods?.year ?? 0,
      },
    }
  } catch (err) {
    console.error('[confirmMyPayslip]', err)
    return { success: false, error: 'Không thể xử lý yêu cầu xác nhận.' }
  }
}
