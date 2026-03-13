# Plan Review: Attendance Summary by Class

**Date**: 2026-03-09
**Effort**: medium (adversarial, Codex stalled → manual)
**Rounds**: 1

## Review Summary

| Metric | Value |
|--------|-------|
| Rounds | 1 |
| Verdict | REVISE → Fixed |
| Issues Found | 11 |
| Issues Fixed | 11 |
| Issues Disputed | 0 |

## Issues Found & Fixed

| # | Sev | Category | Issue | Fix |
|---|-----|----------|-------|-----|
| 1 | HIGH | correctness | `!inner` join = unbounded query for admin | Two-query pattern: schedules → attendance |
| 2 | HIGH | correctness | `getMonthBounds` not exported from date-helpers | Extract from payroll-calculate-actions |
| 3 | HIGH | correctness | Branch filter ordering ambiguous → possible cross-branch leakage | Pre-scope via schedule_ids at DB level |
| 4 | HIGH | correctness | Employee portal no `.eq('employee_id')` defense-in-depth | Added optional param to query helpers |
| 5 | MEDIUM | correctness | weekStart→month derivation wrong at month boundaries | Explicit month/year params |
| 6 | MEDIUM | correctness | Summary totals ≠ payroll counter (different scoping) | Documented caveat in plan + code |
| 7 | MEDIUM | scope | Accountant access to /attendance not documented | Note added: accountants → payroll page only |
| 8 | MEDIUM | architecture | Tabs double-fetch when summary tab inactive | No forceMount → lazy render |
| 9 | MEDIUM | correctness | /my-attendance wrong month (Mar 1 = Sunday → week starts Feb 23 → month=Feb) | Pass month/year explicitly |
| 10 | LOW | risk | Zero-attendance employees silently omitted | Iterate ALL employees, default to 0 |
| 11 | LOW | scope | Payroll page >200 lines after adding panel | Extracted PayrollAttendanceSummary component |

## Key Corrections Applied

1. **Query pattern**: Replaced untested `!inner` join with proven two-query pattern (schedules-first, then attendance). Matches `getAttendanceGrid()` — battle-tested.
2. **Month derivation**: All actions now accept explicit `month`/`year` params. No more deriving month from weekStart (which fails when month starts mid-week).
3. **getMonthBounds extraction**: Added pre-requisite step to Phase 1 — extract from payroll code to shared date-helpers.
4. **Employee filter**: `getMyAttendanceSummary` adds `.eq('employee_id', user.id)` at query level — defense-in-depth beyond RLS.

## Final Verdict

**APPROVED after fixes.** All 11 issues addressed in updated plan files. No disputed items. Plan is ready for implementation.
