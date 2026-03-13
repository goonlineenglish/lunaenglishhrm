# Phase 1: Server Action + Types

**Priority:** High
**Status:** ✅ completed
**Effort:** ~45 min (actual: completed)

## Context Links
- Brainstorm: `plans/reports/brainstorm-260309-attendance-summary-by-class.md`
- Existing session counter: `lib/services/payroll-session-counter.ts`
- Existing grid query pattern: `lib/actions/attendance-query-actions.ts` (two-step: schedules → attendance)
- Barrel pattern: `lib/actions/attendance-actions.ts`
- Types: `lib/types/database-schedule-types.ts`
- Date helpers: `lib/utils/date-helpers.ts` (`getWeekStart`, `getWeekEnd`, `toISODate`)
- Month bounds: `lib/actions/payroll-calculate-actions.ts` → `getMonthBounds()` (MUST extract to date-helpers first)

## Overview

Create server action that aggregates attendance data per employee per class for a given week, plus cộng dồn tháng. Two entry points: `getAttendanceSummary()` (admin/BM/accountant — full branch) and `getMyAttendanceSummary()` (employee — own data only).

## Pre-requisite Step: Extract `getMonthBounds`

**ISSUE-2 fix**: `getMonthBounds(month, year)` currently lives inside `lib/actions/payroll-calculate-actions.ts` and is NOT exported. Extract to `lib/utils/date-helpers.ts` as a shared export. Update payroll-calculate-actions to import from date-helpers.

```typescript
// In lib/utils/date-helpers.ts — add:
export function getMonthBounds(month: number, year: number): { startDate: string; endDate: string } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // last day of month
  return { startDate: toISODate(start), endDate: toISODate(end) }
}
```

## New Files

### 1. `lib/types/attendance-summary-types.ts` (NEW)

```typescript
/** Per-class session count for one employee */
export interface ClassSessionSummary {
  class_code: string
  class_name: string
  sessions: number // 0.5 granularity
}

/** Aggregated attendance summary for one employee */
export interface AttendanceSummaryItem {
  employee_id: string
  employee_code: string
  full_name: string
  position: string // 'teacher' | 'assistant' | 'office' | 'admin'
  classes: ClassSessionSummary[]
  total_week: number
  total_month: number
}

/** Full response from getAttendanceSummary */
export interface AttendanceSummaryData {
  items: AttendanceSummaryItem[]
  week_start: string // ISO date
  month: number
  year: number
}
```

### 2. `lib/actions/attendance-summary-actions.ts` (NEW, ~150 lines)

```
'use server'

Imports: createClient, getCurrentUser, getWeekEnd, getMonthBounds, toISODate, parseIsoDateLocal
Types: ActionResult, AttendanceSummaryItem, AttendanceSummaryData

--- Internal helpers ---

async function queryTeachingSummary(sb, branchId, startDate, endDate, employeeId?: string):
  // ISSUE-1 FIX: Use proven two-query pattern from getAttendanceGrid
  // Step 1: Get schedule IDs for this branch
  const { data: schedules } = await sb
    .from('class_schedules')
    .select('id, class_code, class_name')
    .eq('branch_id', branchId)
    .eq('status', 'active')

  if (!schedules?.length) return new Map()
  const scheduleIds = schedules.map(s => s.id)
  const scheduleMap = new Map(schedules.map(s => [s.id, s])) // id → {class_code, class_name}

  // Step 2: Query attendance by schedule_ids
  let query = sb.from('attendance')
    .select('employee_id, schedule_id, status')
    .in('schedule_id', scheduleIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  // ISSUE-4 FIX: employee filter for portal
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data: rows } = await query

  // Step 3: Aggregate in JS
  // Map<employee_id, Map<class_code, { class_name, sessions }>>
  const result = new Map()
  for (const row of rows ?? []) {
    const schedule = scheduleMap.get(row.schedule_id)
    if (!schedule) continue
    const empMap = result.get(row.employee_id) ?? new Map()
    const cls = empMap.get(schedule.class_code) ?? { class_name: schedule.class_name, sessions: 0 }
    cls.sessions += row.status === '0.5' ? 0.5 : 1
    empMap.set(schedule.class_code, cls)
    result.set(row.employee_id, empMap)
  }
  return result

async function queryOfficeSummary(sb, branchId, startDate, endDate, employeeId?: string):
  // office_attendance WHERE branch_id = branchId AND date BETWEEN
  let query = sb.from('office_attendance')
    .select('employee_id, status')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  // ISSUE-4 FIX: employee filter for portal
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data: rows } = await query
  const result = new Map()
  for (const row of rows ?? []) {
    result.set(row.employee_id, (result.get(row.employee_id) ?? 0) + (row.status === '0.5' ? 0.5 : 1))
  }
  return result

async function queryEmployeeInfo(sb, branchId, employeeId?: string):
  let query = sb.from('employees')
    .select('id, employee_code, full_name, position')
    .eq('branch_id', branchId)
    .eq('is_active', true)
  if (employeeId) query = query.eq('id', employeeId)
  return query

function buildSummaryItems(
  weekTeachingMap, weekOfficeMap,
  monthTeachingMap, monthOfficeMap,
  employees
) → AttendanceSummaryItem[]
  // ISSUE-10 FIX: Iterate ALL employees, default to 0 if no records
  // Teaching staff: classes[] from teachingMap, VP: empty classes[]
  // For each employee:
  //   - If teaching: get class breakdown from weekTeachingMap, total from sum
  //   - If office/admin: get total from weekOfficeMap
  //   - total_month: same logic from monthTeachingMap/monthOfficeMap
  //   - If NO records: total_week=0, total_month=0, classes=[]
  // Sort by employee_code

--- Public actions ---

export async function getAttendanceSummary(
  branchId: string,
  weekStartStr: string,
  month: number,
  year: number
): Promise<ActionResult<AttendanceSummaryData>>
  // Auth: admin, branch_manager, accountant
  // BM branch guard: user.branch_id must match branchId
  // Compute: weekEnd from getWeekEnd(parseIsoDateLocal(weekStartStr))
  // Compute: monthStart/monthEnd from getMonthBounds(month, year) — EXPLICIT params, not derived
  // Parallel queries:
  //   [weekTeaching, weekOffice, monthTeaching, monthOffice, employees] = Promise.all(...)
  // Build + return AttendanceSummaryData

export async function getMyAttendanceSummary(
  month: number,
  year: number
): Promise<ActionResult<AttendanceSummaryData>>
  // ISSUE-9 FIX: Accept month/year explicitly, not weekStartStr
  // Auth: employee only
  // Get user.id + user.branch_id from JWT
  // Compute: weekStart = getWeekStart(new Date()) for current week view
  // Compute: monthStart/monthEnd from getMonthBounds(month, year)
  // Pass employeeId to all query helpers (ISSUE-4 FIX: defense-in-depth)
  // Return single-item array
```

### 3. Update barrel: `lib/actions/attendance-actions.ts`

Add re-exports:
```typescript
export type { AttendanceSummaryData } from './attendance-summary-actions'
export { getAttendanceSummary, getMyAttendanceSummary } from './attendance-summary-actions'
```

## Implementation Notes

**Query pattern**: Use proven two-query approach from `getAttendanceGrid()` (ISSUE-1 fix):
1. Query `class_schedules` by `branch_id` → get `schedule_ids[]` + class metadata
2. Query `attendance` by `.in('schedule_id', scheduleIds)` → filter at DB level
3. Aggregate in JS with the schedule metadata map

This avoids: untested `!inner` syntax, unbounded admin queries, branch leakage.

**Month params**: `month` and `year` passed as explicit parameters (ISSUE-5/ISSUE-9 fix). Never derived from weekStart. Prevents wrong-month bug when month starts mid-week.

**Employee filter (ISSUE-4)**: `getMyAttendanceSummary` adds `.eq('employee_id', user.id)` at query level — defense-in-depth on top of RLS.

**Data consistency caveat (ISSUE-6)**: The branch-scoped summary total may theoretically differ from `countTeachingSessions()` (which has no branch filter). For the employee portal, we match payroll counter exactly by filtering only by employee_id. For admin view, the branch scope is correct for the UX purpose. Document this in code comments.

## Validation

- [x] Extract `getMonthBounds` to date-helpers, payroll import updated
- [x] `getAttendanceSummary` returns correct session counts per class
- [x] `getMyAttendanceSummary` returns only user's own data + `.eq('employee_id')` applied
- [x] Week + month totals match `countTeachingSessions()` / `countOfficeDays()`
- [x] Role guard: admin/BM/accountant only for branch view
- [x] Branch guard: BM can only see own branch
- [x] VP staff: no class breakdown, just total
- [x] Employees with 0 attendance show total_week=0, total_month=0

## Risk

| Risk | Mitigation |
|------|------------|
| `class_schedules` query returns many rows | Max ~20 classes per branch — trivial |
| Employee in multiple branches | Not possible — employees.branch_id is single value |
| Branch-scoped totals ≠ payroll totals | Documented caveat — different scoping by design |
