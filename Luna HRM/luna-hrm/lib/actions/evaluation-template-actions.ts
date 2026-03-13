'use server'

/**
 * Evaluation template CRUD — admin-only mutations, admin+BM reads.
 * Templates are reusable scoring rubrics (name, applies_to, criteria[]).
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { EvaluationTemplate } from '@/lib/types/database-evaluation-types'
import type {
  EvaluationTemplateWithCount,
  EvaluationTemplateDetail,
  CriterionInput,
} from '@/lib/types/evaluation'

// ─── Read: list templates with criteria count ─────────────────────────────────

export async function getEvaluationTemplates(): Promise<ActionResult<EvaluationTemplateWithCount[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return { success: false, error: 'Bạn không có quyền xem mẫu đánh giá.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('evaluation_templates')
      .select('id, name, applies_to, max_total_score, is_active, created_at, evaluation_criteria(id)')
      .order('created_at', { ascending: false })
    if (error) throw error

    const rows: EvaluationTemplateWithCount[] = (data ?? []).map(
      (t: EvaluationTemplate & { evaluation_criteria: { id: string }[] }) => ({
        id: t.id,
        name: t.name,
        applies_to: t.applies_to,
        max_total_score: t.max_total_score,
        is_active: t.is_active,
        created_at: t.created_at,
        criteria_count: Array.isArray(t.evaluation_criteria) ? t.evaluation_criteria.length : 0,
      })
    )

    return { success: true, data: rows }
  } catch (err) {
    console.error('[getEvaluationTemplates]', err)
    return { success: false, error: 'Không thể tải danh sách mẫu đánh giá.' }
  }
}

// ─── Read: single template with criteria ─────────────────────────────────────

export async function getEvaluationTemplate(id: string): Promise<ActionResult<EvaluationTemplateDetail>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return { success: false, error: 'Bạn không có quyền xem mẫu đánh giá.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('evaluation_templates')
      .select('*, evaluation_criteria(id, template_id, name, description, max_score, weight, sort_order)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Không tìm thấy mẫu đánh giá.' }

    const detail: EvaluationTemplateDetail = {
      ...data,
      criteria: (data.evaluation_criteria ?? []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      ),
    }

    return { success: true, data: detail }
  } catch (err) {
    console.error('[getEvaluationTemplate]', err)
    return { success: false, error: 'Không thể tải mẫu đánh giá.' }
  }
}

// ─── Create template + criteria (admin only) ─────────────────────────────────

export async function createEvaluationTemplate(
  template: { name: string; applies_to: string; max_total_score: number },
  criteria: CriterionInput[]
): Promise<ActionResult<EvaluationTemplate>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin') return { success: false, error: 'Chỉ admin mới có thể tạo mẫu đánh giá.' }
    if (!template.name.trim()) return { success: false, error: 'Tên mẫu không được để trống.' }
    if (criteria.length === 0) return { success: false, error: 'Mẫu cần ít nhất 1 tiêu chí.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: tmpl, error: tmplErr } = await sb
      .from('evaluation_templates')
      .insert({ ...template, created_by: user.id, is_active: true })
      .select()
      .single()
    if (tmplErr) throw tmplErr

    const criteriaRows = criteria.map((c, idx) => ({
      template_id: tmpl.id,
      name: c.name,
      description: c.description ?? null,
      max_score: c.max_score,
      weight: c.weight ?? 1.0,
      sort_order: c.sort_order ?? idx,
    }))

    const { error: critErr } = await sb.from('evaluation_criteria').insert(criteriaRows)
    if (critErr) {
      // Rollback orphaned template if criteria insert fails
      await sb.from('evaluation_templates').delete().eq('id', tmpl.id)
      throw critErr
    }

    return { success: true, data: tmpl as EvaluationTemplate }
  } catch (err) {
    console.error('[createEvaluationTemplate]', err)
    return { success: false, error: 'Không thể tạo mẫu đánh giá.' }
  }
}

// ─── Update template + replace criteria (admin only) ─────────────────────────

export async function updateEvaluationTemplate(
  id: string,
  template: { name?: string; applies_to?: string; max_total_score?: number },
  criteria: CriterionInput[]
): Promise<ActionResult<EvaluationTemplate>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin') return { success: false, error: 'Chỉ admin mới có thể sửa mẫu đánh giá.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: tmpl, error: tmplErr } = await sb
      .from('evaluation_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single()
    if (tmplErr) throw tmplErr

    // P0-4: Block criteria replacement if template has existing evaluations (FK RESTRICT)
    const { count: evalCount } = await sb
      .from('employee_evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)
    if (evalCount && evalCount > 0) {
      return { success: false, error: 'Không thể sửa tiêu chí — mẫu đã có đánh giá. Vô hiệu và tạo mẫu mới.' }
    }

    // Replace criteria: delete old, insert new
    const { error: delErr } = await sb.from('evaluation_criteria').delete().eq('template_id', id)
    if (delErr) throw delErr

    if (criteria.length > 0) {
      const criteriaRows = criteria.map((c, idx) => ({
        template_id: id,
        name: c.name,
        description: c.description ?? null,
        max_score: c.max_score,
        weight: c.weight ?? 1.0,
        sort_order: c.sort_order ?? idx,
      }))
      const { error: critErr } = await sb.from('evaluation_criteria').insert(criteriaRows)
      if (critErr) throw critErr
    }

    return { success: true, data: tmpl as EvaluationTemplate }
  } catch (err) {
    console.error('[updateEvaluationTemplate]', err)
    return { success: false, error: 'Không thể cập nhật mẫu đánh giá.' }
  }
}

// ─── Deactivate template (admin only) ────────────────────────────────────────

export async function deactivateTemplate(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin') return { success: false, error: 'Chỉ admin mới có thể vô hiệu hóa mẫu đánh giá.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('evaluation_templates')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('[deactivateTemplate]', err)
    return { success: false, error: 'Không thể vô hiệu hóa mẫu đánh giá.' }
  }
}
