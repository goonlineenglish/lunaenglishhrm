# Code Review: Attendance Summary by Class — Implementation

**Reviewer:** code-reviewer (adversarial)
**Date:** 2026-03-14
**Scope:** 9 files — types, server actions, UI components, page edits, date helper extraction
**Verdict:** REVISE (2 high, 3 medium, 2 low)

---

## Issues

### ISSUE-1: Double-fetch on initial summary tab click
- **Category:** performance / bug
- **Severity:** high
- **File:** `app/(dashboard)/attendance/page.tsx` (lines 82-95, 126-130)
- **Problem:** When user clicks the "Tổng hợp" tab, `fetchSummary()` fires from TWO sources simultaneously:
  1. `onValueChange` handler (line 129): `if (tab === 'summary') fetchSummary()`
  2. `useEffect` (line 93-95): fires when `activeTab === 'summary'` because `setActiveTab(tab)` triggers a re-render, and the effect depends on `weekStart`/`branchId` (which haven't changed, but the effect also runs on mount of the dependency check when `activeTab` transitions to `'summary'`).

  On the **first** tab switch, both fire in the same render cycle → two concurrent network requests for identical data. Subsequent switches also double-fire because `onValueChange` always calls `fetchSummary()`, and the `useEffect` re-evaluates with `activeTab === 'summary'` true.

  More precisely: `setActiveTab('summary')` in `onValueChange` → React schedules re-render → `onValueChange` also calls `fetchSummary()` synchronously → re-render triggers `useEffect` which sees `activeTab === 'summary'` → calls `fetchSummary()` again.

- **Evidence:** `onValueChange` (line 126-130) calls `fetchSummary()` directly. The `useEffect` on line 93-95 also calls `fetchSummary()` when `activeTab === 'summary'`. Both paths execute on every tab switch to summary.
- **Suggested fix:** Remove the direct `fetchSummary()` call from `onValueChange`. Let the `useEffect` be the single trigger. The `useEffect` should include `activeTab` in its dependency array (currently using `eslint-disable-line`) and only fire when `activeTab === 'summary'`:
  ```tsx
  useEffect(() => {
    if (activeTab === 'summary') fetchSummary()
  }, [activeTab, weekStart, branchId]) // eslint-disable-line react-hooks/exhaustive-deps
  ```
  Then simplify `onValueChange` to just `setActiveTab(val as 'grid' | 'summary')`.

---

### ISSUE-2: Accountant `effectiveBranch` not overridden — uses raw `branchId` param
- **Category:** security
- **Severity:** high
- **File:** `lib/actions/attendance-summary-actions.ts` (line 218)
- **Problem:** `effectiveBranch` is only overridden for `branch_manager`:
  ```ts
  const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
  ```
  For `accountant`, `effectiveBranch = branchId` (the client-supplied parameter). The accountant branch guard (line 223) only fires when `user.branch_id` is truthy. If an accountant's JWT `app_metadata` somehow has `branch_id: null` (data setup error, migration issue), the guard is **bypassed entirely** and the accountant can query ANY branch.

  While RLS at the DB level would still filter (`get_user_role() = 'accountant'` policies allow all-branch reads), the action-level defense-in-depth intent is defeated. This is inconsistent with the BM guard which forcefully overrides `effectiveBranch`.

- **Evidence:** Line 218 only handles `branch_manager`. Line 223 is conditional on `user.branch_id` being truthy. Compare with payroll-calculate-actions.ts line 167 which has the same gap.
- **Suggested fix:** Apply the same pattern as BM — force `effectiveBranch` for accountant:
  ```ts
  const effectiveBranch = (user.role === 'branch_manager' || user.role === 'accountant')
    ? user.branch_id!
    : branchId
  ```
  OR, if the business intent is "accountant can view all branches" (per README: "All view"), remove the accountant branch guard entirely and document the decision. Current code is ambiguous — it *tries* to restrict but has a hole.

---

### ISSUE-3: `queryTeachingSummary` only counts attendance for `status='active'` schedules — misses deactivated classes with attendance
- **Category:** edge-case / data correctness
- **Severity:** medium
- **File:** `lib/actions/attendance-summary-actions.ts` (line 41)
- **Problem:** The query filters `.eq('status', 'active')` on `class_schedules`. If a class was deactivated mid-month but has attendance records from earlier in the month, those sessions are **excluded** from the summary. This contradicts the payroll's `buildClassBreakdown` (payroll-calculate-actions.ts line 56) which explicitly **does NOT** filter by `status='active'`:
  ```ts
  // Do NOT filter by status='active' — deactivated classes with attendance in month must still appear
  ```
  The attendance summary and payroll will show **different session counts** for the same employee/month.

- **Evidence:** attendance-summary-actions.ts line 41 vs payroll-calculate-actions.ts line 56 (comment explicitly warns about this). A class deactivated on March 15 with attendance from March 1-14 would show 0 sessions in the summary but correct sessions in payroll.
- **Suggested fix:** Remove `.eq('status', 'active')` from `queryTeachingSummary`, matching the payroll pattern. Or add a comment explaining why the discrepancy is intentional (it almost certainly isn't).

---

### ISSUE-4: `PayrollAttendanceSummary` silently swallows fetch errors
- **Category:** edge-case / UX
- **Severity:** medium
- **File:** `components/payroll/payroll-attendance-summary.tsx` (lines 37-41)
- **Problem:** When `getAttendanceSummary` returns `{ success: false, error: '...' }`, the component does nothing — `items` stays `[]`, `loading` becomes `false`, and the user sees an empty state ("Chưa có dữ liệu chấm công") with no indication that an error occurred. The error message from the server is discarded.
- **Evidence:** Line 38: `if (res.success && res.data) setItems(res.data.items)` — the else branch (error) is unhandled. No error state variable exists.
- **Suggested fix:** Add error state:
  ```ts
  const [error, setError] = useState<string | null>(null)
  // in handleOpen:
  if (res.success && res.data) { setItems(res.data.items); setError(null) }
  else setError(res.error ?? 'Lỗi tải dữ liệu.')
  ```
  Render error below the toggle button.

---

### ISSUE-5: `fetchSummary` in attendance page also silently swallows errors
- **Category:** edge-case / UX
- **Severity:** medium
- **File:** `app/(dashboard)/attendance/page.tsx` (lines 82-89)
- **Problem:** Same pattern as ISSUE-4. `fetchSummary` only handles the success case. If `getAttendanceSummary` fails (auth error, DB error), `summaryItems` stays as previous data (stale) or `[]`, and the user sees stale/empty data with no error indicator on the summary tab.
- **Evidence:** Line 88: `if (res.success && res.data) setSummaryItems(res.data.items)` — no else branch.
- **Suggested fix:** Add `summaryError` state, set it in the else branch, render it in the summary `TabsContent`.

---

### ISSUE-6: Branch footer totals compute ONLY week totals — misleading when `useMonthClasses=true`
- **Category:** edge-case / UX
- **Severity:** low
- **File:** `components/attendance/attendance-summary-cards.tsx` (lines 53-58, 106-114)
- **Problem:** `SummaryContent` always computes footer totals from `emp.total_week`. When `useMonthClasses=true` (payroll/my-attendance surfaces), the individual cards show month class breakdowns, but the branch footer shows **week** totals. This is numerically inconsistent — card-level data shows month sessions while the footer shows week totals.
- **Evidence:** Lines 53-58 always use `e.total_week`. Footer label says "Tổng chi nhánh (tuần)" which is accurate label-wise, but confusing when the cards above show monthly data. User may wonder why card totals don't match the footer.
- **Suggested fix:** When `useMonthClasses=true`, compute footer from `e.total_month` and change label to "Tổng chi nhánh (tháng)":
  ```tsx
  const totalField = useMonthClasses ? 'total_month' : 'total_week'
  const label = useMonthClasses ? 'tháng' : 'tuần'
  ```

---

### ISSUE-7: `position` type is stringly-typed across all interfaces
- **Category:** maintainability
- **Severity:** low
- **File:** `lib/types/attendance-summary-types.ts` (line 14)
- **Problem:** `position` is typed as `string` with a JSDoc comment listing possible values. Every consumer does string comparisons (`emp.position === 'office'`). If a new position is added or a typo occurs, there's no compile-time safety. The same pattern exists in `POSITION_LABELS` (attendance-summary-cards.tsx line 17) and `buildSummaryItems` (attendance-summary-actions.ts line 151).
- **Evidence:** `attendance-summary-types.ts` line 14: `/** 'teacher' | 'assistant' | 'office' | 'admin' */ position: string`. Should be a union type or enum.
- **Suggested fix:** Define `type EmployeePosition = 'teacher' | 'assistant' | 'office' | 'admin'` in types and use it across all interfaces. Low priority since DB CHECK constraint catches invalid values at storage layer.

---

## Non-Issues (Verified OK)

1. **Auth guards**: Both public actions verify `getCurrentUser()`, check role allowlists, enforce branch guards. `getMyAttendanceSummary` correctly restricts to `employee` role only and passes `employeeId` to all sub-queries (defense-in-depth on top of RLS).

2. **Error handling (throw on DB error)**: All internal query helpers (`queryTeachingSummary`, `queryOfficeSummary`, `queryEmployeeInfo`) correctly `throw` on Supabase errors. Public actions wrap in try/catch and return `{ success: false }`.

3. **0 employees edge case**: `buildSummaryItems` iterates `employees` array. If empty, returns `[]`. `SummaryContent` handles empty items with "Chưa có dữ liệu chấm công." message.

4. **Week vs month aggregation**: Separate query pairs (week range + month range) with independent aggregation maps. No cross-contamination.

5. **`getMonthBounds` extraction**: Correctly moved to `date-helpers.ts`. Payroll imports verified. Old local copy confirmed removed (only exists in plan docs).

6. **Barrel re-export**: `attendance-actions.ts` correctly re-exports types and actions from the new summary module.

7. **`getMyAttendanceSummary` week calculation**: Uses `getWeekStart(new Date())` for the "current week" view — intentional since the employee portal shows "this week" regardless of month selector. Month data uses explicit `month/year` params.

8. **Supabase `.in()` with large arrays**: `scheduleIds` comes from `class_schedules` per branch. Realistic max ~50 classes/branch. No performance concern.

9. **SSR correctness (my-attendance)**: Server component correctly `await`s both `getMyAttendance` and `getMyAttendanceSummary`. Sequential waterfall is acceptable since both are fast (<100ms each) and share the same Supabase auth context.

10. **`PayrollAttendanceSummary` race condition**: `fetched` flag prevents re-fetch. No race — `handleOpen` is synchronous toggle + conditional async fetch. Even if clicked rapidly, `setOpen(!open)` toggles back before the async completes, and `fetched` flag gates the fetch.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 2 | ISSUE-1, ISSUE-2 |
| Medium | 3 | ISSUE-3, ISSUE-4, ISSUE-5 |
| Low | 2 | ISSUE-6, ISSUE-7 |

---

## VERDICT

- **Status:** REVISE
- **Reason:** ISSUE-3 (active-only filter diverges from payroll session counting) is a data correctness bug that will cause summary/payroll mismatch for deactivated classes. ISSUE-1 (double-fetch) wastes requests on every tab switch. ISSUE-2 (accountant effectiveBranch gap) is a security defense-in-depth gap. Fix these 3, then the remaining medium/low issues should be addressed for production polish.

**Priority order:**
1. **ISSUE-3** — data correctness: remove `.eq('status', 'active')` from `queryTeachingSummary`
2. **ISSUE-1** — double-fetch: consolidate to single `useEffect` trigger
3. **ISSUE-2** — accountant guard: decide business rule and implement consistently
4. **ISSUE-4 + ISSUE-5** — error state display
5. **ISSUE-6** — footer totals context-awareness
6. **ISSUE-7** — type safety (optional, low priority)
