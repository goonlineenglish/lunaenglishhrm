'use server'

/**
 * Employee notes actions — BM/admin create, list, delete per-employee notes.
 * Note types: praise | warning | observation | general
 * Employee CANNOT see notes (HR-sensitive data). BM scoped to own branch.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { checkBmBranchAccess } from '@/lib/actions/branch-access-helpers'
import type { ActionResult } from '@/lib/actions/employee-actions'
import type { EmployeeNote, EmployeeNoteType } from '@/lib/types/database-evaluation-types'

// ─── List notes for an employee (admin + BM only, NOT employee) ───────────────

export async function getEmployeeNotes(
  employeeId: string
): Promise<ActionResult<(EmployeeNote & { author_name?: string })[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role === 'employee' || user.role === 'accountant') {
      return { success: false, error: 'Bạn không có quyền xem ghi chú nhân viên.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: branch scoping
    if (user.role === 'branch_manager') {
      const err = await checkBmBranchAccess(sb, employeeId, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    const { data, error } = await sb
      .from('employee_notes')
      .select(`*, author:employees!author_id(full_name)`)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const notes = (data ?? []).map((n: Record<string, unknown>) => ({
      ...(n as unknown as EmployeeNote),
      author_name: (n.author as { full_name?: string })?.full_name ?? '—',
    }))

    return { success: true, data: notes }
  } catch (err) {
    console.error('[getEmployeeNotes]', err)
    return { success: false, error: 'Không thể tải ghi chú nhân viên.' }
  }
}

// ─── Create note (BM/admin only) ─────────────────────────────────────────────

export async function createEmployeeNote(input: {
  employee_id: string
  note_type: EmployeeNoteType
  content: string
}): Promise<ActionResult<EmployeeNote>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return { success: false, error: 'Không có quyền thêm ghi chú.' }
    }
    if (!input.content.trim()) return { success: false, error: 'Nội dung ghi chú không được để trống.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // BM: branch scoping
    if (user.role === 'branch_manager') {
      const err = await checkBmBranchAccess(sb, input.employee_id, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    const { data, error } = await sb
      .from('employee_notes')
      .insert({
        employee_id: input.employee_id,
        author_id: user.id,
        note_type: input.note_type,
        content: input.content.trim(),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as EmployeeNote }
  } catch (err) {
    console.error('[createEmployeeNote]', err)
    return { success: false, error: 'Không thể tạo ghi chú.' }
  }
}

// ─── Delete note (only author or admin) ──────────────────────────────────────

export async function deleteEmployeeNote(noteId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return { success: false, error: 'Không có quyền xóa ghi chú.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Fetch note to verify authorship
    const { data: note } = await sb
      .from('employee_notes')
      .select('author_id, employee_id')
      .eq('id', noteId)
      .maybeSingle()
    if (!note) return { success: false, error: 'Ghi chú không tồn tại.' }

    // BM: must be author and own the employee's branch
    if (user.role === 'branch_manager') {
      if (note.author_id !== user.id) {
        return { success: false, error: 'Bạn chỉ có thể xóa ghi chú do mình tạo.' }
      }
      const err = await checkBmBranchAccess(sb, note.employee_id, user.branch_id ?? null)
      if (err) return { success: false, error: err }
    }

    const { error } = await sb.from('employee_notes').delete().eq('id', noteId)
    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('[deleteEmployeeNote]', err)
    return { success: false, error: 'Không thể xóa ghi chú.' }
  }
}
