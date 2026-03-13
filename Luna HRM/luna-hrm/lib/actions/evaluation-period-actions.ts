'use server'

/**
 * Evaluation period CRUD — admin-only mutations, admin+BM reads.
 * Periods define time-bounded windows for structured evaluations (e.g., "Kì 1/2026").
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { EvaluationPeriod } from '@/lib/types/database-evaluation-types'

// ─── Read: list all periods ───────────────────────────────────────────────────

export async function getEvaluationPeriods(): Promise<ActionResult<EvaluationPeriod[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return { success: false, error: 'Bạn không có quyền xem kỳ đánh giá.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data, error } = await sb
      .from('evaluation_periods')
      .select('*')
      .order('start_date', { ascending: false })
    if (error) throw error

    return { success: true, data: (data ?? []) as EvaluationPeriod[] }
  } catch (err) {
    console.error('[getEvaluationPeriods]', err)
    return { success: false, error: 'Không thể tải danh sách kỳ đánh giá.' }
  }
}

// ─── Create evaluation period (admin only) ────────────────────────────────────

export async function createEvaluationPeriod(
  data: { name: string; start_date: string; end_date: string }
): Promise<ActionResult<EvaluationPeriod>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin') return { success: false, error: 'Chỉ admin mới có thể tạo kỳ đánh giá.' }

    if (!data.name.trim()) return { success: false, error: 'Tên kỳ đánh giá không được để trống.' }
    if (!data.start_date || !data.end_date) {
      return { success: false, error: 'Ngày bắt đầu và ngày kết thúc không được để trống.' }
    }
    if (data.start_date >= data.end_date) {
      return { success: false, error: 'Ngày kết thúc phải sau ngày bắt đầu.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: period, error } = await sb
      .from('evaluation_periods')
      .insert({ ...data, status: 'open', created_by: user.id })
      .select()
      .single()
    if (error) throw error

    return { success: true, data: period as EvaluationPeriod }
  } catch (err) {
    console.error('[createEvaluationPeriod]', err)
    return { success: false, error: 'Không thể tạo kỳ đánh giá.' }
  }
}

// ─── Close evaluation period (admin only) ─────────────────────────────────────

export async function closeEvaluationPeriod(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin') return { success: false, error: 'Chỉ admin mới có thể đóng kỳ đánh giá.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Verify period exists and is open
    const { data: existing } = await sb
      .from('evaluation_periods')
      .select('status')
      .eq('id', id)
      .maybeSingle()
    if (!existing) return { success: false, error: 'Kỳ đánh giá không tồn tại.' }
    if (existing.status === 'closed') return { success: false, error: 'Kỳ đánh giá đã được đóng.' }

    const { error } = await sb
      .from('evaluation_periods')
      .update({ status: 'closed' })
      .eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('[closeEvaluationPeriod]', err)
    return { success: false, error: 'Không thể đóng kỳ đánh giá.' }
  }
}
