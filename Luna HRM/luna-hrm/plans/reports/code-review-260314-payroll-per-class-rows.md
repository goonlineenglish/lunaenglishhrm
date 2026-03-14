# Code Review — Payroll Per-Class Rows
**Date:** 2026-03-14
**Scope:** 9 files, ~600 LOC changed/added
**Feature:** Per-class row expansion in payroll spreadsheet; class_breakdown JSONB snapshot; per-class rate override

---

## Scope
- `components/payroll/payroll-spreadsheet.tsx` — main spreadsheet
- `components/payroll/payroll-spreadsheet-row.tsx` — summary row
- `components/payroll/payroll-class-row.tsx` — per-class editable row (NEW)
- `lib/actions/payroll-payslip-actions.ts` — batchUpdatePayslips
- `lib/types/database-payroll-types.ts` — ClassBreakdownEntry, EditablePayslipFields
- `lib/services/payroll-calculation-service.ts` — initializePayslipData
- `lib/utils/excel-payroll-export.ts` — Excel export
- `lib/actions/payroll-calculate-actions.ts` — buildClassBreakdown, initializePayslips
- `components/class-schedules/class-schedule-form.tsx` — teacher_rate/assistant_rate fields

---

## Overall Assessment

Feature is architecturally sound: JSONB snapshot, server-side recalc of `amount`, whitelist validation for `class_breakdown`, and weighted-average `rate_per_session` are all implemented correctly. The main issues are a React rendering defect (missing key on fragment), one DOM warning (invalid `colSpan={0}`), a stale-closure edge case in `handleClassEntryEdit`, and a column-count mismatch in `PayrollClassRow` that will misalign with the summary table header.

---

## Issues

### ISSUE-1: Missing `key` on `<>` fragment in `payslips.map()`
- **Category:** bug
- **Severity:** high
- **Problem:** The outer `<>...</>` fragment wrapping `PayrollClassRow` + `PayrollSpreadsheetRow` has no `key` prop. React requires every element returned from a `.map()` to carry a unique `key`. Without it, React cannot track row identity during re-renders, leading to mismatched state (e.g., class row inputs showing stale values after another row's session count changes) and React key warnings in the console.
- **Evidence:** `payroll-spreadsheet.tsx` lines 269–297: `return (<> {hasBreakdown && ...} <PayrollSpreadsheetRow .../> </>)`. The `key` on `PayrollSpreadsheetRow` (line 285) is inside the fragment, not on the fragment itself.
- **Suggested fix:** Replace `<>` with `<React.Fragment key={payslip.id}>` (also requires `import React from 'react'` or use `Fragment` import). The inner `key` on `PayrollSpreadsheetRow` can then be removed since `Fragment` already keys the group.

---

### ISSUE-2: `colSpan={0}` is invalid HTML — DOM warning + layout defect
- **Category:** bug
- **Severity:** medium
- **Problem:** In `payroll-class-row.tsx` line 72, the reset button cell uses `colSpan={canEdit ? 1 : 0}`. `colSpan={0}` is not valid HTML (minimum is 1) and browsers treat it differently — some ignore the attribute, some collapse the cell. This produces a console warning and inconsistent column alignment between editing and non-editing states.
- **Evidence:** `payroll-class-row.tsx` line 72: `<td ... colSpan={canEdit ? 1 : 0}>`.
- **Suggested fix:** Always render a real cell. Use conditional rendering instead: `{canEdit && <td ...><Button .../></td>}` and render an empty `<td className="px-1 py-1 border-r" />` when `!canEdit`.

---

### ISSUE-3: `PayrollClassRow` column count does not match spreadsheet header columns
- **Category:** bug
- **Severity:** high
- **Problem:** `PayrollClassRow` renders exactly 7 `<td>` cells (#, empty-name, class_code, sessions, rate, amount, reset). The spreadsheet header renders: `<th>#</th>` + `<th>Lớp</th>` + N dynamic columns from `visibleColumns` (19 for teacher tab, 18 for assistant tab). The class row cells will be misaligned with the summary row and header — columns shift right and the table layout breaks visually.
- **Evidence:** `payroll-class-row.tsx` lines 31–84 (7 `<td>` elements). `payroll-spreadsheet.tsx` header lines 241–259 (2 fixed + up to 19 dynamic = 21 columns for teacher tab). The class row has no empty filler cells to span the remaining columns after `amount`.
- **Suggested fix:** After the amount cell, add a filler `<td colSpan={visibleColumns.length - 3} />` (spanning the remaining dynamic columns past `teaching_pay`). This requires passing `colSpan` as a prop to `PayrollClassRow`, or computing it from `SPREADSHEET_COLUMNS` inside the component. Alternatively, render a single trailing `<td colSpan={remainingCols} />`.

---

### ISSUE-4: Stale `payslips` prop reference in `handleClassEntryReset` and `handleClassEntryEdit`
- **Category:** bug
- **Severity:** medium
- **Problem:** Both `handleClassEntryEdit` (line 101) and `handleClassEntryReset` (line 129) call `payslips.find(p => p.id === payslipId)` inside a `setEdits` updater callback. The `payslips` reference is captured at callback creation time (it is in the `useCallback` dependency array for `handleClassEntryReset`). For `handleClassEntryEdit`, `payslips` is in the deps array (line 121), which is correct. For `handleClassEntryReset`, `payslips` is also listed in deps (line 145), so both are technically safe. **However**, both functions access `payslips.find()` as a fallback only when `existing.class_breakdown` is absent. If the component re-renders with a refreshed `payslips` prop (e.g., after `onSaved()`) while an edit is in-flight, the stale fallback could read the old breakdown. The real risk is minimal because `class_breakdown` will always be present in `edits` after `handleToggleClassEdit` seeds it. Low blast radius but worth documenting.
- **Evidence:** `payroll-spreadsheet.tsx` lines 102–103 and 130–131: `existing.class_breakdown ?? payslip?.class_breakdown ?? []`. The double fallback is the smell.
- **Suggested fix:** Remove the `payslips.find()` fallback entirely. If `existing.class_breakdown` is undefined at the time of an edit, it means `handleToggleClassEdit` was never called — which is a precondition violation. Assert instead: `if (!existing.class_breakdown) return prev` (bail out of the updater rather than silently using stale data).

---

### ISSUE-5: Server does not validate `class_breakdown[].class_name` is a string
- **Category:** security
- **Severity:** low
- **Problem:** `sanitizeBatchFields` in `payroll-payslip-actions.ts` validates `class_code` (non-empty string), `sessions` (number >= 0), and `rate` (number >= 0). It does not validate `class_name`. A client could send `class_name: null`, `class_name: 1234`, or a very long string, all of which would pass through to the JSONB column.
- **Evidence:** `payroll-payslip-actions.ts` lines 133–138: only `sessions`, `rate`, `class_code` are validated. `class_name` is spread via `{ ...entry, amount: ... }`.
- **Suggested fix:** Add `if (typeof entry.class_name !== 'string') return 'class_breakdown: class_name không hợp lệ.'` after the `class_code` check. Optionally add a length cap (e.g., 100 chars).

---

### ISSUE-6: `handleClassEntryEdit` amount recalc uses single-field update, not full cross product
- **Category:** bug
- **Severity:** low
- **Problem:** When `field === 'sessions'`, the amount is computed as `value * c.rate` (new sessions × existing rate). When `field === 'rate'`, it is `c.sessions * value` (existing sessions × new rate). This is logically correct. However the partial spread `{ ...c, [field]: value, amount: ... }` also means `default_sessions` / `default_rate` are preserved from the snapshot — this is correct for reset. No actual defect, but the arithmetic should be verified: `amount` should always equal `c.sessions * c.rate` after either branch. Confirmed correct.
- **Evidence:** `payroll-spreadsheet.tsx` lines 105: `amount: field === 'sessions' ? value * c.rate : c.sessions * value`. Both branches are arithmetically consistent with the updated field value.
- **Verdict:** No fix required.

---

### ISSUE-7: Excel per-class rows have empty cells in non-class columns — substitute_pay not included in per-class row
- **Category:** maintainability
- **Severity:** low
- **Problem:** Per-class rows in the Excel export (lines 35–39 of `excel-payroll-export.ts`) emit 20 empty strings for columns 8-20. This is intentional (class rows show only class-level data) but `substitute_pay` (col 8 = "Dạy thay") is always blank on class rows. The summary row fills it. This is correct behavior — substitute pay is not class-specific. No defect, but the magic empty string count (13 trailing `''` on line 38) is fragile: if HEADERS gains a column, the count will be wrong silently.
- **Evidence:** `excel-payroll-export.ts` lines 35–39: `'', '', '', '', '', '', '', '', '', '', '', '', ''` (13 empties to reach 20 total).
- **Suggested fix:** Replace trailing empties with `...new Array(HEADERS.length - 7).fill('')` to make the per-class row automatically match header length regardless of future column additions.

---

### ISSUE-8: `buildClassBreakdown` filters out classes with 0 sessions — teaching staff with no attendance show empty breakdown
- **Category:** edge-case
- **Severity:** medium
- **Problem:** `buildClassBreakdown` (line 99 in `payroll-calculate-actions.ts`) filters `.filter(e => e.sessions > 0)`. An active teacher assigned to a class but absent all month will have `sessions=0` for that class and it will be excluded from the breakdown. The resulting `class_breakdown: []` causes `hasBreakdown = false` in the spreadsheet, so the "Sửa lớp" button never appears. The accountant cannot see or override that class's sessions. This is a data visibility gap, not a correctness bug (zero sessions still produce zero pay), but it may confuse accountants expecting to see all assigned classes.
- **Evidence:** `payroll-calculate-actions.ts` line 99: `.filter((e: ClassBreakdownEntry) => e.sessions > 0)`.
- **Suggested fix (optional):** Consider whether to include 0-session entries in the breakdown for visibility. If sessions=0 is expected to appear (e.g., class was cancelled), remove the filter. If deliberate omission is acceptable, add a comment explaining the design choice.

---

### ISSUE-9: `isDirty` badge count counts payslip rows, not changed class entries
- **Category:** maintainability
- **Severity:** low
- **Problem:** The toolbar badge reads `{edits.size} hàng chưa lưu`. When the accountant edits class rows for a single employee, `edits` gains one entry (the employee's payslip ID). The badge correctly shows "1 hàng chưa lưu". This is consistent and accurate. No defect — noting it is intentional.
- **Evidence:** `payroll-spreadsheet.tsx` lines 207–210. `edits` is keyed by `payslip_id`, not by class entry. Correct.
- **Verdict:** No fix required.

---

### ISSUE-10: Office tab `isTeachingTab=false` — "Lớp" column header rendered but no class rows emitted
- **Category:** edge-case
- **Severity:** low
- **Problem:** The `isTeachingTab` flag is `tab === 'teacher' || tab === 'assistant'`. When `tab === 'office'`, `isTeachingTab=false`, so the "Lớp" `<th>` column and the "Lớp" toggle `<td>` are both suppressed (guarded by `isTeachingTab &&`). Office payslips should never have `class_breakdown` entries (their position is `office`/`admin` and `buildClassBreakdown` is skipped). So `hasBreakdown = isTeachingTab && breakdown.length > 0` will always be false for office. No rendering defect. Correct.
- **Evidence:** `payroll-spreadsheet.tsx` lines 180, 266, 242.
- **Verdict:** No fix required.

---

## Summary Table

| # | Title | Category | Severity | Action |
|---|-------|----------|----------|--------|
| 1 | Missing `key` on Fragment in map | bug | **high** | Fix required |
| 2 | `colSpan={0}` invalid HTML | bug | **medium** | Fix required |
| 3 | ClassRow column count mismatch | bug | **high** | Fix required |
| 4 | Stale-closure fallback in reset/edit | bug | **medium** | Fix recommended |
| 5 | `class_name` not validated server-side | security | low | Fix recommended |
| 6 | Amount recalc arithmetic | — | — | No issue |
| 7 | Excel trailing empty fragility | maintainability | low | Fix recommended |
| 8 | Zero-session classes excluded from breakdown | edge-case | medium | Decision needed |
| 9 | Dirty badge counts payslip rows | — | — | No issue |
| 10 | Office tab isolation | — | — | No issue |

---

## Positive Observations
- Server-side `amount` recalc in `sanitizeBatchFields` (line 138) correctly ignores client-sent amount — good defense.
- `buildClassBreakdown` stores `default_sessions`/`default_rate` for reset — correct snapshot pattern.
- `handleToggleClassEdit` seeds `class_breakdown` into edits on open — avoids needing `payslips.find()` for the common path.
- `class_breakdown` size capped at 50 entries server-side — good.
- Weighted average `effectiveRate` calculation (teachingPay / sessionsWorked) is correct for multi-class teachers.
- `onDirtyChangeRef` pattern correctly avoids infinite-loop from callback identity changes.
- `EMPTY_EDITS` stable reference avoids memo defeat on unedited rows.
- Excel footer `totSubPay` accumulates from `p.substitute_pay` (summary row value) — correct.

---

### VERDICT
- **Status: REVISE**
- **Reason:** Two high-severity rendering bugs (ISSUE-1: missing Fragment key, ISSUE-3: class row column count mismatch) will cause visible layout defects and React warnings in production. ISSUE-2 (colSpan=0) produces a DOM warning and inconsistent table rendering. All three are straightforward fixes. ISSUE-4 and ISSUE-5 are recommended clean-ups. Feature logic (calc, security, persistence) is correct and well-structured.

**Blocking fixes before deploy:**
1. ISSUE-1 — Add `key` to Fragment (`React.Fragment key={payslip.id}`)
2. ISSUE-3 — Add filler `<td>` spanning remaining columns in `PayrollClassRow`
3. ISSUE-2 — Replace `colSpan={0}` with conditional render
