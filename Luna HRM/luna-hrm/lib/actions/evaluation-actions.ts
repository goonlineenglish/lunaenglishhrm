'use server'

/**
 * Evaluation query actions — list and detail views.
 * Admin: all access. BM: own branch only. Employee: own evaluations read-only.
 * Accountant: no access.
 * Save action (createEvaluation) lives in evaluation-save-actions.ts.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { checkBmBranchAccess } from '@/lib/actions/branch-access-helpers'
import { hasAnyRole } from '@/lib/types/user'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { EvaluationListRow, EvaluationDetail } from '@/lib/types/evaluation'

// ─── List evaluations for an employee ────────────────────────────────────────

export async function getEmployeeEvaluations(
  employeeId: string
): Promise<ActionResult<EvaluationListRow[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.roles.includes('accountant') && !hasAnyRole(user, 'admin', 'branch_manager')) return { success: false, error: 'Bạn không có quyền xem đánh giá nhân viên.' }
    // Employee: only own evaluations
    if (user.roles.includes('employee') && !hasAnyRole(user, 'admin', 'branch_manager') && user.id !== employeeId) {
      return { success: false, error: 'Bạn chỉ có thể xem đánh giá của mình.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: verify branch ownership
    if (user.roles.includes('branch_manager') && !user.roles.includes('admin')) {
      const err = await checkBmBranchAccess(sb, employeeId, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    const { data, error } = await sb
      .from('employee_evaluations')
      .select(`
        id, employee_id, evaluator_id, template_id, period_id,
        eval_type, total_score, status, created_at,
        evaluation_templates(name),
        evaluator:employees!evaluator_id(full_name)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows: EvaluationListRow[] = (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      employee_id: e.employee_id as string,
      evaluator_id: e.evaluator_id as string,
      evaluator_name: (e.evaluator as { full_name?: string })?.full_name ?? '—',
      template_id: e.template_id as string,
      template_name: (e.evaluation_templates as { name?: string })?.name ?? '—',
      period_id: e.period_id as string | null,
      eval_type: e.eval_type as string,
      total_score: e.total_score as number,
      status: e.status as string,
      created_at: e.created_at as string,
    }))

    return { success: true, data: rows }
  } catch (err) {
    console.error('[getEmployeeEvaluations]', err)
    return { success: false, error: 'Không thể tải danh sách đánh giá.' }
  }
}

// ─── Get evaluation detail with scores ───────────────────────────────────────

export async function getEvaluationDetail(
  evalId: string
): Promise<ActionResult<EvaluationDetail>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.roles.includes('accountant') && !hasAnyRole(user, 'admin', 'branch_manager')) return { success: false, error: 'Bạn không có quyền xem đánh giá nhân viên.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('employee_evaluations')
      .select(`
        *,
        evaluation_templates(name),
        evaluator:employees!evaluator_id(full_name),
        evaluation_scores(id, criterion_id, score, comment,
          evaluation_criteria(name, max_score))
      `)
      .eq('id', evalId)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy đánh giá.' }

    // Employee: only own evaluations
    if (user.roles.includes('employee') && !hasAnyRole(user, 'admin', 'branch_manager') && data.employee_id !== user.id) {
      return { success: false, error: 'Bạn chỉ có thể xem đánh giá của mình.' }
    }

    // BM: branch scoping
    if (user.roles.includes('branch_manager') && !user.roles.includes('admin')) {
      const err = await checkBmBranchAccess(sb, data.employee_id, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    const detail: EvaluationDetail = {
      id: data.id,
      employee_id: data.employee_id,
      evaluator_id: data.evaluator_id,
      evaluator_name: data.evaluator?.full_name ?? '—',
      template_id: data.template_id,
      template_name: data.evaluation_templates?.name ?? '—',
      period_id: data.period_id,
      eval_type: data.eval_type,
      total_score: data.total_score,
      overall_notes: data.overall_notes,
      bonus_impact: data.bonus_impact,
      status: data.status,
      created_at: data.created_at,
      scores: (data.evaluation_scores ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        criterion_id: s.criterion_id as string,
        criterion_name: (s.evaluation_criteria as { name?: string })?.name ?? '—',
        max_score: (s.evaluation_criteria as { max_score?: number })?.max_score ?? 0,
        score: s.score as number,
        comment: s.comment as string | null,
      })),
    }

    return { success: true, data: detail }
  } catch (err) {
    console.error('[getEvaluationDetail]', err)
    return { success: false, error: 'Không thể tải chi tiết đánh giá.' }
  }
}
