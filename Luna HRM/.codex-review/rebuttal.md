# Round 1 Rebuttal — All 10 Issues Addressed

## ISSUE-1: Auth identity and JWT claim model ✅ ACCEPTED + FIXED
- `employees.id = auth.users.id` (same UUID, canonical link)
- Switched from `user_metadata` (client-writable) to `app_metadata` (immutable by client)
- RLS helper functions read from `auth.jwt()->'app_metadata'->>'role'`
- Employee creation flow: admin API creates auth user → UUID → insert employee with same ID → set app_metadata
- Files changed: phase-01 (Key Insights, Role Mapping, Auth Flow, RLS Policies)

## ISSUE-2: Branch scoping for attendance ✅ ACCEPTED + FIXED
- Documented that `attendance` table uses JOIN via `class_schedules.branch_id` for RLS
- Added index on `attendance(schedule_id)` to support join performance
- RLS for BM: attendance visible via `WHERE schedule_id IN (SELECT id FROM class_schedules WHERE branch_id = get_user_branch_id())`
- Files changed: phase-01 (Step 3, Step 4)

## ISSUE-3: Core database integrity constraints ✅ ACCEPTED + FIXED
- Added explicit constraint matrix to Phase 1 Step 3:
  - `payslips`: UNIQUE `(payroll_period_id, employee_id)`
  - `employees.email`: UNIQUE with `lower(email)` (CI)
  - `payroll_periods`: CHECK month 1-12, year 2020-2100
  - `kpi_evaluations`: CHECK month 1-12, year >= 2020
  - `class_schedules`: CHECK `teacher_id <> assistant_id`
  - `days_of_week`: CHECK all values 1-7
  - `dependent_count`: CHECK >= 0
  - All status/role/position enums: CHECK with allowed values
- Files changed: phase-01 (Step 3)

## ISSUE-4: Schema sequencing + lock table ✅ ACCEPTED + FIXED
- Circular FK: `branches` created WITHOUT `manager_id` FK, then ALTER TABLE adds it after `employees` exists
- New `attendance_locks` table added to Phase 1 schema: `(branch_id, week_start, locked_by, locked_at)` with UNIQUE constraint
- Total tables: 17 (16 data + attendance_locks)
- Files changed: phase-01 (Step 3 table order), plan.md (table count)

## ISSUE-5: KPI before payroll ✅ ACCEPTED + FIXED (rule locked)
- Business rule finalized: `base_pass=false` → KPI bonus = 0, base salary STILL paid normally
- base_pass controls ONLY bonus eligibility, not base pay
- Documented in Phase 4 Key Insights, Risk Assessment
- This removes the ambiguity Codex identified
- Files changed: phase-04 (Key Insights, Step 9, Risk Assessment)

## ISSUE-6: Payroll input data flow ✅ ACCEPTED + CLARIFIED
- `employee_evaluations.bonus_impact` is INFORMATIONAL ONLY — not auto-fed to payroll
- Single source of truth for payroll adjustments: `employee_weekly_notes` table
- If BM wants evaluation bonus in payroll, they create an employee_weekly_note of type 'bonus'
- Removed contradiction between Phase 3 and Phase 6
- Files changed: phase-03 (Key Insights), phase-06 (Key Insights, Success Criteria)

## ISSUE-7: Half sessions INT → NUMERIC ✅ ACCEPTED + FIXED
- `payslips.sessions_worked` and `substitute_sessions` changed to NUMERIC (not INT)
- `PayslipInput.sessionsWorked` and `substituteSessions` documented as NUMERIC
- Supports 0.5 attendance values throughout
- Files changed: phase-03 (Key Insights, PayslipInput interface)

## ISSUE-8: Recalculation semantics ✅ ACCEPTED + FIXED
- Added `getRecurringDeductions(employeeId)` alongside existing `getRecurringAllowances()`
- Added `deductions` field to PayslipInput
- NET formula now includes `- input.deductions`
- Recalculation behavior defined: manual fields preserved, calculated fields reset, post-confirm immutable
- Files changed: phase-03 (PayslipInput, calculatePayslip, session counter, Key Insights)

## ISSUE-9: Phase 5 UI + SSR conflicts ✅ ACCEPTED + FIXED
- Replaced `useMediaQuery` hook with CSS-responsive approach (Tailwind `hidden md:flex` / `md:hidden`)
- Both sidebar AND bottom-nav rendered server-side, CSS handles visibility
- No hydration flicker, no client-side viewport detection
- Service worker: static assets ONLY, explicitly excludes /api/* routes
- Files changed: phase-05 (Key Insights, Architecture, Step 2, SW step, Security)

## ISSUE-10: Payroll legal exactness ✅ PARTIALLY ACCEPTED + SCOPED
- Changed "matches Vietnamese law exactly" to "internal payroll approximation"
- Explicitly noted: not certified for multi-nationality or large-enterprise tax compliance
- This is appropriate for a small English language center (<50 employees)
- Files changed: phase-03 (Key Insights, Non-Functional requirements)

---

**All 10 issues addressed. Requesting APPROVE.**
