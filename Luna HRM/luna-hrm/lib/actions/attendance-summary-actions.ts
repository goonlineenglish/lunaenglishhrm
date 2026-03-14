'use server'

/**
 * Attendance summary by class — aggregate sessions per employee per class.
 * Two entry points:
 *   - getAttendanceSummary: admin/BM/accountant — full branch view
 *   - getMyAttendanceSummary: employee — own data only
 *
 * Query pattern: two-step (class_schedules → attendance) matching getAttendanceGrid.
 * Month bounds: explicit month/year params — never derived from weekStart.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getWeekStart, getWeekEnd, parseIsoDateLocal, toISODate, getMonthBounds } from '@/lib/utils/date-helpers'
import type { ActionResult } from '@/lib/actions/attendance-query-actions'
import type { AttendanceSummaryData, AttendanceSummaryItem, ClassSessionSummary } from '@/lib/types/attendance-summary-types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch teaching attendance aggregated by employee + class for a date range.
 * Returns Map<employee_id, Map<class_code, { class_name, sessions }>>
 *
 * Two-query pattern: first get schedules by branch, then attendance by schedule_ids.
 * This avoids unbounded cross-branch queries (ISSUE-1 fix).
 */
async function queryTeachingSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  startDate: string,
  endDate: string,
  employeeId?: string
): Promise<Map<string, Map<string, ClassSessionSummary>>> {
  // Step 1: Get class schedules for this branch.
  // NOTE: Do NOT filter by status='active' — attendance records may reference
  // deactivated classes within the period, and payroll counts ALL sessions.
  const { data: schedules, error: schErr } = await sb
    .from('class_schedules')
    .select('id, class_code, class_name')
    .eq('branch_id', branchId)

  if (schErr) throw schErr
  if (!schedules?.length) return new Map()

  const scheduleIds = schedules.map((s: { id: string }) => s.id)
  const scheduleMap = new Map<string, { class_code: string; class_name: string }>(
    schedules.map((s: { id: string; class_code: string; class_name: string }) => [s.id, s])
  )

  // Step 2: Query attendance filtered by those schedule_ids
  let query = sb
    .from('attendance')
    .select('employee_id, schedule_id, status')
    .in('schedule_id', scheduleIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  // Defense-in-depth employee filter for portal (ISSUE-4 fix)
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data: rows, error: rowErr } = await query
  if (rowErr) throw rowErr

  // Step 3: Aggregate in JS
  const result = new Map<string, Map<string, ClassSessionSummary>>()
  for (const row of rows ?? []) {
    const schedule = scheduleMap.get(row.schedule_id)
    if (!schedule) continue

    const empMap = result.get(row.employee_id) ?? new Map<string, ClassSessionSummary>()
    const cls = empMap.get(schedule.class_code) ?? {
      class_code: schedule.class_code,
      class_name: schedule.class_name,
      sessions: 0,
    }
    cls.sessions += row.status === '0.5' ? 0.5 : 1
    empMap.set(schedule.class_code, cls)
    result.set(row.employee_id, empMap)
  }
  return result
}

/**
 * Fetch VP (office) attendance totals per employee for a date range.
 * Returns Map<employee_id, totalDays>
 */
async function queryOfficeSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  startDate: string,
  endDate: string,
  employeeId?: string
): Promise<Map<string, number>> {
  let query = sb
    .from('office_attendance')
    .select('employee_id, status')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data: rows, error } = await query
  if (error) throw error

  const result = new Map<string, number>()
  for (const row of rows ?? []) {
    result.set(row.employee_id, (result.get(row.employee_id) ?? 0) + (row.status === '0.5' ? 0.5 : 1))
  }
  return result
}

/**
 * Fetch employee info for a branch (or a single employee).
 */
async function queryEmployeeInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  branchId: string,
  employeeId?: string
) {
  let query = sb
    .from('employees')
    .select('id, employee_code, full_name, position')
    .eq('branch_id', branchId)
    .eq('is_active', true)

  if (employeeId) query = query.eq('id', employeeId)

  const { data, error } = await query.order('employee_code')
  if (error) throw error
  return data ?? []
}

/**
 * Build AttendanceSummaryItem[] from aggregated maps.
 * Iterates ALL employees — defaults to 0 for those with no records (ISSUE-10 fix).
 */
function buildSummaryItems(
  weekTeachingMap: Map<string, Map<string, ClassSessionSummary>>,
  weekOfficeMap: Map<string, number>,
  monthTeachingMap: Map<string, Map<string, ClassSessionSummary>>,
  monthOfficeMap: Map<string, number>,
  employees: Array<{ id: string; employee_code: string; full_name: string; position: string }>
): AttendanceSummaryItem[] {
  return employees.map((emp) => {
    const isOffice = emp.position === 'office' || emp.position === 'admin'

    if (isOffice) {
      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        position: emp.position,
        classes: [],
        month_classes: [],
        total_week: weekOfficeMap.get(emp.id) ?? 0,
        total_month: monthOfficeMap.get(emp.id) ?? 0,
      }
    }

    // Teaching staff: week class breakdown (for /attendance tab)
    const weekClsMap = weekTeachingMap.get(emp.id)
    const classes: ClassSessionSummary[] = weekClsMap
      ? Array.from(weekClsMap.values()).sort((a, b) => a.class_code.localeCompare(b.class_code))
      : []

    // Month class breakdown (for /my-attendance and /payroll surfaces — ISSUE-1 fix)
    const monthClsMap = monthTeachingMap.get(emp.id)
    const month_classes: ClassSessionSummary[] = monthClsMap
      ? Array.from(monthClsMap.values()).sort((a, b) => a.class_code.localeCompare(b.class_code))
      : []

    const total_week = classes.reduce((sum, c) => sum + c.sessions, 0)
    const total_month = month_classes.reduce((sum, c) => sum + c.sessions, 0)

    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      position: emp.position,
      classes,
      month_classes,
      total_week,
      total_month,
    }
  })
}

// ─── Public actions ───────────────────────────────────────────────────────────

/**
 * Get attendance summary for a full branch (admin / BM / accountant).
 *
 * @param branchId - Branch to query
 * @param weekStartStr - ISO date for week start (current display week)
 * @param month - Explicit month (1-12) for cumulative totals — NOT derived from weekStart
 * @param year - Explicit year for cumulative totals
 */
export async function getAttendanceSummary(
  branchId: string,
  weekStartStr: string,
  month: number,
  year: number
): Promise<ActionResult<AttendanceSummaryData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const allowed = user.role === 'admin' || user.role === 'branch_manager' || user.role === 'accountant'
    if (!allowed) return { success: false, error: 'Bạn không có quyền xem tổng hợp công.' }

    // BM/accountant: resolve effective branch from JWT first, then validate
    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    if (!effectiveBranch) return { success: false, error: 'Chưa chọn chi nhánh.' }

    // Input validation
    if (month < 1 || month > 12 || !Number.isInteger(month)) return { success: false, error: 'Tháng không hợp lệ.' }
    if (year < 2020 || year > 2099 || !Number.isInteger(year)) return { success: false, error: 'Năm không hợp lệ.' }

    // BM branch guard — reject cross-branch requests
    if (user.role === 'branch_manager' && branchId && branchId !== user.branch_id) {
      return { success: false, error: 'Bạn chỉ có thể xem chi nhánh của mình.' }
    }
    // Accountant branch guard
    if (user.role === 'accountant' && user.branch_id && branchId !== user.branch_id) {
      return { success: false, error: 'Bạn chỉ có thể xem chi nhánh của mình.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const weekStart = getWeekStart(parseIsoDateLocal(weekStartStr))
    const weekEnd = getWeekEnd(weekStart)
    const weekStartISO = toISODate(weekStart)
    const weekEndISO = toISODate(weekEnd)

    const { startDate: monthStart, endDate: monthEnd } = getMonthBounds(month, year)

    const [weekTeaching, weekOffice, monthTeaching, monthOffice, employees] = await Promise.all([
      queryTeachingSummary(sb, effectiveBranch, weekStartISO, weekEndISO),
      queryOfficeSummary(sb, effectiveBranch, weekStartISO, weekEndISO),
      queryTeachingSummary(sb, effectiveBranch, monthStart, monthEnd),
      queryOfficeSummary(sb, effectiveBranch, monthStart, monthEnd),
      queryEmployeeInfo(sb, effectiveBranch),
    ])

    const items = buildSummaryItems(weekTeaching, weekOffice, monthTeaching, monthOffice, employees)

    return {
      success: true,
      data: { items, week_start: weekStartISO, month, year },
    }
  } catch (err) {
    console.error('getAttendanceSummary error:', err)
    return { success: false, error: 'Không thể tải tổng hợp công.' }
  }
}

/**
 * Get own attendance summary for the employee portal.
 * Accepts explicit month/year — NOT derived from weekStart (ISSUE-9 fix).
 *
 * @param month - Explicit month (1-12)
 * @param year - Explicit year
 */
export async function getMyAttendanceSummary(
  month: number,
  year: number
): Promise<ActionResult<AttendanceSummaryData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    // Any authenticated user can view their own summary — not just 'employee' role.
    // BM or admin who are also assigned to classes can see their own data too.
    if (!user.branch_id) return { success: false, error: 'Tài khoản chưa được gán chi nhánh.' }

    // Input validation
    if (month < 1 || month > 12 || !Number.isInteger(month)) return { success: false, error: 'Tháng không hợp lệ.' }
    if (year < 2020 || year > 2099 || !Number.isInteger(year)) return { success: false, error: 'Năm không hợp lệ.' }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Current week for the week breakdown view
    const weekStart = getWeekStart(new Date())
    const weekEnd = getWeekEnd(weekStart)
    const weekStartISO = toISODate(weekStart)
    const weekEndISO = toISODate(weekEnd)

    const { startDate: monthStart, endDate: monthEnd } = getMonthBounds(month, year)

    // Defense-in-depth: pass employeeId to all queries (on top of RLS)
    const employeeId = user.id

    const [weekTeaching, weekOffice, monthTeaching, monthOffice, employees] = await Promise.all([
      queryTeachingSummary(sb, user.branch_id, weekStartISO, weekEndISO, employeeId),
      queryOfficeSummary(sb, user.branch_id, weekStartISO, weekEndISO, employeeId),
      queryTeachingSummary(sb, user.branch_id, monthStart, monthEnd, employeeId),
      queryOfficeSummary(sb, user.branch_id, monthStart, monthEnd, employeeId),
      queryEmployeeInfo(sb, user.branch_id, employeeId),
    ])

    const items = buildSummaryItems(weekTeaching, weekOffice, monthTeaching, monthOffice, employees)

    return {
      success: true,
      data: { items, week_start: weekStartISO, month, year },
    }
  } catch (err) {
    console.error('getMyAttendanceSummary error:', err)
    return { success: false, error: 'Không thể tải tổng hợp công.' }
  }
}
