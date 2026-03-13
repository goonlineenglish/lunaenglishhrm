---
title: "Attendance Grid UX Improvements"
description: "Calendar dates in header + admin/BM override for auto-locked weeks"
status: completed
priority: P2
effort: 2.5h
branch: main
tags: [attendance, ux, unlock-override]
created: 2026-03-13
completed: 2026-03-14
reviewed: adversarial code-reviewer round 1, 14 issues → all fixed
---

# Plan: Attendance Grid UX Improvements

**Brainstorm:** `plans/reports/brainstorm-260313-attendance-grid-ux-improvements.md`

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | Calendar Dates in Header | ✅ completed | 10 min | 2 edit (class + office grid) |
| 2 | Unlock Override (DB + Actions + UI) | ✅ completed | 2h | 1 new migration, 2 new action files, 8 edits |

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Show DD/MM under day name in `<th>` | Minimal change, high UX value; `getWeekDates()` already computed |
| 2 | `is_override` column on `attendance_locks` | Reuse existing table, no new table needed |
| 3 | Admin + BM can unlock (BM scoped to own branch) | BM manages own branch day-to-day |
| 4 | Auto-lock overridable via explicit `is_override=true` row | Clear audit trail: who overrode, when |
| 5 | Payroll confirm guard before save on overridden week | Prevent editing attendance after payroll confirmed |
| 6 | UNIQUE constraint change: `(branch_id, week_start, is_override)` | Allow both manual-lock row AND override row to coexist |

## File Change Summary

| File | Phase | Change |
|------|-------|--------|
| `components/attendance/attendance-grid.tsx` | 1, 2 | Add dates in header; add unlock button |
| `components/office-attendance/office-attendance-grid.tsx` | 1, 2 | Add dates in header; add unlock button (ISSUE-1/3) |
| `supabase/migrations/008_attendance_lock_override.sql` | 2 | ADD COLUMN `is_override`, update UNIQUE |
| `lib/types/database-schedule-types.ts` | 2 | Add `is_override` to AttendanceLock |
| `lib/actions/attendance-lock-actions.ts` | 2 | NEW: `unlockWeek`, `overrideAutoLock`, `removeOverride` (ISSUE-12) |
| `lib/actions/attendance-save-actions.ts` | 2 | Update `saveAttendanceBatch()` lock check + cross-month payroll guard |
| `lib/actions/attendance-query-actions.ts` | 2 | Return `lockType`, `hasOverride` in grid data |
| `lib/actions/office-attendance-actions.ts` | 2 | Multi-row lock query + override-aware save (ISSUE-3/4) |
| `lib/actions/attendance-actions.ts` | 2 | Re-export from new lock-actions file |
| `app/(dashboard)/attendance/page.tsx` | 2 | Pass user role, remove client-side auto-lock merge |
| `app/(dashboard)/office-attendance/page.tsx` | 2 | Same as above (ISSUE-10) |

## Review Issues Resolved

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| 1 | LOW | Office grid header inconsistent | Phase 1: both grids updated |
| 3+4 | HIGH | Office attendance `.maybeSingle()` breaks | Step 12: multi-row query |
| 5 | HIGH | Cross-month payroll guard | `.or()` filter both months |
| 9 | MEDIUM | Override on non-auto-locked week | `isWeekLocked()` guard |
| 10 | MEDIUM | Office page client-side auto-lock | Server-side resolution |
| 12 | MEDIUM | File >200 lines | Extracted `attendance-lock-actions.ts` |
| 14 | LOW | No audit log for overrides | `logAudit()` added |

## Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| BM edits attendance after payroll confirmed | HIGH | Guard: check `payroll_periods.status='confirmed'` for that branch/month before allowing save |
| Dangling override row after re-lock | LOW | Delete override row when manual lock is applied |
| UNIQUE constraint migration on production data | LOW | Additive migration; DROP old constraint + CREATE new one in single transaction |
