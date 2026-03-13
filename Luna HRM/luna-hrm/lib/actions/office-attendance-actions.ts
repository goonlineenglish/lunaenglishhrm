'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekDates, getWeekStart, parseIsoDateLocal, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
import type { AttendanceStatus } from '@/lib/types/database'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface OfficeGridCell {
  status: AttendanceStatus | null
  isWorkDay: boolean
  existingId: string | null
}

export interface OfficeGridRow {
  employeeId: string
  employeeCode: string
  employeeName: string
  cells: Record<number, OfficeGridCell>
}

export interface OfficeGridData {
  rows: OfficeGridRow[]
  isLocked: boolean
  /** 'auto' = auto-locked by time, 'manual' = BM/admin locked, null = not locked */
  lockType: 'auto' | 'manual' | null
  hasOverride: boolean
}

export async function getOfficeAttendanceGrid(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult<OfficeGridData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canView = user.role === 'admin' || user.role === 'branch_manager'
    if (!canView) return { success: false, error: 'Bạn không có quyền xem chấm công VP.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: employees, error: empErr } = await sb
      .from('employees')
      .select('id, employee_code, full_name')
      .eq('branch_id', effectiveBranch)
      .eq('position', 'office')
      .eq('is_active', true)
      .order('employee_code')
    if (empErr) throw empErr

    if (!employees || employees.length === 0) {
      return { success: true, data: { rows: [], isLocked: false, lockType: null, hasOverride: false } }
    }

    const weekStart = getWeekStart(parseIsoDateLocal(weekStartStr))
    const weekDates = getWeekDates(weekStart)
    const dateFrom = toISODate(weekDates[0])
    const dateTo = toISODate(weekDates[6])
    const empIds = employees.map((e: { id: string }) => e.id)

    const { data: records, error: recErr } = await sb
      .from('office_attendance')
      .select('id, employee_id, date, status')
      .in('employee_id', empIds)
      .gte('date', dateFrom)
      .lte('date', dateTo)
    if (recErr) throw recErr

    const recMap = new Map<string, { id: string; status: AttendanceStatus }>()
    for (const r of (records ?? []) as { id: string; employee_id: string; date: string; status: AttendanceStatus }[]) {
      recMap.set(`${r.employee_id}:${r.date}`, { id: r.id, status: r.status })
    }

    // Multi-row lock query (max 2 rows per branch+week)
    const { data: lockRows } = await sb
      .from('attendance_locks')
      .select('id, is_override')
      .eq('branch_id', effectiveBranch)
      .eq('week_start', dateFrom)

    const hasManualLock = (lockRows ?? []).some((r: { is_override: boolean }) => !r.is_override)
    const hasOverride = (lockRows ?? []).some((r: { is_override: boolean }) => r.is_override)
    const autoLocked = isWeekLocked(weekStart)
    const isLocked = (autoLocked && !hasOverride) || hasManualLock
    const lockType: 'auto' | 'manual' | null = hasManualLock ? 'manual' : (autoLocked ? 'auto' : null)

    const rows: OfficeGridRow[] = (employees as { id: string; employee_code: string; full_name: string }[]).map((emp) => {
      const cells: Record<number, OfficeGridCell> = {}
      for (let i = 0; i < 7; i++) {
        const isoDay = i + 1
        const isWorkDay = isoDay >= 1 && isoDay <= 6
        const dateStr = toISODate(weekDates[i])
        const existing = recMap.get(`${emp.id}:${dateStr}`)
        cells[isoDay] = {
          status: existing ? existing.status : (isWorkDay ? '1' : null),
          isWorkDay,
          existingId: existing?.id ?? null,
        }
      }
      return { employeeId: emp.id, employeeCode: emp.employee_code, employeeName: emp.full_name, cells }
    })

    return { success: true, data: { rows, isLocked, lockType, hasOverride } }
  } catch (err) {
    console.error('[getOfficeAttendanceGrid]', err)
    return { success: false, error: 'Không thể tải chấm công VP.' }
  }
}

export interface OfficeSaveItem {
  employeeId: string
  date: string
  status: AttendanceStatus
}

export async function saveOfficeAttendanceBatch(
  branchId: string,
  weekStartStr: string,
  records: OfficeSaveItem[]
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canEdit = user.role === 'admin' || user.role === 'branch_manager'
    if (!canEdit) return { success: false, error: 'Bạn không có quyền lưu chấm công VP.' }

    if (records.length === 0) return { success: true }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const normalizedWeekStart = getWeekStart(parseIsoDateLocal(weekStartStr))
    const normalizedWeekStartStr = toISODate(normalizedWeekStart)

    if (isWeekLocked(normalizedWeekStart)) {
      const { data: overrideRow } = await sb
        .from('attendance_locks')
        .select('id')
        .eq('branch_id', effectiveBranch)
        .eq('week_start', normalizedWeekStartStr)
        .eq('is_override', true)
        .maybeSingle()
      if (!overrideRow) {
        return { success: false, error: 'Tuần này đã bị khoá tự động, không thể lưu.' }
      }
    }
    const { data: manualLockRow } = await sb
      .from('attendance_locks')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('week_start', normalizedWeekStartStr)
      .eq('is_override', false)
      .maybeSingle()
    if (manualLockRow) {
      return { success: false, error: 'Tuần này đã bị khoá, không thể lưu.' }
    }

    // Cross-month payroll guard
    const weekEndDate = new Date(normalizedWeekStart)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const startMonth = normalizedWeekStart.getMonth() + 1
    const startYear = normalizedWeekStart.getFullYear()
    const endMonth = weekEndDate.getMonth() + 1
    const endYear = weekEndDate.getFullYear()
    let payrollFilter = `and(month.eq.${startMonth},year.eq.${startYear})`
    if (startMonth !== endMonth || startYear !== endYear) {
      payrollFilter += `,and(month.eq.${endMonth},year.eq.${endYear})`
    }
    const { data: confirmedPeriod } = await sb
      .from('payroll_periods')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('status', 'confirmed')
      .or(payrollFilter)
      .limit(1)
      .maybeSingle()
    if (confirmedPeriod) {
      return { success: false, error: 'Không thể lưu — bảng lương tháng này đã được xác nhận.' }
    }

    const weekDates = getWeekDates(normalizedWeekStart)
    const validDates = new Set(weekDates.map(toISODate))
    if (records.find((r) => !validDates.has(r.date))) {
      return { success: false, error: 'Ngày chấm công nằm ngoài tuần đã chọn.' }
    }

    // Validate employees belong to branch and are office position
    const empIds = [...new Set(records.map((r) => r.employeeId))]
    const { data: empCheck, error: empErr } = await sb
      .from('employees')
      .select('id')
      .in('id', empIds)
      .eq('branch_id', effectiveBranch)
      .eq('position', 'office')
      .eq('is_active', true)
    if (empErr) throw empErr
    const validEmpIds = new Set((empCheck ?? []).map((e: { id: string }) => e.id))
    if (records.find((r) => !validEmpIds.has(r.employeeId))) {
      return { success: false, error: 'Một số nhân viên không thuộc chi nhánh hoặc không phải VP.' }
    }

    const upsertRows = records.map((r) => ({
      branch_id: effectiveBranch,
      employee_id: r.employeeId,
      date: r.date,
      status: r.status,
      marked_by: user.id,
    }))

    const { error: upsErr } = await sb
      .from('office_attendance')
      .upsert(upsertRows, { onConflict: 'employee_id,date' })
    if (upsErr) throw upsErr

    return { success: true }
  } catch (err) {
    console.error('[saveOfficeAttendanceBatch]', err)
    return { success: false, error: 'Không thể lưu chấm công VP.' }
  }
}
