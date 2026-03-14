# Phase 3: Init Logic — Populate class_breakdown

**Priority:** High
**Status:** ✅ completed
**Effort:** ~1.5h (actual: completed)
**Depends on:** Phase 1 (types + migration)

## Context Links

- Init actions: `lib/actions/payroll-calculate-actions.ts` (334 lines)
- Session counter: `lib/services/payroll-session-counter.ts`
- Prefill service: `lib/services/payroll-prefill-service.ts`
- Attendance summary: `lib/actions/attendance-summary-actions.ts` (queryTeachingSummary pattern)
- Types: `lib/types/database-payroll-types.ts` (ClassBreakdownEntry)

## Overview

During `initializePayslips()`, populate `class_breakdown` JSONB for each teaching employee. Office/admin staff get empty array. `sessions_worked` and `teaching_pay` are derived from the breakdown sum.

## Key Design

```
For each teaching employee (teacher/assistant):
  1. Query attendance per class for the payroll month
  2. Resolve rate per class:
     - Find class_schedule where teacher_id or assistant_id = employee_id
     - Rate = schedule.{position}_rate ?? employee.rate_per_session
  3. Build ClassBreakdownEntry[] array
  4. sessions_worked = sum(entry.sessions)
  5. teaching_pay = sum(entry.amount) where amount = sessions × rate

For office/admin:
  - class_breakdown = []
  - sessions_worked = countOfficeDays() (existing)
  - teaching_pay = sessions_worked × rate_per_session (existing)
```

## File Changes

### 1. `lib/actions/payroll-calculate-actions.ts` (EDIT — moderate)

**New helper function** (~40 lines):

```typescript
import type { ClassBreakdownEntry } from '@/lib/types/database-payroll-types'

/**
 * Build class_breakdown[] for a teaching employee.
 * Queries attendance per class for the payroll month,
 * resolves rate from schedule or employee default.
 */
async function buildClassBreakdown(
  sb: any,
  employeeId: string,
  branchId: string,
  position: string, // 'teacher' | 'assistant'
  defaultRate: number,
  startDate: string,
  endDate: string
): Promise<ClassBreakdownEntry[]> {
  // Step 1: Get schedules where this employee is assigned
  const roleCol = position === 'teacher' ? 'teacher_id' : 'assistant_id'
  const rateCol = position === 'teacher' ? 'teacher_rate' : 'assistant_rate'

  // ISSUE-2 FIX: Do NOT filter by status='active' — deactivated classes
  // that have attendance in the month must still appear in breakdown.
  // The attendance records are the source of truth, not schedule status.
  const { data: schedules, error: schErr } = await sb
    .from('class_schedules')
    .select(`id, class_code, class_name, ${rateCol}`)
    .eq('branch_id', branchId)
    .eq(roleCol, employeeId)

  if (schErr) throw schErr
  if (!schedules?.length) return []

  const scheduleIds = schedules.map((s: any) => s.id)

  // Step 2: Query attendance for those schedules in the month
  const { data: rows, error: attErr } = await sb
    .from('attendance')
    .select('schedule_id, status')
    .eq('employee_id', employeeId)
    .in('schedule_id', scheduleIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  if (attErr) throw attErr

  // Step 3: Aggregate sessions per class
  const sessionMap = new Map<string, number>()
  for (const row of rows ?? []) {
    const current = sessionMap.get(row.schedule_id) ?? 0
    sessionMap.set(row.schedule_id, current + (row.status === '0.5' ? 0.5 : 1))
  }

  // Step 4: Build entries with rate resolution
  return schedules.map((sch: any) => {
    const sessions = sessionMap.get(sch.id) ?? 0
    const rate = sch[rateCol] ?? defaultRate
    return {
      class_code: sch.class_code,
      class_name: sch.class_name,
      sessions,
      rate,
      amount: sessions * rate,
      default_sessions: sessions,
      default_rate: rate,
    }
  }).filter((e: ClassBreakdownEntry) => e.sessions > 0) // Omit classes with 0 sessions
    .sort((a: ClassBreakdownEntry, b: ClassBreakdownEntry) => a.class_code.localeCompare(b.class_code))
}
```

**Modify `initializePayslips()`** loop — for teaching employees:

```typescript
// Replace existing session counting logic for teaching staff:
const isTeaching = emp.position === 'teacher' || emp.position === 'assistant'

let classBreakdown: ClassBreakdownEntry[] = []
let sessionsWorked: number
let teachingPay: number

if (isTeaching) {
  classBreakdown = await buildClassBreakdown(
    sb, emp.id, period.branch_id, emp.position,
    emp.rate_per_session, startDate, endDate
  )
  sessionsWorked = classBreakdown.reduce((sum, e) => sum + e.sessions, 0)
  teachingPay = classBreakdown.reduce((sum, e) => sum + e.amount, 0)
} else {
  // Office/admin — existing logic
  sessionsWorked = await countOfficeDays(sb, emp.id, period.branch_id, startDate, endDate)
  teachingPay = sessionsWorked * emp.rate_per_session
}

// In payslipData object, add:
class_breakdown: classBreakdown,
sessions_worked: sessionsWorked,
teaching_pay: teachingPay,
// ISSUE-3 FIX: For multi-class employees, use weighted average rate
// instead of first class rate. Portal detail page will show per-class rows.
rate_per_session: isTeaching
  ? (sessionsWorked > 0 ? Math.round(teachingPay / sessionsWorked) : emp.rate_per_session)
  : emp.rate_per_session,
```

**Same modification for `reinitializePayslips()`** — identical logic.

### 2. `lib/services/payroll-session-counter.ts` (EDIT — minor)

`countTeachingSessions()` is still used for the attendance summary panel elsewhere. No changes needed — just ensure it's not the source of truth for payroll init anymore (replaced by `buildClassBreakdown` for teaching staff).

## Implementation Steps

1. Add `buildClassBreakdown()` helper to payroll-calculate-actions.ts
2. Modify `initializePayslips()` — use `buildClassBreakdown` for teaching staff, keep `countOfficeDays` for office/admin
3. Add `class_breakdown` to payslipData object in upsert
4. Apply same changes to `reinitializePayslips()`
5. `npm run build` to verify
6. Test: initialize a payroll period → verify class_breakdown JSONB populated in Supabase

## Validation

- [ ] Teaching employees get class_breakdown[] with correct sessions per class
- [ ] Rate resolved: schedule.{position}_rate ?? employee.rate_per_session
- [ ] sessions_worked = sum(class sessions)
- [ ] teaching_pay = sum(sessions × rate per class)
- [ ] Office/admin get empty class_breakdown[] and use existing countOfficeDays logic
- [ ] Classes with 0 sessions omitted from breakdown
- [ ] Reinitialize follows same logic
- [ ] Build passes
- [ ] payroll-calculate-actions.ts stays under 400 lines (currently 334, adding ~50)

## Risk

| Risk | Mitigation |
|------|-----------|
| N+1 queries per employee for schedule lookup | Each employee queries only their own schedules — max 5-10 classes, fast |
| Class breakdown inconsistent with countTeachingSessions | buildClassBreakdown is now source of truth for payroll init |
| Rate changes after init | Snapshot pattern — default_rate preserved for reset comparison |
