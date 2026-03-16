'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getMonthBounds } from '@/lib/utils/date-helpers'
import { countTeachingSessions, getSubstituteSessions, countScheduledSessions } from '@/lib/services/payroll-session-counter'
import type { KpiEvaluation } from '@/lib/types/database'
import type { AssistantKpiStatus } from '@/lib/types/kpi'
import type { ActionResult } from '@/lib/actions/employee-actions'

function canAccessKpi(role: string): boolean {
  return role === 'admin' || role === 'branch_manager'
}

export async function getAssistantsWithKpiStatus(
  branchId: string,
  month: number,
  year: number
): Promise<ActionResult<AssistantKpiStatus[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!canAccessKpi(user.role)) return { success: false, error: 'Bạn không có quyền xem KPI.' }

    const effectiveBranch = user.role === 'branch_manager' ? (user.branch_id ?? branchId) : branchId
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: employees, error: empErr } = await sb
      .from('employees')
      .select('id, employee_code, full_name')
      .eq('branch_id', effectiveBranch)
      .eq('position', 'assistant')
      .eq('is_active', true)
      .order('full_name')
    if (empErr) throw empErr

    if (!employees || employees.length === 0) return { success: true, data: [] }

    const employeeIds = employees.map((e: { id: string }) => e.id)
    const { data: evaluations, error: kpiErr } = await sb
      .from('kpi_evaluations')
      .select('employee_id, total_score, bonus_amount')
      .eq('month', month)
      .eq('year', year)
      .in('employee_id', employeeIds)
    if (kpiErr) throw kpiErr

    const evalMap = new Map<string, { total_score: number; bonus_amount: number }>()
    for (const ev of (evaluations ?? [])) {
      evalMap.set(ev.employee_id, { total_score: ev.total_score, bonus_amount: ev.bonus_amount })
    }

    const { data: schedules, error: schErr } = await sb
      .from('class_schedules')
      .select('assistant_id, class_code')
      .eq('branch_id', effectiveBranch)
      .eq('status', 'active')
      .in('assistant_id', employeeIds)
    if (schErr) throw schErr

    const classMap = new Map<string, string>()
    for (const sch of (schedules ?? [])) {
      if (!classMap.has(sch.assistant_id)) classMap.set(sch.assistant_id, sch.class_code)
    }

    const result: AssistantKpiStatus[] = employees.map((emp: { id: string; employee_code: string; full_name: string }) => {
      const ev = evalMap.get(emp.id)
      return {
        employee_id: emp.id, employee_code: emp.employee_code, employee_name: emp.full_name,
        class_code: classMap.get(emp.id) ?? null,
        total_score: ev?.total_score ?? null, bonus_amount: ev?.bonus_amount ?? null,
        is_evaluated: evalMap.has(emp.id),
      }
    })

    return { success: true, data: result }
  } catch (err) {
    console.error('[getAssistantsWithKpiStatus]', err)
    return { success: false, error: 'Không thể tải danh sách KPI trợ giảng.' }
  }
}

export async function getKpiEvaluation(
  employeeId: string,
  month: number,
  year: number
): Promise<ActionResult<KpiEvaluation | null>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!canAccessKpi(user.role)) return { success: false, error: 'Bạn không có quyền xem KPI.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    if (user.role === 'branch_manager') {
      const { data: emp } = await sb.from('employees').select('branch_id').eq('id', employeeId).maybeSingle()
      if (!emp || emp.branch_id !== user.branch_id) return { success: false, error: 'Bạn không có quyền xem KPI này.' }
    }

    const { data, error } = await sb
      .from('kpi_evaluations').select('*')
      .eq('employee_id', employeeId).eq('month', month).eq('year', year)
      .maybeSingle()
    if (error) throw error

    return { success: true, data: (data as KpiEvaluation) ?? null }
  } catch (err) {
    console.error('[getKpiEvaluation]', err)
    return { success: false, error: 'Không thể tải KPI đánh giá.' }
  }
}

export async function getPreviousKpi(
  employeeId: string,
  month: number,
  year: number
): Promise<ActionResult<KpiEvaluation | null>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!canAccessKpi(user.role)) return { success: false, error: 'Bạn không có quyền xem KPI.' }

    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    if (user.role === 'branch_manager') {
      const { data: emp } = await sb.from('employees').select('branch_id').eq('id', employeeId).maybeSingle()
      if (!emp || emp.branch_id !== user.branch_id) return { success: false, error: 'Bạn không có quyền xem KPI này.' }
    }

    const { data, error } = await sb
      .from('kpi_evaluations').select('*')
      .eq('employee_id', employeeId).eq('month', prevMonth).eq('year', prevYear)
      .maybeSingle()
    if (error) throw error

    return { success: true, data: (data as KpiEvaluation) ?? null }
  } catch (err) {
    console.error('[getPreviousKpi]', err)
    return { success: false, error: 'Không thể tải KPI tháng trước.' }
  }
}

export async function getKpiHistory(
  employeeId: string,
  months = 6
): Promise<ActionResult<KpiEvaluation[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!canAccessKpi(user.role)) return { success: false, error: 'Bạn không có quyền xem lịch sử KPI.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb.from('kpi_evaluations').select('*').eq('employee_id', employeeId)
    if (user.role === 'branch_manager' && user.branch_id) {
      query = query.eq('branch_id', user.branch_id)
    }

    const { data, error } = await query
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(months)
    if (error) throw error

    return { success: true, data: (data ?? []) as KpiEvaluation[] }
  } catch (err) {
    console.error('[getKpiHistory]', err)
    return { success: false, error: 'Không thể tải lịch sử KPI.' }
  }
}

// ─── Attendance sessions for KPI bonus calculation ────────────────────────────

export interface KpiAttendanceSessions {
  sessionsWorked: number
  substituteSessions: number
  totalScheduled: number
}

/**
 * Fetch attendance data needed for KPI bonus calculation.
 * Returns sessions_worked, substitute_sessions, total_scheduled_sessions for the month.
 * Used by KPI form to display live bonus preview and by save action.
 */
export async function getAssistantAttendanceSessions(
  employeeId: string,
  month: number,
  year: number,
): Promise<ActionResult<KpiAttendanceSessions>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!canAccessKpi(user.role)) return { success: false, error: 'Bạn không có quyền xem KPI.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Branch ownership check — same pattern as getKpiEvaluation / getPreviousKpi
    if (user.role === 'branch_manager') {
      const { data: emp } = await sb.from('employees').select('branch_id').eq('id', employeeId).maybeSingle()
      if (!emp || emp.branch_id !== user.branch_id) {
        return { success: false, error: 'Bạn không có quyền xem dữ liệu công của nhân viên này.' }
      }
    }

    const { startDate, endDate } = getMonthBounds(month, year)

    const [worked, sub, scheduled] = await Promise.all([
      countTeachingSessions(sb, employeeId, startDate, endDate),
      getSubstituteSessions(sb, employeeId, startDate, endDate),
      countScheduledSessions(sb, employeeId, startDate, endDate),
    ])

    return {
      success: true,
      data: { sessionsWorked: worked, substituteSessions: sub, totalScheduled: scheduled },
    }
  } catch (err) {
    console.error('[getAssistantAttendanceSessions]', err)
    return { success: false, error: 'Không thể tải dữ liệu công của trợ giảng.' }
  }
}
