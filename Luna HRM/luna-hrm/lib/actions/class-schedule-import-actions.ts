'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logAudit } from '@/lib/services/audit-log-service'
import { hasAnyRole } from '@/lib/types/user'
import type { ActionResult } from './class-schedule-query-actions'

export interface BatchImportRow {
  class_code: string
  class_name: string
  shift_time: string
  days_of_week: string[]
  teacher_code: string
  assistant_code: string
}

export interface BatchImportResult {
  success: boolean
  imported_count: number
  errors: { class_code: string; message: string }[]
}

const MAX_IMPORT_ROWS = 500

/** Batch import parsed schedules from Excel. Admin + BM only. */
export async function batchImportClassSchedules(
  schedules: BatchImportRow[],
  branchId: string
): Promise<BatchImportResult> {
  const errors: { class_code: string; message: string }[] = []

  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, imported_count: 0, errors: [{ class_code: '', message: 'Chưa đăng nhập.' }] }

    const canImport = hasAnyRole(user, 'admin', 'branch_manager')
    if (!canImport) return { success: false, imported_count: 0, errors: [{ class_code: '', message: 'Bạn không có quyền nhập lịch lớp.' }] }

    // Server-side row limit (P0-2)
    if (schedules.length > MAX_IMPORT_ROWS) {
      return { success: false, imported_count: 0, errors: [{ class_code: '', message: `Tối đa ${MAX_IMPORT_ROWS} lớp mỗi lần nhập.` }] }
    }

    const isBM = user.roles.includes('branch_manager')
    const effectiveBranch = isBM ? user.branch_id! : branchId
    if (!effectiveBranch) return { success: false, imported_count: 0, errors: [{ class_code: '', message: 'Chưa chọn chi nhánh.' }] }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Pre-load employee codes for the branch
    const { data: emps, error: empErr } = await sb
      .from('employees')
      .select('id, employee_code, position')
      .eq('branch_id', effectiveBranch)
      .eq('is_active', true)
    if (empErr) throw empErr

    type EmpRow = { id: string; employee_code: string; position: string }
    const empMap = new Map<string, EmpRow>()
    for (const e of (emps ?? []) as EmpRow[]) empMap.set(e.employee_code, e)

    // Validate all rows first, collect valid inserts (P0-3: batch insert)
    const validInserts: Record<string, unknown>[] = []
    for (const row of schedules) {
      const teacher = empMap.get(row.teacher_code)
      if (!teacher) { errors.push({ class_code: row.class_code, message: `Không tìm thấy GV mã ${row.teacher_code}.` }); continue }
      if (teacher.position !== 'teacher') { errors.push({ class_code: row.class_code, message: `${row.teacher_code} không phải giáo viên.` }); continue }

      const assistant = empMap.get(row.assistant_code)
      if (!assistant) { errors.push({ class_code: row.class_code, message: `Không tìm thấy TG mã ${row.assistant_code}.` }); continue }
      if (assistant.position !== 'assistant') { errors.push({ class_code: row.class_code, message: `${row.assistant_code} không phải trợ giảng.` }); continue }

      validInserts.push({
        branch_id: effectiveBranch,
        class_code: row.class_code,
        class_name: row.class_name,
        shift_time: row.shift_time,
        days_of_week: row.days_of_week,
        teacher_id: teacher.id,
        assistant_id: assistant.id,
        status: 'active',
      })
    }

    let imported_count = 0
    if (validInserts.length > 0) {
      const { error: batchErr } = await sb.from('class_schedules').insert(validInserts)
      if (batchErr) {
        const msg = batchErr.message ?? ''
        const friendly = (msg.includes('unique') || msg.includes('duplicate'))
          ? 'Mã lớp đã tồn tại — kiểm tra lại danh sách.'
          : `Lỗi nhập hàng loạt: ${msg}`
        errors.push({ class_code: '', message: friendly })
      } else {
        imported_count = validInserts.length
      }
    }

    // Audit log for batch import (P1-4)
    if (imported_count > 0) {
      logAudit({
        tableName: 'class_schedules',
        recordId: effectiveBranch,
        action: 'INSERT',
        userId: user.id,
        userEmail: user.email,
        newData: { batch_count: imported_count, source: 'excel_import' },
      })
    }

    return { success: true, imported_count, errors }
  } catch (err) {
    console.error('[batchImportClassSchedules]', err)
    return { success: false, imported_count: 0, errors: [...errors, { class_code: '', message: 'Lỗi nhập liệu.' }] }
  }
}
