# Production Readiness Review -- Phases 3-5

**Reviewer:** code-reviewer agent
**Date:** 2026-03-07
**Scope:** Phase 3 (Payroll), Phase 4 (KPI), Phase 5 (Employee Portal)
**Files reviewed:** 35 source files, 3 SQL migrations, 1 middleware
**LOC reviewed:** ~3,200

**Verdict: CONDITIONAL APPROVE**

Ship with [P0-1] and [P0-2] fixed. Remaining P1s are important but non-blocking if deployed to a small team first with monitoring.

---

## [P0] Critical -- Must fix before deploy

### P0-1. Manual payslip edits do NOT recalculate GROSS/NET/tax

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-payslip-actions.ts` (lines 102-151)

**Description:** `updatePayslipManualFields()` writes `other_pay`, `penalties`, and `extra_notes` directly to the payslip row WITHOUT recalculating `gross_pay`, `net_pay`, `tncn`, insurance, or any derived fields. After a manual edit, the payslip displays stale GROSS and NET values until the user manually clicks "Tinh tu dong" (auto-calculate) again.

Worse, if the period is then confirmed without recalculating, the **legally incorrect** NET salary is locked in and shown to the employee.

**Impact:** Employees receive payslips with wrong NET amount. Real money mismatch.

**Fix:** After updating manual fields, re-run `calculatePayslip()` with the updated values and write all derived columns in the same UPDATE. Or, at minimum, show a prominent "Recalculate required" warning in the UI and block confirm if any payslip has been manually edited since last auto-calculate.

---

### P0-2. N+1 query pattern in autoCalculatePayslips -- 5-7 DB round-trips PER employee

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (lines 97-172)

**Description:** For each employee in the branch, the function makes:
1. `countTeachingSessions()` or `countOfficeDays()` -- 1 query
2. `getSubstituteSessions()` -- 1 query
3. `getRecurringAllowances()` -- 1 query
4. `getRecurringDeductions()` -- 1 query
5. `getKpiBonus()` -- 1 query (assistants)
6. Conditionally `getOtherPay()` + `getPenaltyAmount()` -- 2 queries (new employees only)
7. `payslips.update` or `payslips.insert` -- 1 write

Each of those functions creates a *new* Supabase client (`await createClient()`). For a branch of 30 employees, that is **180-210 separate DB round-trips** plus 30 separate Supabase client instantiations per employee (the functions in `payroll-data-fetcher.ts` and `payroll-session-counter.ts` each call `await createClient()`).

**Impact:** For 100+ employees, the request will likely timeout (Vercel 10s limit, self-hosted maybe 30s). Even for 30 employees this is noticeably slow (5-10 seconds).

**Severity reasoning:** Marked P0 because payroll calculation *will fail* for any reasonably-sized branch under production load.

**Fix:** Batch-fetch all attendance, notes, salary components, and KPI data in single queries before the loop. Pass the pre-fetched data into the loop. This reduces total queries from ~7N to ~7 fixed queries regardless of N.

---

### P0-3. Tax bracket algorithm has a boundary-condition bug

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\utils\tax-calculator.ts` (lines 6-31)

**Description:** The Vietnamese TNCN progressive tax uses bracket *widths*, not cumulative thresholds. The code uses cumulative thresholds:
```
[5_000_000, 0.05]    -- bracket 1: 0-5M
[10_000_000, 0.1]    -- bracket 2: 5M-10M (width = 5M, but threshold = 10M)
[18_000_000, 0.15]   -- bracket 3: 10M-18M (width = 8M)
```

The calculation `const bracketIncome = Math.min(taxableIncome, threshold) - cumulative` is correct only if `threshold` represents the cumulative upper bound, which it does. After tracing through:
- Bracket 1: min(income, 5M) - 0 = up to 5M at 5%
- Bracket 2: min(income, 10M) - 5M = up to 5M at 10%
- Bracket 3: min(income, 18M) - 10M = up to 8M at 15%

**Correction:** After careful review, the algorithm IS mathematically correct. The `threshold` values ARE cumulative upper bounds, and `cumulative` tracks the previous threshold. The loop correctly computes each bracket's contribution. Removing this from P0.

---

## [P1] High -- Should fix before deploy

### P1-1. payroll-data-fetcher.ts silently returns 0 on query errors -- incorrect payslips generated without warning

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\services\payroll-data-fetcher.ts` (all functions)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\services\payroll-session-counter.ts` (all functions)

**Description:** Every function (`getRecurringAllowances`, `getRecurringDeductions`, `getKpiBonus`, `getPenaltyAmount`, `getOtherPay`, `countTeachingSessions`, `countOfficeDays`, `getSubstituteSessions`) catches errors and returns `0` instead of propagating the failure. If any query fails (e.g., network hiccup, RLS policy blocks read), the payslip is calculated with `0` for that component, producing an incorrect payslip with no indication of the error.

**Impact:** Under network instability or RLS misconfiguration, payslips could be generated with 0 sessions or 0 allowances. The accountant would see no error -- just incorrect numbers.

**Fix:** Change return type to `{ value: number; error?: string }` or throw on error so `autoCalculatePayslips` can report which employees failed and skip them rather than generating wrong payslips.

---

### P1-2. Confirmed period payslips can be modified via autoCalculatePayslips after undo

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (line 54)

**Description:** `autoCalculatePayslips()` checks `period.status !== 'draft'` and rejects. This is correct. However, the 24h undo window allows reverting `confirmed` to `draft`, after which auto-calculate can be run again. This is *by design* but creates a data integrity risk: if payslips were already emailed to employees (status was `sent`), there is NO protection against undo on `sent` periods.

Looking at `undoPayrollPeriod()` (line 172): it checks `status !== 'confirmed'` -- meaning it only undoes `confirmed` periods, not `sent`. This is correct.

**However:** There is no transition guard from `confirmed` to `sent`. The `status` enum allows any transition. An accountant could potentially do: `draft -> confirmed -> draft (undo) -> confirmed` without any re-send. The `sent_at` field is never set by any code in Phase 3.

**Impact:** The `sent` status exists but is dead code -- no action sets it. If future code adds email sending, the undo guard on `sent` is missing from the application layer (only DB CHECK prevents invalid values, but any valid status transition is allowed).

**Fix:** Document that `sent` status transition will be added in future. For now, this is acceptable since no email sending exists yet. Low urgency.

---

### P1-3. Portal payslip detail page leaks `deductions` column display

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-payslips\[id]\page.tsx` (lines 127-133)

**Description:** The employee-facing payslip detail page shows `penalties` but does NOT show `deductions` (recurring deductions from salary_components). The value is subtracted from NET pay in the calculation but invisible to the employee. They see `GROSS - insurance - tax - penalties = NET` but the math won't add up because the hidden `deductions` amount is also subtracted.

**Impact:** Employee confusion -- "why is my NET less than expected?" They cannot see the recurring deduction amount.

**Fix:** Add a row for `deductions` in the payslip detail page, similar to how `payslip-detail-panel.tsx` displays it.

---

### P1-4. BM role can view payroll but getPayrollPeriods excludes BM

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-period-actions.ts` (line 18)

**Description:** `requirePayrollRole()` only allows `admin` and `accountant`. But RLS policies grant `branch_manager` SELECT access to `payroll_periods` (own branch) and `payslips` (own branch). If a BM navigates to `/payroll`, the page loads (route is protected), but the server action returns "Ban khong co quyen" error because of the application-layer check.

This is a UX inconsistency -- the route is accessible but the data actions reject the user.

**Impact:** BM sees an error when navigating to `/payroll`. Not a security issue (data is still protected) but creates confusion.

**Fix:** Either add BM to `requirePayrollRole()` with read-only access, or remove `/payroll` from BM's visible navigation.

---

### P1-5. KPI page race condition -- BM role detection runs async while data fetch fires with empty branchId

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\kpi\page.tsx` (lines 41-64)

**Description:** Two `useEffect` hooks run in parallel:
1. `getCurrentUser().then(setIsAdmin)` -- determines if user is admin
2. `fetchData()` depends on `isAdmin` state -- if `isAdmin && !branchId`, skip; otherwise fetch

On first render for a BM user: `isAdmin` starts as `false`, so `fetchData()` runs immediately with empty `branchId`. The server action `getAssistantsWithKpiStatus('')` receives empty string as branchId. The server-side code uses `effectiveBranch = user.branch_id ?? branchId`, which falls back to the BM's own branch. So the data loads correctly, but the admin branch-selector state is out of sync.

For an admin user: `isAdmin` starts `false`, so `fetchData()` fires with `branchId=''`. Server action receives empty branchId. Admin role has no `branch_id` in JWT, so `effectiveBranch = null ?? ''` = empty string. Query `.eq('branch_id', '')` returns 0 results. Then when `isAdmin` becomes `true`, the `fetchData` callback is recreated and fires again. User sees a flash of "no data" then the branch selector prompt.

**Impact:** Minor UX flicker for admins. No data corruption. BMs unaffected due to server-side fallback.

**Fix:** Wait for role detection to complete before first data fetch, or merge into a single `useEffect`.

---

## [P2] Medium -- Fix post-launch

### P2-1. PayrollTable always passes `null` as previousNet -- 20% alert never triggers

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\payroll-table.tsx` (line 57)

**Description:** `const { isAlert } = compareNetPay(p.net_pay, null)` -- the second argument is hardcoded to `null`. The `compareNetPay` function returns `isAlert: false` when previous is null. The 20% change alert feature is completely non-functional.

**Impact:** One of the 18 MVP optimizations (">20% alert") is dead. Not critical for payroll accuracy but defeats a safety feature.

**Fix:** Fetch previous period's payslips and match by employee_id to provide actual `previousNet` values.

---

### P2-2. `as any` cast on Supabase client used in ALL server actions

**Files:** Every server action file in `lib/actions/` and `lib/services/`

**Description:** Pattern: `const sb = supabase as any`. This bypasses all TypeScript type checking on query builders. Any typo in column names, table names, or filter values will only fail at runtime, not compile time.

**Impact:** No compile-time safety for DB queries. Silent bugs from column name typos.

**Fix:** Generate Supabase types with `supabase gen types typescript` and use the typed client. This is a systemic issue across all phases, not specific to 3-5.

---

### P2-3. Excel export includes `employee_position` from employees table -- NOT payslip's snapshot position

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\utils\excel-payroll-export.ts` (line 122)

**Description:** The Excel export groups by `p.employee_position` which comes from `PayslipWithEmployee.employee_position` -- joined from `employees.position`. But the payslip stores its own `position` field (snapshot). If an employee's position changes after payroll calculation (e.g., promoted from assistant to office), the Excel export would place them in the wrong sheet.

**Impact:** Incorrect Excel grouping after employee position changes. The payslip's snapshot `position` field should be used instead.

**Fix:** Use `p.position` (payslip snapshot) instead of `p.employee_position` (live employees table) for grouping.

---

### P2-4. createPayrollPeriod duplicate check is not atomic -- TOCTOU race

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-period-actions.ts` (lines 91-119)

**Description:** The function first SELECTs to check for duplicates, then INSERTs. Between the check and insert, another user could create the same period. The DB UNIQUE constraint `(branch_id, month, year)` would catch this and throw, which is handled by the catch block, but the error message would be a generic Supabase error rather than the user-friendly Vietnamese message.

**Impact:** Rare race condition. Worst case: user sees generic error instead of "ky luong da ton tai".

**Fix:** Use `upsert` with `onConflict` or catch the unique violation specifically and return the friendly message.

---

### P2-5. KPI form allows saving with branchId from client state -- not validated against employee's actual branch

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-eval-form-hooks.ts` (lines 102-131)

**Description:** The `handleSave()` function constructs the payload with `branch_id: branchId` from component state (set from `getCurrentUser().branch_id`). However, the server action `saveKpiEvaluation()` validates `data.branch_id !== emp.branch_id`, catching mismatches.

**Verdict:** Server-side validation IS present (line 44 of kpi-save-actions.ts). The client value could be stale if the BM was transferred, but the server correctly rejects. Not a real vulnerability, just a defense-in-depth note.

---

### P2-6. logAudit is fire-and-forget but NOT awaited -- silent audit gaps

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-period-actions.ts` (lines 147, 189)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-save-actions.ts` (line 78)

**Description:** `logAudit()` is called without `await`. The function is async, so the promise floats. If the server action response is sent before the audit insert completes, the audit log may be lost. Additionally, if `logAudit` throws after the catch block is exited, the error is unhandled (though the function has its own try-catch).

**Impact:** Audit log entries for payroll confirm/undo and KPI save may be silently dropped under load.

**Fix:** Either `await logAudit(...)` or use `void logAudit(...)` to explicitly signal fire-and-forget. The current pattern is acceptable for non-critical audit logging but should be documented.

---

### P2-7. Employee portal attendance view does not paginate -- unbounded query

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-attendance-actions.ts` (lines 53-79)

**Description:** The attendance query for a given month returns all records without `.limit()`. For class-based attendance, a teacher could have multiple records per day (multiple classes). With 20 classes and 22 working days, that is 440 records per month. This is manageable but not bounded.

**Impact:** Low risk. One month of attendance for one employee is always small.

---

## [P3] Low -- Nice to have

### P3-1. `other_pay` column label inconsistency: "Khac" vs "Thu nhap khac" vs "Phu dao"

**Files:** Multiple UI components

**Description:** The `other_pay` field is labeled differently across the codebase:
- PayrollTable: "Khac" (column header)
- PayslipDetailPanel: "Thu nhap khac"
- Excel export header: no explicit "other_pay" column (merged into row data)
- Spec: "phụ đạo, one-time bonuses"

**Impact:** Minor labeling inconsistency. No functional issue.

---

### P3-2. PayrollPeriodPage uses confirm() browser dialog for undo -- not consistent with ConfirmPayrollDialog

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\payroll\[period]\page.tsx` (line 122)

**Description:** Payroll confirm uses a proper custom Dialog component, but undo uses `confirm('Hoan tac bang luong?')` -- the native browser dialog. Inconsistent UX.

**Impact:** Minor. No functional issue.

---

### P3-3. KPI history chart does not show base_pass=false indicator

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-history-chart.tsx`

**Description:** The chart shows score as bar height and bonus as label, but does not visually distinguish months where `base_pass=false`. An assistant who scored 8/10 but failed a mandatory criterion would show the same green bar as someone who passed -- but their bonus would show 0.

**Impact:** Visual confusion. The bonus label of "0d" is the only indicator.

---

### P3-4. Employee profile update does not log audit

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-profile-actions.ts`

**Description:** `updateEmployeeProfile()` does not call `logAudit()` after updating profile fields (CCCD, bank details, etc.). Bank account changes are sensitive operations that should be audited.

**Impact:** No audit trail for bank detail changes. Medium compliance risk.

---

## Payroll Formula Verification

- [x] **Office formula:** NET = (sessions x rate) + (sub x subRate) + otherPay + allowances - insurance - TNCN - deductions - penalties. Matches spec. `position='admin'` correctly mapped to `'office'` for DB CHECK constraint (line 137 of payroll-calculate-actions.ts).
- [x] **Teacher formula:** Same as Office. No KPI. Matches spec.
- [x] **Assistant formula:** Same as Office + `kpiBonus` added to GROSS. KPI fetched via `getKpiBonus()` which respects `base_pass`. Matches spec.
- [x] **Tax brackets:** 7 progressive brackets verified against Vietnamese TNCN law. Thresholds: 5M/10M/18M/32M/52M/80M/Inf at 5%/10%/15%/20%/25%/30%/35%. Algorithm is mathematically correct.
- [x] **Insurance rates:** BHXH=8%, BHYT=1.5%, BHTN=1% of GROSS. Only if `has_labor_contract`. Correct.
- [x] **Personal deduction:** 11M/month. Correct per current Vietnamese law.
- [x] **Dependent deduction:** 4.4M/month per dependent. Correct.
- [x] **NUMERIC sessions:** Both `sessions_worked` and `substitute_sessions` declared as NUMERIC in DB. JS code uses `number` type (supports 0.5). Correct.
- [x] **Rounding:** `Math.round()` used throughout. VND has no decimals. Correct.
- [x] **Rate snapshot:** `rate_per_session` and `sub_rate` are read from `employees` table at calculation time and stored in payslip row. Subsequent rate changes do NOT affect existing payslips. Correct.
- [x] **KPI base_pass:** `base_pass=false` -> `bonus=0` but base salary (sessions x rate) still calculated normally. Verified in both `kpi-calculation-service.ts` and `payroll-data-fetcher.ts`.

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Employee can see only own payslips | PASS | Portal actions filter by `user.id`. RLS policy `payslips_employee_select_own` enforces at DB level. `getMyPayslipDetail()` double-checks `employee_id !== user.id`. |
| Employee can see only own attendance | PASS | `getMyAttendance()` filters by `user.id`. |
| BM cannot access cross-branch payroll | PASS | Server actions restrict to admin/accountant. RLS restricts BM to SELECT own branch. |
| Accountant cannot modify non-payroll data | PASS | `requirePayrollRole()` only guards payroll actions. Other CRUD actions have their own role checks. |
| PROFILE_FIELDS whitelist prevents injection | PASS | `Set(['date_of_birth', 'id_number', ...])` filters input. `role`, `position`, `branch_id` are NOT in the set. Privilege escalation blocked. |
| Payroll confirm checks draft status | PASS | `confirmPayrollPeriod()` rejects if status !== 'draft'. |
| Undo enforces 24h window server-side | PASS | `undoPayrollPeriod()` computes hours since `confirmed_at` and rejects if > 24. |
| Cron endpoint protected | PASS | `kpi-reminder/route.ts` uses `timingSafeEqual` for CRON_SECRET. Uses `createAdminClient()` (service role). |
| `/api/cron/*` not in PROTECTED_PATHS | NOTE | Middleware does not protect `/api` routes, but the cron endpoint has its own secret check. Acceptable for webhook-style endpoints. |
| Draft payslip edit checks period status | PASS | `updatePayslipManualFields()` verifies period is draft before allowing edits. |
| Employee portal pages restrict to employee role | PASS | All portal pages check `user.role !== 'employee'` and redirect to `/dashboard`. |

---

## Production Checklist

| Item | Status | Notes |
|------|--------|-------|
| Payroll formulas correct | PASS | All 3 formulas verified against spec |
| Tax calculation correct | PASS | 7 brackets verified |
| Insurance rates correct | PASS | 8%/1.5%/1% |
| NUMERIC session support | PASS | 0.5 values work |
| Rate snapshot at calc time | PASS | Stored in payslip row |
| Manual edit does not recalculate | **FAIL** | [P0-1] |
| N+1 query performance | **FAIL** | [P0-2] |
| Error handling in fetchers | WARN | [P1-1] Silent 0 returns |
| 20% alert feature | WARN | [P2-1] Dead code |
| Excel export grouping | WARN | [P2-3] Uses live position not snapshot |
| Audit logging | WARN | [P2-6] Fire-and-forget, [P3-4] Missing for profile |
| Portal payslip shows all deductions | WARN | [P1-3] Missing `deductions` display |
| RLS policies aligned | PASS | All tables have appropriate policies |
| Middleware routes protected | PASS | All portal and payroll routes in PROTECTED_PATHS |

---

## Positive Observations

1. **Clean architecture separation.** Pure calculation functions (`payroll-calculation-service.ts`, `kpi-calculation-service.ts`, `tax-calculator.ts`) have zero side effects and are easily testable.

2. **Proper admin position mapping.** Previous review flagged `position='admin'` violating payslips CHECK constraint. This is now fixed -- `admin` is mapped to `office` before insert (line 137).

3. **Audit logging uses admin client.** Previous review flagged `logAudit` using anon-key client. Now uses `createAdminClient()` correctly.

4. **Timing-safe cron secret comparison.** Previous review flagged `!==` comparison. Now uses `timingSafeEqual` from `crypto`.

5. **KPI save validates target employee.** Server action checks: (a) employee exists, (b) position is 'assistant', (c) is active, (d) branch matches. Comprehensive guard.

6. **Profile field whitelist.** `PROFILE_FIELDS` Set prevents privilege escalation through profile update endpoint.

7. **Draft-only edit enforcement.** Both auto-calculate and manual edit check period status before modifying data.

8. **Employee portal properly scopes to current user.** No IDOR vulnerability -- `employee_id = user.id` enforced at both application and RLS layers.

9. **Double-confirm dialog for payroll finalization.** Shows totals for review before locking the period.

10. **Previous-month pre-fill for KPI.** Good UX optimization that reduces data entry time for BMs.

---

## Metrics

| Metric | Value |
|--------|-------|
| Type coverage | ~85% (reduced by `as any` on Supabase client) |
| Test coverage | 0% (no automated tests for Phases 3-5) |
| Linting issues | 8 eslint-disable comments (all `@typescript-eslint/no-explicit-any`) |
| P0 findings | 2 |
| P1 findings | 5 |
| P2 findings | 7 |
| P3 findings | 4 |

---

## Recommended Actions (Priority Order)

1. **[P0-1] Fix manual edit recalculation.** Either re-run `calculatePayslip()` after manual field update, or add a "dirty" flag that blocks confirm until recalculation.

2. **[P0-2] Batch-fetch payroll data.** Refactor `autoCalculatePayslips` to fetch all attendance, notes, components, and KPI in batch queries before the employee loop. Target: <10 queries total regardless of employee count.

3. **[P1-1] Propagate data-fetch errors.** Change fetcher functions to throw or return error objects instead of silently returning 0.

4. **[P1-3] Add deductions row to portal payslip detail.** One-line fix in `my-payslips/[id]/page.tsx`.

5. **[P2-1] Implement 20% alert.** Fetch previous period payslips and pass `previousNet` to `compareNetPay()`.

6. **[P2-3] Use payslip.position for Excel grouping.** Prevents incorrect grouping after position changes.

---

## Unresolved Questions

1. **Negative `netPay` handling:** If deductions + insurance + tax exceed gross, `netPay` goes negative. Is this a valid business scenario (employee owes money)? Should there be a floor at 0, or should the system warn?

2. **Mid-month termination:** If an employee is deactivated (`is_active=false`) mid-month, they are excluded from `autoCalculatePayslips` entirely. Should their partial-month attendance still generate a payslip?

3. **Multiple KPI evaluations per month:** The DB has `UNIQUE(employee_id, month, year)` and code uses `upsert`. But what if two BMs attempt to evaluate the same assistant simultaneously? The last write wins with no conflict notification.

4. **Missing `sent` status transition:** No code path exists to set `status='sent'`. Is email sending planned for a future phase, or is this dead schema?
