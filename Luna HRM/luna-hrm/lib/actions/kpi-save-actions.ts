'use server'

/**
 * KPI evaluation save (upsert) action.
 * Validates scores, calculates totals, and upserts to kpi_evaluations.
 * Attendance sessions are recomputed server-side — client-provided values are ignored.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logAudit } from '@/lib/services/audit-log-service'
import { calculateTotalScore, calculateKpiBonus, validateAllScores } from '@/lib/services/kpi-calculation-service'
import { getMonthBounds } from '@/lib/utils/date-helpers'
import { countTeachingSessions, getSubstituteSessions, countScheduledSessions } from '@/lib/services/payroll-session-counter'
import { hasAnyRole } from '@/lib/types/user'
import type { KpiEvaluation, KpiEvaluationInsert } from '@/lib/types/database'
import type { ActionResult } from '@/lib/actions/employee-actions'

// ─── Save (upsert) KPI evaluation ─────────────────────────────────────────────

export async function saveKpiEvaluation(
  data: KpiEvaluationInsert
): Promise<ActionResult<KpiEvaluation>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'branch_manager')) {
      return { success: false, error: 'Bạn không có quyền lưu KPI.' }
    }

    if (user.roles.includes('branch_manager') && !user.roles.includes('admin') && data.branch_id !== user.branch_id) {
      return { success: false, error: 'Bạn không có quyền lưu KPI cho cơ sở này.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Verify target employee is an active assistant in the correct branch
    const { data: emp, error: empErr } = await sb
      .from('employees')
      .select('id, position, branch_id, is_active')
      .eq('id', data.employee_id)
      .maybeSingle()
    if (empErr || !emp) return { success: false, error: 'Nhân viên không tồn tại.' }
    if (emp.position !== 'assistant') return { success: false, error: 'Chỉ đánh giá KPI cho trợ giảng.' }
    if (!emp.is_active) return { success: false, error: 'Nhân viên đã ngừng hoạt động.' }
    if (data.branch_id !== emp.branch_id) return { success: false, error: 'Chi nhánh không khớp với nhân viên.' }

    const scoreError = validateAllScores({
      tsi: data.tsi_score,
      funtime: data.funtime_score,
      parent: data.parent_score,
      student: data.student_score,
      demeanor: data.demeanor_score,
    })
    if (scoreError) return { success: false, error: scoreError }

    const total_score = calculateTotalScore({
      tsi: data.tsi_score,
      funtime: data.funtime_score,
      parent: data.parent_score,
      student: data.student_score,
      demeanor: data.demeanor_score,
    })

    // Server-side attendance recompute — ignore client-provided values to prevent manipulation
    const { startDate, endDate } = getMonthBounds(data.month, data.year)
    const [sessions_worked, substitute_sessions, total_scheduled_sessions] = await Promise.all([
      countTeachingSessions(sb, data.employee_id, startDate, endDate),
      getSubstituteSessions(sb, data.employee_id, startDate, endDate),
      countScheduledSessions(sb, data.employee_id, startDate, endDate),
    ])

    const bonus_amount = calculateKpiBonus(
      total_score,
      data.base_pass,
      sessions_worked,
      substitute_sessions,
      total_scheduled_sessions,
    )

    const payload: KpiEvaluationInsert = {
      ...data,
      total_score,
      bonus_amount,
      sessions_worked,
      substitute_sessions,
      total_scheduled_sessions,
      evaluated_by: user.id,
    }

    const { data: saved, error } = await sb
      .from('kpi_evaluations')
      .upsert(payload, { onConflict: 'employee_id,month,year' })
      .select()
      .single()
    if (error) throw error

    logAudit({ tableName: 'kpi_evaluations', recordId: (saved as KpiEvaluation).id, action: 'UPDATE', userId: user.id, userEmail: user.email, newData: { employee_id: data.employee_id, month: data.month, year: data.year, total_score } })
    return { success: true, data: saved as KpiEvaluation }
  } catch (err) {
    console.error('[saveKpiEvaluation]', err)
    return { success: false, error: 'Không thể lưu KPI đánh giá.' }
  }
}
