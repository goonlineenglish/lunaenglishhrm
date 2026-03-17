'use server'

/**
 * Evaluation save action — create employee_evaluations + evaluation_scores.
 * Extracted from evaluation-actions.ts for file size compliance.
 * BM: scoped to own branch employees. Admin: all access.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { checkBmBranchAccess } from '@/lib/actions/branch-access-helpers'
import { hasAnyRole } from '@/lib/types/user'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { ScoreInput } from '@/lib/types/evaluation'

// ─── Create evaluation with scores ────────────────────────────────────────────

export async function createEvaluation(input: {
  employee_id: string
  template_id: string
  period_id?: string | null
  eval_type: 'periodic' | 'ad_hoc'
  overall_notes?: string | null
  bonus_impact?: number | null
  scores: ScoreInput[]
}): Promise<ActionResult<string>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (!hasAnyRole(user, 'admin', 'branch_manager')) {
      return { success: false, error: 'Không có quyền tạo đánh giá.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: verify target employee is in own branch
    if (user.roles.includes('branch_manager') && !user.roles.includes('admin')) {
      const err = await checkBmBranchAccess(sb, input.employee_id, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    // Fetch template: validate is_active + applies_to + get criteria for score validation
    const { data: tmpl } = await sb
      .from('evaluation_templates')
      .select('id, is_active, applies_to')
      .eq('id', input.template_id)
      .maybeSingle()
    if (!tmpl) return { success: false, error: 'Mẫu đánh giá không tồn tại.' }
    if (!tmpl.is_active) return { success: false, error: 'Mẫu đánh giá đã vô hiệu.' }

    // Validate applies_to matches employee position (P1-1)
    const { data: emp } = await sb
      .from('employees').select('position').eq('id', input.employee_id).maybeSingle()
    if (!emp) return { success: false, error: 'Nhân viên không tồn tại.' }
    if (tmpl.applies_to !== 'all' && tmpl.applies_to !== emp.position) {
      return { success: false, error: 'Mẫu đánh giá không phù hợp với vị trí nhân viên.' }
    }

    // Validate period is open if periodic (P1-3)
    if (input.period_id) {
      const { data: period } = await sb
        .from('evaluation_periods').select('status').eq('id', input.period_id).maybeSingle()
      if (!period) return { success: false, error: 'Kỳ đánh giá không tồn tại.' }
      if (period.status !== 'open') return { success: false, error: 'Kỳ đánh giá đã đóng.' }
    }

    // Fetch criteria for score bounds + weight validation (P0-2, P0-3)
    const { data: tmplCriteria, error: tmplErr } = await sb
      .from('evaluation_criteria')
      .select('id, max_score, weight')
      .eq('template_id', input.template_id)
    if (tmplErr) throw tmplErr

    const criteriaMap = new Map<string, { max_score: number; weight: number }>(
      (tmplCriteria ?? []).map((c: { id: string; max_score: number; weight: number }) =>
        [c.id, { max_score: c.max_score, weight: c.weight }] as [string, { max_score: number; weight: number }]
      )
    )

    // Validate scores (P0-2)
    for (const s of input.scores) {
      const crit = criteriaMap.get(s.criterion_id)
      if (!crit) return { success: false, error: `Tiêu chí không tồn tại: ${s.criterion_id}` }
      if (s.score < 0 || s.score > crit.max_score) {
        return { success: false, error: `Điểm phải từ 0 đến ${crit.max_score}.` }
      }
    }

    // Weighted total score (P0-3)
    let totalScore = 0
    for (const s of input.scores) {
      const crit = criteriaMap.get(s.criterion_id)
      totalScore += (s.score ?? 0) * (crit?.weight ?? 1)
    }

    const { data: evalRow, error: evalErr } = await sb
      .from('employee_evaluations')
      .insert({
        employee_id: input.employee_id,
        evaluator_id: user.id,
        template_id: input.template_id,
        period_id: input.period_id ?? null,
        eval_type: input.eval_type,
        total_score: totalScore,
        overall_notes: input.overall_notes ?? null,
        bonus_impact: input.bonus_impact ?? null,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (evalErr) throw evalErr

    if (input.scores.length > 0) {
      const scoreRows = input.scores.map((s) => ({
        evaluation_id: evalRow.id,
        criterion_id: s.criterion_id,
        score: s.score,
        comment: s.comment ?? null,
      }))
      const { error: scoreErr } = await sb.from('evaluation_scores').insert(scoreRows)
      if (scoreErr) throw scoreErr
    }

    return { success: true, data: evalRow.id as string }
  } catch (err) {
    console.error('[createEvaluation]', err)
    return { success: false, error: 'Không thể lưu đánh giá.' }
  }
}
