# Plan Review: Payroll Per-Class Rows

**Date:** 2026-03-14
**Reviewer:** code-reviewer (hostile adversarial mode)
**Plan:** `plans/260314-payroll-per-class-rows/`
**Brainstorm:** `plans/reports/brainstorm-260314-payroll-per-class-rows.md`

---

## ISSUE-1: [HIGH] Migration numbering wrong — plan says "6 files: 000-005" but 9 exist (000-008)

**Location:** phase-01-migration-types.md -> Context Links + Implementation Steps
**Problem:** Phase 1 context says "Existing migrations: supabase/migrations/ (6 files: 000-005)" but the actual codebase has **9 files** (000 through 008). Migration is named `009_payroll_class_breakdown.sql` which is correct by accident, but the stale count in the plan docs suggests the planner worked from an outdated snapshot. If someone reads the plan literally and checks, they'll waste time reconciling.
**Impact:** Confusion during implementation; no runtime bug since `IF NOT EXISTS` is used. Low severity on its own but indicates the plan wasn't validated against current state.
**Fix:** Update Phase 1 context to say "9 files: 000-008". Verify no migration 009 already exists before running.

---

## ISSUE-2: [HIGH] `buildClassBreakdown` filters `.eq('status', 'active')` -- misses deactivated classes that have attendance in the payroll month

**Location:** phase-03-init-logic-class-breakdown.md -> New helper function -> line `.eq('status', 'active')`
**Problem:** If a class schedule is deactivated **mid-month** (e.g., class BC05 ran for 2 weeks, then was deactivated on the 15th), the query skips it entirely because `status = 'active'` filters it out. The attendance records for those 2 weeks exist but will NOT appear in `class_breakdown`. The employee loses pay for those sessions.
**Impact:** **Data loss / underpayment.** Teaching employee worked sessions in a now-inactive class but class_breakdown omits them. `sessions_worked` will be lower than reality.
**Fix:** Remove `.eq('status', 'active')` from the `buildClassBreakdown` query. The attendance records themselves are the source of truth -- if attendance rows exist for a schedule_id in the date range, the class should appear in breakdown regardless of current schedule status. Alternatively, use `.in('status', ['active', 'inactive'])` to be explicit.

---

## ISSUE-3: [HIGH] `rate_per_session` set to first class's rate -- nonsensical for multi-class employees

**Location:** phase-03-init-logic-class-breakdown.md -> Modify initializePayslips -> line `rate_per_session: isTeaching ? (classBreakdown[0]?.rate ?? emp.rate_per_session) : emp.rate_per_session`
**Problem:** For a teacher with 3 classes at rates 75k, 80k, and 90k, `rate_per_session` is set to 75k (first by alphabetical sort). This is **meaningless** -- the payslip's `rate_per_session` column is a BIGINT NOT NULL in the DB, and the employee portal detail page (my-payslips/[id]) displays it as `"Luong buoi day (X buoi x Y d)"`. Showing the first class's rate with the total sessions creates a **wrong multiplication display** in the employee portal.
**Impact:** Employee sees incorrect breakdown on their payslip detail page. Example: 18.5 sessions x 75,000 = 1,387,500 but portal would show the teaching_pay (which is correct) next to the wrong rate. Confusing.
**Fix:** For multi-class employees, set `rate_per_session` to 0 or to the average (`teaching_pay / sessions_worked`), or better yet: update the employee portal detail page to show per-class breakdown when `class_breakdown.length > 0` instead of the flat rate display. The plan completely ignores the employee portal view.

---

## ISSUE-4: [HIGH] Employee portal payslip detail page NOT updated -- backward compat gap

**Location:** NOT mentioned in any phase file
**Problem:** `app/(dashboard)/my-payslips/[id]/page.tsx` (160 lines) shows: `"Luong buoi day ({sessions_worked} buoi x {rate_per_session})"`. With class_breakdown, this becomes misleading (see ISSUE-3). The plan says "backward compat: class_breakdown.length === 0 -> fallback" for the spreadsheet UI but **never mentions the employee self-service portal**. The `MyPayslipDetail` type extends `Payslip`, so it will inherit `class_breakdown` from the type change, but the UI never renders it.
**Impact:** Employees see wrong/misleading salary breakdown on their own payslip. This is the UI they actually care about.
**Fix:** Add to Phase 4 or create a Phase 4b: Update `my-payslips/[id]/page.tsx` to render per-class rows when `class_breakdown.length > 0`. Show class_code, sessions, rate, amount per class. Keep flat display when class_breakdown is empty (old payslips).

---

## ISSUE-5: [HIGH] `handleClassEdit` doesn't update `default_sessions`/`default_rate` -- reset becomes impossible

**Location:** phase-04-spreadsheet-ui-refactor.md -> Class edit handler
**Problem:** The `ClassBreakdownEntry` has `default_sessions` and `default_rate` fields for "reset to original" functionality. However, the `handleClassEdit` function clones the entry and overwrites `sessions` or `rate` but never preserves the original `default_sessions`/`default_rate`. This is actually fine IF the clone spreads the original entry (which it does via `...currentBreakdown[entryIndex]`). However, the plan **never implements a reset button or reset logic anywhere**. The `default_*` fields are stored in JSONB but there's no UI to use them.
**Impact:** Wasted schema space. More importantly: if user edits sessions from 8 to 10 and saves, then later wants to see "what was the original attendance count?", there's no way to reset or compare. The `default_*` fields are carried through save but never exposed.
**Fix:** Either (a) add a reset button per class row that restores `default_sessions`/`default_rate`, or (b) remove `default_*` fields from the schema to avoid confusion -- they add JSONB bloat with zero utility. Recommend option (a) since the brainstorm explicitly mentions "reset comparison".

---

## ISSUE-6: [HIGH] `batchUpdatePayslips` fetch for audit diff does NOT include `class_breakdown`, `teaching_pay`, `sessions_worked`

**Location:** phase-05-save-excel-export.md -> EDITABLE_KEYS + `payroll-payslip-actions.ts` existing code
**Problem:** The current `batchUpdatePayslips` fetches old values for audit diff at line 196: `.select('id, payroll_period_id, kpi_bonus, allowances, deductions, penalties, other_pay, bhxh, bhyt, bhtn, tncn, gross_pay, net_pay, extra_notes')`. The plan adds `class_breakdown`, `teaching_pay`, `sessions_worked` to EDITABLE_KEYS but does NOT update the SELECT statement. The audit service's `buildAuditLogEntries` iterates AUDITED_FIELDS -- which also needs to be updated with the new fields.
**Impact:** (a) Audit diff for `class_breakdown`/`teaching_pay`/`sessions_worked` will always show `undefined -> new_value` because old values are never fetched. (b) The AUDITED_FIELDS in `payroll-audit-service.ts` doesn't include the new keys, so they won't be audited at all unless also updated.
**Fix:** (1) Add `class_breakdown, teaching_pay, sessions_worked` to the SELECT in `batchUpdatePayslips`. (2) Add `teaching_pay`, `sessions_worked` to AUDITED_FIELDS in `payroll-audit-service.ts`. (3) The JSONB `class_breakdown` needs special handling in `buildAuditLogEntries` (Phase 5 describes this but doesn't mention updating AUDITED_FIELDS or the SELECT).

---

## ISSUE-7: [MEDIUM] `initializePayslipData()` service function bypassed -- DRY violation emerges

**Location:** phase-03-init-logic-class-breakdown.md -> Modify initializePayslips
**Problem:** Currently, `initializePayslips()` calls `initializePayslipData()` from `payroll-calculation-service.ts` which is a pure function that builds the payslip init object. The plan's Phase 3 **bypasses** this function for teaching employees and inlines the logic: manually sets `sessions_worked`, `teaching_pay`, `rate_per_session` from `buildClassBreakdown()` output. But `initializePayslipData()` is still used somewhere? No -- it's replaced entirely for teaching staff. This means two code paths: one for teaching (inline) and one for office (via `initializePayslipData`). The office path still goes through the service, the teaching path doesn't.
**Impact:** If `initializePayslipData()` ever adds new logic (e.g., rounding), teaching staff won't get it. Fragile maintenance.
**Fix:** Either (a) extend `initializePayslipData()` to accept optional `classBreakdown` and derive session/pay from it, or (b) explicitly document that teaching staff use `buildClassBreakdown` and office staff use `initializePayslipData`, and keep both in sync. Option (a) is cleaner.

---

## ISSUE-8: [MEDIUM] N+1 query pattern per employee in `buildClassBreakdown` -- 2 queries per teaching employee

**Location:** phase-03-init-logic-class-breakdown.md -> buildClassBreakdown helper
**Problem:** `buildClassBreakdown` runs 2 queries per teaching employee: (1) get schedules, (2) get attendance rows. With 15 teaching employees, that's 30 queries in addition to the existing 3 queries per employee (countTeachingSessions, getSubstituteSessions, fetchPrefillData). The plan removes `countTeachingSessions` for teaching staff (replaced by buildClassBreakdown) but keeps `getSubstituteSessions` and `fetchPrefillData`. So it's: 2 (breakdown) + 1 (substitute) + 1 (prefill) = 4 queries per teaching employee. For 15 teaching employees = 60 queries just for init.
**Impact:** Performance concern for larger branches. Currently it's 3 queries per employee; this adds 1 more for teaching staff. The plan's risk section says "max 5-10 classes, fast" but doesn't account for the total query count across all employees.
**Fix:** Consider batching: fetch ALL active class_schedules for the branch in one query, then filter per employee in-memory. Similarly, fetch ALL attendance for the branch in the date range in one query. This would reduce 30 queries to 2 regardless of employee count. However, this is an optimization, not a blocker.

---

## ISSUE-9: [MEDIUM] `classIndex` variable in spreadsheet is used but never declared -- likely a scoping bug in plan pseudocode

**Location:** phase-04-spreadsheet-ui-refactor.md -> Grouped layout code -> `index={classIndex++}`
**Problem:** The plan's pseudocode shows `{localBreakdown.map((entry, idx) => ( <PayrollClassRow ... index={classIndex++} ... />` but `classIndex` is never declared anywhere in the component scope. This is plan-level pseudocode, but if implemented literally it will be a runtime ReferenceError. The intent is a global row counter across all employees, but React re-renders would reset or cause bugs with a mutable counter in render.
**Impact:** Implementation will need to compute the row index differently. Not a design flaw but will cause confusion if copied verbatim.
**Fix:** Compute row indices in a useMemo before the render, or use a flatMap + index approach. Document clearly.

---

## ISSUE-10: [MEDIUM] `colSpan={12}` and `colSpan={17}` hardcoded in class row -- fragile coupling to column count

**Location:** phase-04-spreadsheet-ui-refactor.md -> PayrollClassRow component -> `<td colSpan={12}></td>` and KPI badge row -> `<td colSpan={17}>`
**Problem:** The class row uses `colSpan={12}` for remaining empty columns and the KPI badge uses `colSpan={17}`. These magic numbers are based on the current SUMMARY_COLUMNS count (~14) but will break silently if columns are ever added/removed. The table header has a different column structure (class columns: #, name, class, sessions, rate, amount = 6) plus summary columns (~14 per SUMMARY_COLUMNS) = ~20 total. The colSpan values don't match any of these.
**Impact:** Misaligned table columns causing visual bugs. Hard to debug.
**Fix:** Derive colSpan from `SUMMARY_COLUMNS.length` dynamically. Use a constant like `const TOTAL_COLS = 6 + visibleSummaryColumns.length` and compute colSpan as `TOTAL_COLS - classRowCols`.

---

## ISSUE-11: [MEDIUM] `PayrollClassRow` uses `onBlur` for saving -- inconsistent with existing `onChange` pattern in `PayrollSpreadsheetRow`

**Location:** phase-04-spreadsheet-ui-refactor.md -> PayrollClassRow component
**Problem:** The existing `PayrollSpreadsheetRow` uses `onChange` handler (fires on every keystroke). The new `PayrollClassRow` uses `onBlur` (fires only when input loses focus). This creates inconsistent UX: editing a summary field updates dirty state instantly, but editing a class field only updates on blur. If user edits sessions in a class row and immediately clicks Save without blurring, the change is lost.
**Impact:** Data loss on save if user doesn't blur the input first.
**Fix:** Use `onChange` consistently, or add an explicit save on the class row that captures current input value before batch save. At minimum, add `onBlur` + `onChange` that debounces.

---

## ISSUE-12: [MEDIUM] Teaching staff substitute_sessions/substitute_pay logic not addressed in Phase 3

**Location:** phase-03-init-logic-class-breakdown.md -> Key Design
**Problem:** The plan replaces teaching session counting with `buildClassBreakdown` but doesn't explain how `substitute_sessions` and `substitute_pay` interact with the new class-based model. Currently, `getSubstituteSessions` still runs separately and produces a flat session count. But in the new model, substitutes are **per class** -- a teacher might substitute in class BC03 specifically. The `employee_weekly_notes` with `note_type='substitute'` don't have a `schedule_id` field, so they can't be attributed to a specific class.
**Impact:** Substitute sessions remain a flat number not attributed to any class. This is an incomplete model -- the brainstorm mentions class-level granularity but substitutes can't be broken down by class. Not a bug per se, but a design gap that users will notice.
**Fix:** Either (a) add a `schedule_id` field to `employee_weekly_notes` for substitute tracking (new migration, bigger scope), or (b) explicitly document that substitute pay remains a flat value shown only on the summary row, not attributable to specific classes. Option (b) for MVP.

---

## ISSUE-13: [MEDIUM] `class_breakdown` JSONB validation in `sanitizeBatchFields` is weak -- no amount validation

**Location:** phase-05-save-excel-export.md -> sanitizeBatchFields
**Problem:** The validation checks `typeof entry.sessions !== 'number' || typeof entry.rate !== 'number'` but does NOT validate: (a) `sessions >= 0`, (b) `rate >= 0`, (c) `amount === sessions * rate` (consistency), (d) `class_code` is a non-empty string, (e) array length is reasonable (max 50?), (f) `default_sessions`/`default_rate` are numbers. A malicious client could send `sessions: -100, rate: -1, amount: 999999` and it would pass validation.
**Impact:** Data corruption. Negative sessions or rates produce negative amounts. The `amount` field is trusted without recalculation server-side.
**Fix:** Add comprehensive validation: `sessions >= 0`, `rate >= 0`, `amount = sessions * rate` (server-side recalculation), string fields non-empty, array length cap. Recalculate `amount` server-side instead of trusting client.

---

## ISSUE-14: [MEDIUM] File size -- `payroll-spreadsheet.tsx` will exceed 200-line limit significantly

**Location:** phase-04-spreadsheet-ui-refactor.md -> File Changes
**Problem:** Current `payroll-spreadsheet.tsx` is 227 lines. The plan adds: employee header row rendering, class row mapping, KPI badge row, `handleClassEdit` function (~25 lines), `toggleEdit` state, and the Fragment-based grouped rendering. Conservative estimate: +80-100 lines, bringing it to 300-320 lines. The plan's validation says "spreadsheet.tsx < 280 lines" but the arithmetic doesn't support this.
**Impact:** Violates the 200-line file size rule in development-rules.md. Will need extraction.
**Fix:** Extract the grouped employee rendering (header + class rows + KPI + summary) into a separate component like `payroll-employee-group.tsx`. This was partially acknowledged in the risk section but not planned as a concrete step.

---

## ISSUE-15: [MEDIUM] `payroll-spreadsheet-row.tsx` SPREADSHEET_COLUMNS renamed to SUMMARY_COLUMNS but imports not updated

**Location:** phase-04-spreadsheet-ui-refactor.md -> Section 3
**Problem:** The plan renames `SPREADSHEET_COLUMNS` to `SUMMARY_COLUMNS` in `payroll-spreadsheet-row.tsx`. But `payroll-spreadsheet.tsx` imports it as `SPREADSHEET_COLUMNS` at line 17: `import { PayrollSpreadsheetRow, SPREADSHEET_COLUMNS } from './payroll-spreadsheet-row'`. The footer totals and column header rendering in the spreadsheet component depend on this import. The plan doesn't mention updating the import or the footer logic.
**Impact:** Build failure if the rename is done without updating imports. The footer also uses `SPREADSHEET_COLUMNS` to iterate for the Gross/Net total cells.
**Fix:** Either (a) keep the export name as `SPREADSHEET_COLUMNS` for backward compatibility and alias internally, or (b) explicitly update all 3 import sites (spreadsheet.tsx header, spreadsheet.tsx footer, payroll-table.tsx if used). The plan must list ALL consumers of this export.

---

## ISSUE-16: [LOW] KPI score derived as `kpi_bonus / 50000` -- fragile magic number

**Location:** phase-04-spreadsheet-ui-refactor.md -> KPI badge row
**Problem:** `(payslip.kpi_bonus / 50000).toFixed(1)` assumes the KPI bonus rate is always 50,000 VND per point. This is a business rule constant that could change. The original `kpi_evaluations.total_score` is the canonical value, but it's not available in the payslip data.
**Impact:** If the bonus rate changes (e.g., 60k/point), the displayed score will be wrong. Low severity since this is a display-only issue and the rate hasn't changed.
**Fix:** Either store `kpi_total_score` in the payslip (or in `class_breakdown` metadata), or query `kpi_evaluations` at display time, or extract `50000` to a shared constant. The plan's risk section acknowledges this but provides no mitigation.

---

## ISSUE-17: [LOW] `parseFloat(e.target.value) || 0` in form -- empty string produces 0, negative rates accepted

**Location:** phase-02-class-schedule-rate-ui.md -> Save handler
**Problem:** `form.teacher_rate ? parseFloat(form.teacher_rate) : null` -- if user types "0", parseFloat returns 0 which is falsy, so it becomes null. A rate of 0 should probably be valid (maybe for volunteer teachers?). Also, no validation prevents negative rates.
**Impact:** Rate of 0 cannot be explicitly set -- always treated as null (fallback to employee default). Minor edge case.
**Fix:** Use `form.teacher_rate.trim() !== '' ? parseFloat(form.teacher_rate) : null` instead of truthiness check. Add `min={0}` to the Input.

---

## ISSUE-18: [LOW] Concurrent edit hazard on class_breakdown JSONB

**Location:** phase-05-save-excel-export.md -> batchUpdatePayslips
**Problem:** Two accountants could simultaneously edit different classes within the same employee's breakdown. Accountant A edits class BC01 sessions, Accountant B edits class BC02 rate. Both read the same original `class_breakdown` array. A saves first (BC01 changed), then B saves (BC02 changed but BC01 is back to original). Last-write-wins on the entire JSONB blob.
**Impact:** Lost edits on JSONB fields. Low severity because: (a) payroll is branch-scoped, (b) typically one accountant per branch, (c) the existing pattern for all other fields has the same last-write-wins behavior.
**Fix:** Acceptable for MVP. Document that payroll editing is single-user-at-a-time per branch. For future: implement optimistic locking via `updated_at` check.

---

## ISSUE-19: [LOW] Excel export class rows have empty cells in positions where summary data lives -- confusing

**Location:** phase-05-save-excel-export.md -> buildSheetData
**Problem:** Class rows push arrays with empty strings for all summary columns: `['', '', '', '', '', '', '', '', '', '', '', '', '']`. The grand total row also has empty strings. While technically correct for a spreadsheet, it makes the Excel harder to parse programmatically (e.g., for importing into accounting software) because the data shape is inconsistent between class rows and summary rows.
**Impact:** Minor UX issue for Excel consumers. The existing export was 1-row-per-employee which is cleaner for downstream tools.
**Fix:** Consider adding a "Type" column (values: "class" / "summary" / "total") to help downstream consumers distinguish row types.

---

## ISSUE-20: [LOW] `getPayslipsByPeriod` SELECT does not explicitly include `class_breakdown`

**Location:** `payroll-payslip-actions.ts` line 49 -> `.select('*, employees(...)')`
**Problem:** The query uses `*` which will include all columns including the new `class_breakdown`. This works by accident. However, the `PayslipWithEmployee` type extends `Payslip`, and after Phase 1 changes, `Payslip` will include `class_breakdown: ClassBreakdownEntry[]`. Supabase returns JSONB as a parsed JSON array, so this should work. BUT -- the existing code casts to `Payslip` type, and if the `class_breakdown` default in the DB is `'[]'::jsonb`, old payslips without it could return `null` instead of `[]` depending on when the migration ran.
**Impact:** Potential `null` vs `[]` mismatch on old payslips. The plan's backward compat check `(payslip.class_breakdown ?? []).length > 0` handles null correctly with the `??` operator. This is actually fine.
**Fix:** No fix needed -- the `?? []` pattern handles it. But worth adding a comment.

---

## Summary

| Severity | Count | Issues |
|----------|-------|--------|
| HIGH | 6 | #1, #2, #3, #4, #5, #6 |
| MEDIUM | 9 | #7, #8, #9, #10, #11, #12, #13, #14, #15 |
| LOW | 5 | #16, #17, #18, #19, #20 |

### Critical Blockers (must fix before implementation)

1. **ISSUE-2**: Active-only filter silently drops deactivated class attendance -- **underpayment bug**
2. **ISSUE-3 + ISSUE-4**: Employee portal shows incorrect rate breakdown -- **employee-facing bug**
3. **ISSUE-6**: Audit SELECT doesn't fetch new fields -- **audit gap**
4. **ISSUE-13**: JSONB validation trusts client-sent `amount` -- **security/integrity**

### Must-Fix Before Merge (can fix during implementation)

5. **ISSUE-5**: Default fields stored but no reset UI
6. **ISSUE-11**: onBlur vs onChange inconsistency -- data loss risk
7. **ISSUE-14 + ISSUE-15**: File size + renamed export breaks imports

### Acceptable for MVP (document and defer)

8. **ISSUE-8**: N+1 queries (optimize later)
9. **ISSUE-12**: Substitute sessions not class-attributed (document limitation)
10. **ISSUE-18**: Concurrent edit on JSONB (single-user assumption)

---

## VERDICT: **REVISE**

6 HIGH issues require plan changes before implementation begins. Specifically:
- ISSUE-2 needs the `.eq('status', 'active')` filter removed from `buildClassBreakdown`
- ISSUE-3/4 need a new step: update employee portal payslip detail page
- ISSUE-6 needs explicit instructions to update SELECT + AUDITED_FIELDS
- ISSUE-13 needs server-side amount recalculation in validation

Once these HIGH issues are addressed in the plan files, the design is sound and implementation can proceed.
