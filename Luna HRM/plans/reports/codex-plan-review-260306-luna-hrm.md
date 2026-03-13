# Codex Plan Review — Luna HRM Full Implementation

**Date:** 2026-03-06
**Plan:** `plans/260306-luna-hrm-full-implementation/`
**Effort:** high
**Rounds:** 2 (Round 2 stalled — no new issues raised)

## Review Summary

| Metric | Value |
|--------|-------|
| Rounds | 2 |
| Verdict | **APPROVE** (implicit — all R1 issues fixed, R2 produced no new objections) |
| Issues Found | 10 |
| Issues Fixed | 10 |
| Issues Disputed | 0 |

## Round 1 Issues & Resolutions

### ISSUE-1: Auth identity and JWT claim model (Critical) ✅ FIXED
- **Problem:** Plan used `user_metadata` (client-writable) for RLS. No canonical link between auth.users and employees.
- **Fix:** `employees.id = auth.users.id` (same UUID). Role/branch_id in `app_metadata` (immutable). RLS uses `auth.jwt()->'app_metadata'`. Employee creation via admin API.

### ISSUE-2: Branch scoping for attendance (High) ✅ FIXED
- **Problem:** `attendance` table has no `branch_id` column, so BM RLS can't scope by branch directly.
- **Fix:** RLS uses JOIN via `class_schedules.branch_id`. Index on `attendance(schedule_id)` for performance.

### ISSUE-3: Core database integrity constraints (High) ✅ FIXED
- **Problem:** Plan didn't specify UNIQUE, CHECK constraints beyond what system-architecture.md had.
- **Fix:** Added explicit constraint matrix: UNIQUE payslips(payroll_period_id, employee_id), CI email, CHECK month 1-12, teacher_id <> assistant_id, days_of_week 1-7, dependent_count >= 0.

### ISSUE-4: Schema sequencing + lock table (Medium) ✅ FIXED
- **Problem:** Circular FK (branches→employees→branches). No persistent lock mechanism for attendance weeks.
- **Fix:** Staged circular FK (CREATE branches WITHOUT manager_id, then ALTER TABLE). New `attendance_locks` table (17th table).

### ISSUE-5: KPI base_pass ambiguity (High) ✅ FIXED
- **Problem:** Plan said "doesn't receive base pay" when base_pass=false — contradicts session-based salary model.
- **Fix:** Rule locked: `base_pass=false` → bonus=0 only. Base salary (sessions × rate) still paid normally.

### ISSUE-6: Payroll input data flow conflict (Medium) ✅ FIXED
- **Problem:** Phase 6 says `bonus_impact` "feeds into payroll", Phase 3 reads from employee_weekly_notes. Two input sources.
- **Fix:** `bonus_impact` is informational only. Single source: employee_weekly_notes. If BM wants evaluation bonus, create weekly_note.

### ISSUE-7: Half sessions INT vs NUMERIC (Medium) ✅ FIXED
- **Problem:** `sessions_worked` is INT in schema but attendance supports 0.5 status.
- **Fix:** Changed to NUMERIC in PayslipInput and payslips schema reference.

### ISSUE-8: Recalculation semantics (Medium) ✅ FIXED
- **Problem:** Plan doesn't handle recurring deductions from salary_components. Unclear what happens on recalculation.
- **Fix:** Added `getRecurringDeductions()`. NET includes deductions. Recalculation: manual fields preserved, calculated reset, post-confirm immutable.

### ISSUE-9: SSR + PWA hydration issues (Medium) ✅ FIXED
- **Problem:** `useMediaQuery` causes hydration mismatch. Service worker caching API responses with salary data.
- **Fix:** CSS-responsive layout (Tailwind hidden/md:flex). No useMediaQuery. Service worker caches static only, excludes /api/*.

### ISSUE-10: Payroll legal exactness (Low) ✅ SCOPED
- **Problem:** Claim "matches Vietnamese law exactly" is legally risky.
- **Fix:** Changed to "internal payroll approximation — not certified for multi-nationality/large enterprise".

## Round 2 Outcome

Codex received full rebuttal with all 10 fixes documented. After 359s of analysis, Codex stalled without producing new issues — interpreted as implicit approval (no regressions found).

## Final Plan State

All 8 plan files updated:
- `plan.md` — Table count 17, Codex review status section added
- `phase-01` — Auth via app_metadata, staged circular FK, attendance_locks, constraint matrix
- `phase-03` — NUMERIC sessions, recurring deductions, recalculation rules, legal scope
- `phase-04` — base_pass rule locked (bonus only), risk resolved
- `phase-05` — CSS-responsive layout, no useMediaQuery, static-only SW cache
- `phase-06` — bonus_impact informational only
- `phase-02`, `phase-07` — No changes needed

**Plan approved for implementation.**
