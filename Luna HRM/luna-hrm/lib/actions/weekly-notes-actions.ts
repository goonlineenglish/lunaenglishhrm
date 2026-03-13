'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekStart, toISODate, parseIsoDateLocal } from '@/lib/utils/date-helpers'
import type {
  EmployeeWeeklyNote, EmployeeWeeklyNoteInsert,
} from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ─── Note with employee name ────────────────────────────────────────────────

export interface NoteWithEmployee extends EmployeeWeeklyNote {
  employee_name: string
  employee_code: string
}

// ─── Get weekly notes ───────────────────────────────────────────────────────

export async function getWeeklyNotes(
  branchId: string,
  weekStartStr: string,
  employeeId?: string
): Promise<ActionResult<NoteWithEmployee[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = user.role === 'admin' || user.role === 'branch_manager' || user.role === 'accountant'
    if (!canView) return { success: false, error: 'Bạn không có quyền xem ghi chú.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    // Normalize weekStartStr to Monday (ISO week start)
    const normalizedWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    let query = sb
      .from('employee_weekly_notes')
      .select('*, employee:employees!employee_weekly_notes_employee_id_fkey(employee_code, full_name)')
      .eq('week_start', normalizedWeekStart)
      .order('created_at', { ascending: false })

    if (effectiveBranch) query = query.eq('branch_id', effectiveBranch)
    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query
    if (error) throw error

    type RawRow = EmployeeWeeklyNote & {
      employee: { employee_code: string; full_name: string } | null
    }
    const notes: NoteWithEmployee[] = ((data ?? []) as RawRow[]).map((n) => ({
      ...n,
      employee_name: n.employee?.full_name ?? '—',
      employee_code: n.employee?.employee_code ?? '—',
      employee: undefined,
    }))

    return { success: true, data: notes }
  } catch (err) {
    console.error('[getWeeklyNotes]', err)
    return { success: false, error: 'Không thể tải ghi chú tuần.' }
  }
}

// ─── Create weekly note ─────────────────────────────────────────────────────

export async function createWeeklyNote(
  data: Omit<EmployeeWeeklyNoteInsert, 'created_by' | 'is_processed' | 'processed_by'>
): Promise<ActionResult<EmployeeWeeklyNote>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canCreate = user.role === 'admin' || user.role === 'branch_manager'
    if (!canCreate) return { success: false, error: 'Bạn không có quyền tạo ghi chú.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const branchId = user.role === 'branch_manager' ? user.branch_id! : data.branch_id

    // BM: validate employee belongs to own branch
    if (user.role === 'branch_manager') {
      const { data: emp } = await sb
        .from('employees')
        .select('branch_id')
        .eq('id', data.employee_id)
        .maybeSingle()
      if (!emp || emp.branch_id !== user.branch_id) {
        return { success: false, error: 'Nhân viên không thuộc chi nhánh của bạn.' }
      }
    }

    const { data: note, error } = await sb
      .from('employee_weekly_notes')
      .insert({
        ...data,
        branch_id: branchId,
        created_by: user.id,
        is_processed: false,
        processed_by: null,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: note as EmployeeWeeklyNote }
  } catch (err) {
    console.error('[createWeeklyNote]', err)
    return { success: false, error: 'Không thể tạo ghi chú.' }
  }
}

// ─── Delete weekly note ─────────────────────────────────────────────────────

export async function deleteWeeklyNote(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canDelete = user.role === 'admin' || user.role === 'branch_manager'
    if (!canDelete) return { success: false, error: 'Bạn không có quyền xoá ghi chú.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: verify the note belongs to own branch
    if (user.role === 'branch_manager') {
      const { data: noteRow } = await sb
        .from('employee_weekly_notes')
        .select('branch_id')
        .eq('id', id)
        .maybeSingle()
      if (!noteRow || noteRow.branch_id !== user.branch_id) {
        return { success: false, error: 'Ghi chú không thuộc chi nhánh của bạn.' }
      }
    }

    const { error } = await sb.from('employee_weekly_notes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deleteWeeklyNote]', err)
    return { success: false, error: 'Không thể xoá ghi chú.' }
  }
}

// ─── Mark note as processed (accountant) ────────────────────────────────────

export async function markNoteProcessed(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canProcess = user.role === 'admin' || user.role === 'accountant'
    if (!canProcess) return { success: false, error: 'Chỉ kế toán mới duyệt ghi chú.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { error } = await sb
      .from('employee_weekly_notes')
      .update({ is_processed: true, processed_by: user.id })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[markNoteProcessed]', err)
    return { success: false, error: 'Không thể duyệt ghi chú.' }
  }
}
