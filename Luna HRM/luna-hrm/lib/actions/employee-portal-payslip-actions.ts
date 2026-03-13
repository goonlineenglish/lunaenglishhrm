'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { Payslip } from '@/lib/types/database'
import type { ActionResult } from './employee-portal-attendance-actions'

export interface MyPayslipSummary {
  id: string
  month: number
  year: number
  net_pay: number
  status: string
}

export interface MyPayslipDetail extends Payslip {
  period_month: number
  period_year: number
}

export async function getMyPayslips(): Promise<ActionResult<MyPayslipSummary[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('payslips')
      .select('id, net_pay, payroll_periods(month, year, status)')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    type RawRow = {
      id: string
      net_pay: number
      payroll_periods: { month: number; year: number; status: string } | null
    }

    const list: MyPayslipSummary[] = ((data ?? []) as RawRow[])
      .filter((row) => row.payroll_periods && row.payroll_periods.status !== 'draft')
      .map((row) => ({
        id: row.id,
        month: row.payroll_periods!.month,
        year: row.payroll_periods!.year,
        net_pay: row.net_pay,
        status: row.payroll_periods!.status,
      }))

    return { success: true, data: list }
  } catch (err) {
    console.error('[getMyPayslips]', err)
    return { success: false, error: 'Không thể tải danh sách phiếu lương.' }
  }
}

export async function getMyPayslipDetail(
  payslipId: string
): Promise<ActionResult<MyPayslipDetail>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('payslips')
      .select('*, payroll_periods(month, year, status)')
      .eq('id', payslipId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy phiếu lương.' }

    type PayslipWithPeriod = Payslip & { payroll_periods: { month: number; year: number; status: string } | null }
    const raw = data as PayslipWithPeriod
    if (!raw.payroll_periods || raw.payroll_periods.status === 'draft') {
      return { success: false, error: 'Phiếu lương chưa được xác nhận.' }
    }

    const { payroll_periods: period, ...payslip } = raw

    if (payslip.employee_id !== user.id) {
      return { success: false, error: 'Bạn không có quyền xem phiếu lương này.' }
    }

    return { success: true, data: { ...payslip, period_month: period!.month, period_year: period!.year } }
  } catch (err) {
    console.error('[getMyPayslipDetail]', err)
    return { success: false, error: 'Không thể tải phiếu lương.' }
  }
}
