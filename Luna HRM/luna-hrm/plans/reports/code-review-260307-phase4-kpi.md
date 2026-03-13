# Code Review: Phase 4 — KPI Evaluation System

**Date:** 2026-03-07
**Reviewer:** code-reviewer agent
**Scope:** 13 files, ~1,319 LOC
**Focus:** Backend actions, calculation service, cron, UI components

---

## Overall Assessment

Solid implementation. Business logic is correct for the core path: Part A pass/fail, Part B 5 scored criteria summing to /10, bonus = score x 50k VND, base_pass=false nullifies bonus. Code is modular, well-split (<200 LOC per file), and follows project conventions. However, there are several security gaps and edge cases that require attention before production.

---

## Critical Issues [P0]

### P0-1. saveKpiEvaluation does NOT verify target employee is an assistant

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-save-actions.ts` (lines 16-71)

The save action accepts any `employee_id` from the client and upserts a KPI evaluation without checking that the employee actually has `position = 'assistant'`. An admin or BM could (accidentally or intentionally) create KPI evaluations for teachers, office staff, or even other managers.

The list page (`getAssistantsWithKpiStatus`) correctly filters by `position = 'assistant'`, but the save endpoint is independently callable. An attacker with admin/BM credentials could inject KPI records for non-assistant employees, potentially corrupting payroll calculations downstream.

**Suggested fix:**
```typescript
// In saveKpiEvaluation, after role check and before score validation:
const { data: emp, error: empErr } = await sb
  .from('employees')
  .select('id, position, branch_id, is_active')
  .eq('id', data.employee_id)
  .maybeSingle()
if (empErr || !emp) return { success: false, error: 'Nhân viên không tồn tại.' }
if (emp.position !== 'assistant') return { success: false, error: 'Chỉ đánh giá KPI cho trợ giảng.' }
if (!emp.is_active) return { success: false, error: 'Nhân viên đã ngừng hoạt động.' }
// Also verify branch_id matches the employee's actual branch:
if (data.branch_id !== emp.branch_id) return { success: false, error: 'Chi nhánh không khớp với nhân viên.' }
```

### P0-2. getKpiEvaluation has no branch scoping BEFORE data fetch for BM

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-query-actions.ts` (lines 97-129)

The function fetches any KPI record by `employee_id + month + year`, then checks `data.branch_id !== user.branch_id` after the fact. While RLS provides a server-side safety net, the application-level check has a subtle data leak: for months where no KPI exists yet (`data` is null), a BM can confirm that a specific employee in another branch has NOT been evaluated (because null is returned as success). This is an information disclosure issue.

More importantly: the function does `select('*')` which retrieves full evaluation details before the branch check. If RLS is misconfigured or bypassed (e.g., using admin client elsewhere), the full record is returned to unauthorized BMs.

**Suggested fix:**
```typescript
// Add employee branch verification before querying kpi_evaluations:
if (user.role === 'branch_manager') {
  const { data: emp } = await sb
    .from('employees')
    .select('branch_id')
    .eq('id', employeeId)
    .maybeSingle()
  if (!emp || emp.branch_id !== user.branch_id) {
    return { success: false, error: 'Bạn không có quyền xem KPI này.' }
  }
}
```

### P0-3. Cron route timing-attack vulnerability on CRON_SECRET comparison

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\api\cron\kpi-reminder\route.ts` (line 14)

```typescript
if (secret !== process.env.CRON_SECRET) {
```

Direct string comparison (`!==`) is vulnerable to timing attacks. An attacker can iteratively determine the secret character-by-character by measuring response times. For a cron endpoint that uses admin Supabase client (bypassing RLS), this is a meaningful risk.

**Suggested fix:**
```typescript
import { timingSafeEqual } from 'crypto'

function verifySecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

// Usage:
if (!verifySecret(secret, process.env.CRON_SECRET)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## High Priority [P1]

### P1-1. getKpiHistory ordering is incorrect for cross-year queries

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-query-actions.ts` (lines 181-187)

```typescript
.order('year', { ascending: false })
.order('month', { ascending: false })
.limit(months)
```

This ordering breaks when records span year boundaries. For example, with records for months [2026-01, 2026-02, 2025-11, 2025-12, 2025-10], the descending year-then-month ordering gives: 2026-02, 2026-01, 2025-12, 2025-11, 2025-10. This is actually correct for Supabase's multi-column ordering.

However, the `limit(months)` is applied **before** the branch filter on line 191-193:

```typescript
let records = (data ?? []) as KpiEvaluation[]
if (user.role === 'branch_manager' && user.branch_id) {
  records = records.filter((r) => r.branch_id === user.branch_id)
}
```

If an employee was transferred between branches (edge case), the BM could get fewer than 6 records because records from another branch are filtered out after the limit. A BM requesting 6 months of history might get 4 because 2 were from a different branch and got filtered out post-limit.

**Suggested fix:** Apply branch filter in the query, not post-fetch:
```typescript
let query = sb.from('kpi_evaluations').select('*').eq('employee_id', employeeId)

if (user.role === 'branch_manager' && user.branch_id) {
  query = query.eq('branch_id', user.branch_id)
}

const { data, error } = await query
  .order('year', { ascending: false })
  .order('month', { ascending: false })
  .limit(months)
```

### P1-2. getPreviousKpi does NOT verify BM branch scoping

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-query-actions.ts` (lines 131-164)

Unlike `getKpiEvaluation` (which has a post-fetch branch check), `getPreviousKpi` has zero branch scoping for BMs. A BM can call `getPreviousKpi(anyEmployeeId, month, year)` and read any employee's KPI from any branch, including scores and comments. RLS may protect this at the DB level, but the application layer should enforce it too as defense-in-depth.

**Suggested fix:** Add the same branch check as `getKpiEvaluation`, or better, verify employee belongs to BM's branch before querying.

### P1-3. CRON_SECRET undefined check is missing

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\api\cron\kpi-reminder\route.ts` (line 14)

```typescript
if (secret !== process.env.CRON_SECRET) {
```

If `CRON_SECRET` env var is not set, `process.env.CRON_SECRET` is `undefined`. The comparison `null !== undefined` is `true`, so requests with no secret header would be rejected. However, if someone sends `x-cron-secret: undefined` as a string, it would also be rejected. The real risk: if `CRON_SECRET` is empty string `""` and the attacker sends an empty header, access is granted.

**Suggested fix:**
```typescript
const expected = process.env.CRON_SECRET
if (!expected || !secret || secret !== expected) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### P1-4. Client-side role detection calls server action and has race condition

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\kpi\page.tsx` (lines 41-45)

```typescript
useEffect(() => {
  getCurrentUser().then((user) => {
    if (user?.role === 'admin') setIsAdmin(true)
  })
}, [])
```

This runs **after** `fetchData` is already triggered by the second `useEffect` on line 64. On mount, `isAdmin` is `false` and `branchId` is `""`. The `fetchData` callback runs with `isAdmin=false`, so it does NOT short-circuit at line 48-52 and immediately calls `getAssistantsWithKpiStatus(branchId='', month, year)`. For a BM, this works (server overrides branchId). For an admin with no branch, this sends `branchId=''` to the server which may return an error or empty results before the role detection completes and re-triggers the fetch.

This causes a flash of error or empty state for admin users, followed by correct state once `isAdmin` is set and the branch selector appears.

**Suggested fix:** Fetch user first, then conditionally fetch data:
```typescript
const [userLoaded, setUserLoaded] = useState(false)

useEffect(() => {
  getCurrentUser().then((user) => {
    if (user?.role === 'admin') setIsAdmin(true)
    setUserLoaded(true)
  })
}, [])

const fetchData = useCallback(async () => {
  if (!userLoaded) return
  if (isAdmin && !branchId) { setAssistants([]); setLoading(false); return }
  // ...rest
}, [branchId, month, year, isAdmin, userLoaded])
```

### P1-5. evalToForm loses individual mandatory check state

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-eval-form-hooks.ts` (lines 28-38)

```typescript
function evalToForm(ev: KpiEvaluation): KpiFormData {
  return {
    base_pass: ev.base_pass,
    mandatory_checks: MANDATORY_CRITERIA.map(() => ev.base_pass),
    // ...
  }
}
```

When loading an existing evaluation, the 4 individual mandatory check states are reconstructed from `base_pass` alone. If `base_pass=false`, all 4 checks are set to `false`, even if only 1 of the 4 was actually unchecked. The database only stores `base_pass` (boolean), not which specific mandatory criteria failed.

This is a data model limitation. When a BM edits a previously saved evaluation where, say, only criterion #3 failed, all 4 criteria appear as "Not passed" on reload. The BM must re-check 1, 2, and 4 before saving again.

**Impact:** Moderate UX frustration. To fix properly, either store `mandatory_checks` as a JSONB column in the DB, or accept this as a known limitation and document it in the UI ("All criteria reset on reload").

---

## Medium Priority [P2]

### P2-1. `as any` cast on Supabase client used throughout all actions

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-query-actions.ts` (lines 31, 109, 148, 179)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\kpi-save-actions.ts` (line 57)

```typescript
const sb = supabase as any
```

All 5 occurrences cast the typed Supabase client to `any`, discarding all type safety. This means column name typos, wrong table names, or incorrect filter types will not be caught at compile time. The project has a `Database` type interface that defines all tables.

**Suggested fix:** Use the typed client directly. If the Supabase client generic types cause issues with RLS helpers, create a wrapper type instead of casting to `any`.

### P2-2. Month/year from URL params are not validated

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\kpi\[employee]\page.tsx` (lines 28-29)

```typescript
const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
const year = Number(searchParams.get('year') ?? new Date().getFullYear())
```

No validation that month is 1-12 or year is reasonable. `?month=13` or `?month=-1` or `?month=abc` (which becomes `NaN`) will be passed to server actions. The server's `validateAllScores` only validates scores, not month/year. The DB has `CHECK (month BETWEEN 1 AND 12)` which will reject invalid months on save, but queries with invalid month/year will return empty results without user feedback.

**Suggested fix:**
```typescript
const rawMonth = Number(searchParams.get('month'))
const rawYear = Number(searchParams.get('year'))
const month = (rawMonth >= 1 && rawMonth <= 12) ? rawMonth : new Date().getMonth() + 1
const year = (rawYear >= 2020 && rawYear <= 2100) ? rawYear : new Date().getFullYear()
```

### P2-3. Cron endpoint leaks internal data structure in JSON response

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\api\cron\kpi-reminder\route.ts` (lines 90-97)

```typescript
return NextResponse.json({
  success: true,
  month, year,
  total_assistants: assistants.length,
  total_evaluated: evaluatedIds.size,
  summary, // includes branch_id UUIDs, branch names, pending counts
})
```

Although protected by `CRON_SECRET`, the response includes internal branch IDs and organizational structure. If the cron is ever called by an external scheduler (e.g., cron-job.org), response data traverses the internet.

**Suggested fix:** Return minimal response. Log details server-side only:
```typescript
return NextResponse.json({
  success: true,
  month, year,
  total_pending: summary.reduce((sum, s) => sum + s.pending_count, 0),
})
```

### P2-4. KPI_CRITERIA defines max scores in TWO places (type duplication)

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\types\kpi.ts` (lines 8-39): `KPI_CRITERIA[].maxScore`
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\services\kpi-calculation-service.ts` (lines 9-15): `SCORE_MAX` record

Both define the same max scores (tsi:1, funtime:3, parent:2, student:3, demeanor:1). If one is updated without the other, validation and UI will disagree.

**Suggested fix:** Import `KPI_CRITERIA` in the calculation service and derive `SCORE_MAX` from it:
```typescript
import { KPI_CRITERIA } from '@/lib/types/kpi'
const SCORE_MAX: Record<string, number> = Object.fromEntries(
  KPI_CRITERIA.map(c => [c.key, c.maxScore])
)
```

### P2-5. History chart bar height is 0% for score=0, hiding the bar completely

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-history-chart.tsx` (line 69)

```typescript
const heightPct = hasData ? Math.max(4, (score / MAX_SCORE) * 100) : 0
```

A score of 0 yields `(0/10)*100 = 0`, then `Math.max(4, 0) = 4`. This actually correctly shows a minimal bar. The logic is fine. (No finding here.)

### P2-6. `base_pass` field in KpiFormData is redundant with `mandatory_checks`

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\types\kpi.ts` (lines 54-68)

`KpiFormData` has both `base_pass: boolean` and `mandatory_checks: boolean[]`. The `handleSave` in `kpi-eval-form-hooks.ts` line 106 correctly derives `basePassed = form.mandatory_checks.every(Boolean)` and uses that for the payload, ignoring `form.base_pass`. The `base_pass` field in the form data is only used during initial load (from DB) but is never updated when individual checks change.

This means `form.base_pass` can be stale/incorrect during editing. It is currently not referenced during save (good), but any future code that reads `form.base_pass` directly will get a wrong value.

**Suggested fix:** Remove `base_pass` from `KpiFormData` and always derive it from `mandatory_checks`. Or update `base_pass` in `handleChecks`:
```typescript
function handleChecks(checks: boolean[]) {
  setForm((prev) => ({ ...prev, mandatory_checks: checks, base_pass: checks.every(Boolean) }))
  setSaveSuccess(false)
}
```

---

## Low Priority [P3]

### P3-1. DEFAULT_FORM initializes all mandatory_checks to `true`

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-eval-form-hooks.ts` (line 20)

```typescript
mandatory_checks: MANDATORY_CRITERIA.map(() => true),
```

New evaluations start with all checks as "passed" by default. This is a UX choice — it means BMs only toggle items that fail. It seems intentional but could lead to accidentally saving all-pass when a BM forgets to review. Consider defaulting to `false` and requiring explicit review.

### P3-2. No loading/error state shown for admin when branchId changes

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\kpi\page.tsx` (line 110)

```typescript
onChange={(id) => { setBranchId(id); setAssistants([]) }}
```

When admin switches branches, assistants are cleared immediately but loading state is not set until `fetchData` runs on the next render cycle. Brief flash of "no assistants" message before loading spinner appears.

### P3-3. `formatVND(a.bonus_amount)` then appends `₫` — double currency symbol possible

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\kpi\page.tsx` (line 172)

```typescript
{a.bonus_amount !== null ? `${formatVND(a.bonus_amount)} ₫` : '—'}
```

`formatVND` uses `Intl.NumberFormat("vi-VN").format()` which returns a plain number (e.g., "250.000"). The `₫` appended is correct here. However, this pattern differs from `kpi-score-display.tsx` line 34 which uses the same pattern. Consistent, so no issue, just noting for future reference if `formatVNDFull` (which includes ₫) is used elsewhere.

### P3-4. KPI history chart does not show `base_pass` status

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\kpi\kpi-history-chart.tsx`

Bars are colored by score (green/yellow/red) but there is no indication whether `base_pass=false` for a given month. An assistant could have a green bar (score 9/10) but actually received 0 bonus because they failed Part A. Consider adding a visual indicator (e.g., striped pattern or a small "X" icon) for months where `base_pass=false`.

---

## Edge Cases Found by Scout

1. **Employee branch transfer:** If an employee is transferred to a different branch mid-month, KPI evaluations tied to the old branch_id remain. The new BM cannot see/edit them, and the old BM still can. No migration logic exists.

2. **Concurrent evaluation edits:** Two BMs (or admin + BM) could open the same employee's KPI form simultaneously. The upsert on `(employee_id, month, year)` means last-write-wins with no optimistic concurrency control. No `updated_at` check before save.

3. **Employee deactivation after evaluation:** If an employee is deactivated (`is_active=false`) after being evaluated, the KPI list page filters them out (`.eq('is_active', true)`), making their evaluation invisible from the list view. But the cron reminder will also skip them (correct behavior). However, the evaluation data is orphaned from the UI.

4. **Admin with no branch_id:** Admin users may have `branch_id = null` in app_metadata. In `kpi-eval-form-hooks.ts` line 60, `setBranchId(userResult.branch_id ?? '')` sets branchId to `''`. The save action receives `branch_id: ''` (empty string), which will fail the FK constraint on the DB. However, admins always pick a branch via BranchSelector, and `evalResult.data.branch_id` or `prevResult.data.branch_id` overrides it. For new evaluations with no previous data, the admin must have selected a branch via the list page, and the branchId is passed... but wait, the branchId is NOT passed from the list page to the form page. It is derived from `getCurrentUser().branch_id` or the eval/prev data. For admin creating a first-ever evaluation, `branchId` will be empty string `""`.

5. **NaN scores from URL manipulation:** If someone navigates to `/kpi/abc?month=xyz&year=def`, `month` and `year` become `NaN`, causing all queries to return empty results with no error message.

---

## Positive Observations

1. **Clean separation of concerns**: Types, calculation service (pure functions), query actions, save actions, UI components, hooks — all properly separated.
2. **Correct upsert pattern**: `onConflict: 'employee_id,month,year'` matches the DB UNIQUE constraint.
3. **Server-side score recalculation**: `saveKpiEvaluation` recalculates `total_score` and `bonus_amount` server-side, ignoring client-provided values. This prevents manipulation.
4. **RLS as defense-in-depth**: DB-level RLS policies exist for all 4 roles, adding protection beyond application-level checks.
5. **Pre-fill from previous month**: Smart UX — copies scores (but clears comments) from the previous month.
6. **Modular UI components**: Each KPI UI concern (Part A, Part B, score display, history chart) is a separate component.
7. **CSS-only bar chart**: No external charting library dependency for the history chart.
8. **Score validation**: Both client-side (dropdown limits) and server-side (`validateAllScores`) enforce valid ranges.

---

## Recommended Actions (Priority Order)

1. **[P0-1]** Add position='assistant' verification in `saveKpiEvaluation` before upsert
2. **[P0-2]** Add pre-fetch branch scoping in `getKpiEvaluation` for BMs
3. **[P0-3]** Use `timingSafeEqual` for CRON_SECRET comparison
4. **[P1-1]** Move branch filter into DB query in `getKpiHistory` (pre-limit)
5. **[P1-2]** Add branch scoping to `getPreviousKpi`
6. **[P1-3]** Add `!expected` guard for missing CRON_SECRET
7. **[P1-4]** Fix admin role detection race condition on KPI list page
8. **[P1-5]** Document or fix mandatory_checks data loss on reload
9. **[P2-1]** Remove `as any` casts — use typed Supabase client
10. **[P2-2]** Validate month/year URL params
11. **[P2-4]** Derive SCORE_MAX from KPI_CRITERIA (single source of truth)
12. **[P2-6]** Remove or sync `base_pass` in KpiFormData

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~70% (heavy `as any` usage reduces effective coverage) |
| Test Coverage | 0% (no tests for KPI module) |
| Linting Issues | 5 `eslint-disable` comments for `@typescript-eslint/no-explicit-any` |
| Files Reviewed | 13 |
| Total LOC | ~1,319 |

---

## Unresolved Questions

1. Should the `mandatory_checks` array be persisted in the DB as JSONB to preserve individual check states across edits?
2. Is there a plan for concurrency control (optimistic locking via `updated_at`) on KPI evaluations?
3. Should the employee portal (Phase 5) allow employees to view their own KPI? RLS policy exists for it (`employee_select_own`), but no UI route is planned.
4. For the cron reminder: when will email/notification integration be implemented? Currently it only logs to console.

---

*Generated by code-reviewer agent | 2026-03-07*
