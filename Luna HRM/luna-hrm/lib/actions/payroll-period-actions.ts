'use server'

/** Server actions for payroll period CRUD: list, get, create, confirm, undo. */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { hasAnyRole } from '@/lib/types/user'
import { logAudit } from '@/lib/services/audit-log-service'
import type { PayrollPeriod } from '@/lib/types/database'
import type { ActionResult } from '@/lib/actions/employee-actions'

export interface PayrollPeriodWithCount extends PayrollPeriod {
  payslip_count: number
}

async function requirePayrollRole(actionLabel: string) {
  const user = await getCurrentUser()
  if (!user) return { error: { success: false, error: 'Chưa đăng nhập.' } as ActionResult<never> }
  if (!hasAnyRole(user, 'admin', 'accountant')) return { error: { success: false, error: `Bạn không có quyền ${actionLabel}.` } as ActionResult<never> }
  return { user }
}

async function getSupabaseClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await createClient() as any
}

export async function getPayrollPeriods(
  branchId?: string
): Promise<ActionResult<PayrollPeriodWithCount[]>> {
  try {
    const auth = await requirePayrollRole('xem bảng lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    let query = sb
      .from('payroll_periods')
      .select('*, payslips(count)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)

    const { data, error } = await query
    if (error) throw error

    const periods: PayrollPeriodWithCount[] = ((data as unknown[]) ?? []).map((row) => {
      const r = row as PayrollPeriod & { payslips: [{ count: number }] }
      const { payslips, ...rest } = r
      return { ...rest, payslip_count: payslips?.[0]?.count ?? 0 }
    })
    return { success: true, data: periods }
  } catch (err) {
    console.error('[getPayrollPeriods]', err)
    return { success: false, error: 'Không thể tải danh sách kỳ lương.' }
  }
}

export async function getPayrollPeriod(
  periodId: string
): Promise<ActionResult<PayrollPeriod>> {
  try {
    const auth = await requirePayrollRole('xem kỳ lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    const { data, error } = await sb
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy kỳ lương.' }
    return { success: true, data: data as PayrollPeriod }
  } catch (err) {
    console.error('[getPayrollPeriod]', err)
    return { success: false, error: 'Không thể tải kỳ lương.' }
  }
}

export async function createPayrollPeriod(
  branchId: string,
  month: number,
  year: number
): Promise<ActionResult<PayrollPeriod>> {
  try {
    const auth = await requirePayrollRole('tạo kỳ lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    // Check for duplicate (same branch + month + year)
    const { data: existing } = await sb
      .from('payroll_periods')
      .select('id')
      .eq('branch_id', branchId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      return { success: false, error: `Kỳ lương tháng ${month}/${year} đã tồn tại.` }
    }

    const { data, error } = await sb
      .from('payroll_periods')
      .insert({
        branch_id: branchId, month, year,
        status: 'draft', total_gross: 0, total_net: 0,
        created_by: auth.user!.id,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as PayrollPeriod }
  } catch (err) {
    console.error('[createPayrollPeriod]', err)
    return { success: false, error: 'Không thể tạo kỳ lương.' }
  }
}

export async function confirmPayrollPeriod(periodId: string): Promise<ActionResult> {
  try {
    const auth = await requirePayrollRole('xác nhận kỳ lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    const { data: period, error: fetchErr } = await sb
      .from('payroll_periods')
      .select('status')
      .eq('id', periodId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!period) return { success: false, error: 'Không tìm thấy kỳ lương.' }
    if ((period as { status: string }).status !== 'draft') {
      return { success: false, error: 'Chỉ có thể xác nhận kỳ lương đang ở trạng thái nháp.' }
    }

    // is_reviewed gate: all payslips must be reviewed before confirming
    const { data: unreviewed, error: reviewErr } = await sb
      .from('payslips')
      .select('id', { count: 'exact', head: true })
      .eq('payroll_period_id', periodId)
      .eq('is_reviewed', false)

    if (reviewErr) throw reviewErr

    // Use explicit variable to avoid operator-precedence pitfall (count ?? 0 > 0)
    const unreviewedCount = (unreviewed as { count: number } | null)?.count ?? 0
    if (unreviewedCount > 0) {
      return {
        success: false,
        error: `Còn ${unreviewedCount} phiếu lương chưa được kiểm tra. Vui lòng kiểm tra tất cả trước khi xác nhận.`,
      }
    }

    const { error } = await sb
      .from('payroll_periods')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', periodId)

    if (error) throw error

    logAudit({ tableName: 'payroll_periods', recordId: periodId, action: 'UPDATE', userId: auth.user!.id, userEmail: auth.user!.email, newData: { status: 'confirmed' } })
    return { success: true }
  } catch (err) {
    console.error('[confirmPayrollPeriod]', err)
    return { success: false, error: 'Không thể xác nhận kỳ lương.' }
  }
}

/** Undo confirm -- only within 24 hours of confirmation */
export async function undoPayrollPeriod(periodId: string): Promise<ActionResult> {
  try {
    const auth = await requirePayrollRole('hoàn tác kỳ lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    const { data: period, error: fetchErr } = await sb
      .from('payroll_periods')
      .select('status, confirmed_at')
      .eq('id', periodId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!period) return { success: false, error: 'Không tìm thấy kỳ lương.' }

    const p = period as { status: string; confirmed_at: string | null }
    if (p.status !== 'confirmed') {
      return { success: false, error: 'Chỉ có thể hoàn tác kỳ lương đã xác nhận.' }
    }
    if (p.confirmed_at) {
      const hoursSince = (Date.now() - new Date(p.confirmed_at).getTime()) / (1000 * 60 * 60)
      if (hoursSince > 24) {
        return { success: false, error: 'Chỉ có thể hoàn tác trong vòng 24 giờ sau khi xác nhận.' }
      }
    }

    const { error } = await sb
      .from('payroll_periods')
      .update({ status: 'draft', confirmed_at: null })
      .eq('id', periodId)

    if (error) throw error

    logAudit({ tableName: 'payroll_periods', recordId: periodId, action: 'UPDATE', userId: auth.user!.id, userEmail: auth.user!.email, newData: { status: 'draft' } })
    return { success: true }
  } catch (err) {
    console.error('[undoPayrollPeriod]', err)
    return { success: false, error: 'Không thể hoàn tác kỳ lương.' }
  }
}

/**
 * Finalize a payroll period (sent → finalized).
 * All payslips must be confirmed or auto-confirmed before calling.
 */
export async function finalizePayrollPeriod(periodId: string): Promise<ActionResult> {
  try {
    const auth = await requirePayrollRole('chốt kỳ lương')
    if (auth.error) return auth.error
    const sb = await getSupabaseClient()

    const { data: period, error: fetchErr } = await sb
      .from('payroll_periods')
      .select('status')
      .eq('id', periodId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!period) return { success: false, error: 'Không tìm thấy kỳ lương.' }
    if ((period as { status: string }).status !== 'sent') {
      return { success: false, error: 'Chỉ có thể chốt kỳ lương đang ở trạng thái đã gửi.' }
    }

    // Check that all payslips are confirmed or disputed (not pending/sent)
    const { count, error: countErr } = await sb
      .from('payslips')
      .select('id', { count: 'exact', head: true })
      .eq('payroll_period_id', periodId)
      .in('employee_status', ['pending_send', 'sent'])

    if (countErr) throw countErr
    const pending = count ?? 0
    if (pending > 0) {
      return {
        success: false,
        error: `Còn ${pending} phiếu lương chưa được xác nhận. Vui lòng chờ hoặc dùng auto-confirm.`,
      }
    }

    const { error } = await sb
      .from('payroll_periods')
      .update({ status: 'finalized' })
      .eq('id', periodId)

    if (error) throw error

    logAudit({
      tableName: 'payroll_periods',
      recordId: periodId,
      action: 'UPDATE',
      userId: auth.user!.id,
      userEmail: auth.user!.email,
      newData: { status: 'finalized' },
    })
    return { success: true }
  } catch (err) {
    console.error('[finalizePayrollPeriod]', err)
    return { success: false, error: 'Không thể chốt kỳ lương.' }
  }
}
