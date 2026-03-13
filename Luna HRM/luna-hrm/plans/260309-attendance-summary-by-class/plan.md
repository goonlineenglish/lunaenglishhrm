---
status: completed
created: 2026-03-09
feature: Attendance Summary by Class
scope: 5 files new, 4 files edit
effort: small (~2-3h)
reviewed: adversarial review round 1, 11 issues → all fixed
completed: 2026-03-11
---

# Plan: Tổng Hợp Công Theo Lớp (Attendance Summary by Class)

**Brainstorm:** `plans/reports/brainstorm-260309-attendance-summary-by-class.md`

## Phases

| # | Phase | Status | Files |
|---|-------|--------|-------|
| 1 | Server Action + Types | ✅ completed | 2 new, 2 edit (extract getMonthBounds + barrel) |
| 2 | Shared UI Component | ✅ completed | 1 new |
| 3 | Mount ở 3 vị trí | ✅ completed | 1 new (extracted component), 3 edit |

## Key Decisions

- Card/list dọc layout (user confirmed)
- **Two-query pattern** (schedules → attendance) — proven, matches getAttendanceGrid (ISSUE-1 fix)
- **Explicit month/year params** — never derived from weekStart (ISSUE-5/9 fix)
- **Extract getMonthBounds** to date-helpers (ISSUE-2 fix)
- **employee_id filter** at query level for portal (ISSUE-4 fix, defense-in-depth)
- **No forceMount** on summary tab — lazy render prevents unnecessary fetches (ISSUE-8 fix)
- **PayrollAttendanceSummary extracted** to separate component (ISSUE-11 fix)
- VP staff: 1 card, no class breakdown
- Employees with 0 records: show total_week=0, total_month=0 (ISSUE-10 fix)
- Accountants: summary visible only on payroll page (ISSUE-7 documented)

## Review Issues Resolved

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | HIGH | `!inner` join fetches unbounded data | Two-query pattern (schedules → attendance) |
| 2 | HIGH | `getMonthBounds` not in date-helpers | Extract from payroll-calculate-actions |
| 3 | HIGH | Branch filter ordering ambiguous | Pre-scope at query level via schedule_ids |
| 4 | HIGH | Employee portal no employee_id filter | Add `.eq('employee_id')` to helpers |
| 5 | MEDIUM | weekStart→month derivation wrong | Explicit month/year params |
| 6 | MEDIUM | Payroll counter ≠ summary scoping | Documented caveat |
| 7 | MEDIUM | Accountant access not documented | Note added in Phase 3 |
| 8 | MEDIUM | Tabs double-fetch when inactive | No forceMount, lazy render |
| 9 | MEDIUM | my-attendance wrong month | Explicit month/year params |
| 10 | LOW | Zero-attendance employees omitted | Iterate ALL employees |
| 11 | LOW | Payroll page >200 lines | Extracted component |
