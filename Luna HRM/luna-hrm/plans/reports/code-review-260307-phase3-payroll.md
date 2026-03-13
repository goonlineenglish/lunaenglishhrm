# Code Review: Phase 3 — Payroll Calculation Engine

**Date:** 2026-03-07
**Reviewer:** code-reviewer
**Scope:** 16 files (services, actions, UI components, types, employee portal)
**LOC:** ~1,697 lines

---

## Overall Assessment

Phase 3 is well-structured with clean separation of concerns: pure calculation function, data fetchers, session counters, server actions, and UI. The Vietnamese TNCN tax brackets and insurance rates are correctly implemented. However, there are **two critical bugs** that will cause database failures or incorrect payslip data, plus several high-priority gaps in security and data integrity.

---

## Critical Issues [P0]

### P0-1: `position='admin'` violates DB CHECK constraint — INSERT will crash

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (line 141)
**Impact:** Any employee with `position='admin'` will cause a Postgres CHECK violation error, crashing the entire batch calculation.

The `employees` table allows `position IN ('teacher', 'assistant', 'office', 'admin')`, but the `payslips` table only allows `position IN ('teacher', 'assistant', 'office')`. Line 141 writes `position: emp.position` directly, passing `'admin'` for admin-position employees.

```sql
-- payslips CHECK constraint (001_create_all_tables.sql line 265):
position TEXT NOT NULL CHECK (position IN ('teacher', 'assistant', 'office'))
```

**Suggested fix:**
```typescript
// payroll-calculate-actions.ts, line 141
const payslipData = {
  ...
  position: isOffice ? 'office' : emp.position,  // Map 'admin' → 'office'
  ...
}
```

### P0-2: Recurring deductions subtracted from NET but never persisted — data loss

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\services\payroll-calculation-service.ts` (line 93)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (lines 107, 126, 137-159)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\supabase\migrations\001_create_all_tables.sql` (lines 260-287)

**Impact:** Recurring deductions (from `salary_components` table) are correctly fetched and subtracted from `netPay`, but the `deductions` value is **never stored** in the `payslips` table (no column exists). The payslip breakdown cannot be reconstructed:

```
NET stored = GROSS - BH - TNCN - (deductions LOST) - penalties
```

When users view the payslip detail panel, the "Tong khau tru" line shows `BH + TNCN + penalties` but NOT the recurring deductions. This means `GROSS - displayed_deductions != NET`, creating an unexplainable discrepancy.

**Suggested fix:**
1. Add migration: `ALTER TABLE payslips ADD COLUMN deductions BIGINT NOT NULL DEFAULT 0;`
2. Add `deductions` to the `Payslip` TypeScript interface
3. Include `deductions: result.deductions` in the `payslipData` object (line 137)
4. Display the line in `payslip-detail-panel.tsx`

---

## High Priority [P1]

### P1-1: No branch scoping for accountant — can view/modify any branch's payroll

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-period-actions.ts` (lines 14-18, 26-55)

The `requirePayrollRole` function checks `admin || accountant` but does NOT enforce branch scoping for accountants. Per business rules in CLAUDE.md: "accountant: All view, payroll CRUD + send email". This seems intentional, but unlike branch_manager checks throughout the codebase, there is no branch_id validation.

RLS policies do grant accountants full CRUD (`payroll_periods_accountant_all`), so this is consistent, but worth explicit documentation or a comment confirming this is by design.

**Suggested fix:** Add a comment confirming intent:
```typescript
// Note: accountant role has all-branch payroll access by design (see RLS policies)
```

### P1-2: Sequential N+1 query pattern — O(n) Supabase calls per employee

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (lines 97-131)

For each employee, the code makes **6 sequential Supabase queries** (countSessions, getSubstituteSessions, getRecurringAllowances, getRecurringDeductions, getKpiBonus, getOther/getPenalty). For 20 employees = 120+ round-trips.

Each query creates a new `createClient()` call (cookie parsing overhead in server context).

**Suggested fix:** Use `Promise.all()` for independent queries per employee:
```typescript
const [sessionsWorked, substituteSessions, allowances, recurringDeductions, kpiBonus] =
  await Promise.all([
    isOffice ? countOfficeDays(emp.id, startDate, endDate) : countTeachingSessions(emp.id, startDate, endDate),
    getSubstituteSessions(emp.id, startDate, endDate),
    getRecurringAllowances(emp.id),
    getRecurringDeductions(emp.id),
    isAssistant ? getKpiBonus(emp.id, period.month, period.year) : Promise.resolve(0),
  ])
```

Or better: batch-fetch all attendance and notes in 2-3 queries, then process in-memory.

### P1-3: Upsert/insert error silently swallowed

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (lines 162-166)

The `.update()` and `.insert()` calls do NOT check the returned `error`. If one employee's payslip insert fails (e.g., due to P0-1), the error is silently swallowed and the remaining employees are still processed. The function returns `{ success: true }` even with partial failures.

```typescript
// Current: no error checking
if (existing) {
  await sb.from('payslips').update(payslipData).eq('id', existing.id)
} else {
  await sb.from('payslips').insert(payslipData)
}
```

**Suggested fix:**
```typescript
if (existing) {
  const { error: upsertErr } = await sb.from('payslips').update(payslipData).eq('id', existing.id)
  if (upsertErr) throw new Error(`Payslip update failed for ${emp.employee_code}: ${upsertErr.message}`)
} else {
  const { error: insertErr } = await sb.from('payslips').insert(payslipData)
  if (insertErr) throw new Error(`Payslip insert failed for ${emp.employee_code}: ${insertErr.message}`)
}
```

### P1-4: `updatePayslipManualFields` changes `other_pay`/`penalties` without recalculating NET

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-payslip-actions.ts` (lines 102-151)

When an accountant manually edits `other_pay` or `penalties`, only those columns are updated. The `gross_pay`, `tncn`, and `net_pay` are NOT recalculated. The payslip becomes inconsistent:

- `other_pay` is part of GROSS, so changing it should change GROSS, insurance, TNCN, and NET
- `penalties` is subtracted from NET, so changing it should change NET

The comment says "do not recalculate computed fields" (line 137), but this creates data inconsistency.

**Suggested fix:** After updating manual fields, either:
1. Re-run `calculatePayslip()` with updated values and persist all computed fields, OR
2. At minimum, display a warning "Run 'Tinh tu dong' to recalculate" after saving manual adjustments

### P1-5: `parseInt` used for currency input — truncates decimal and fails on empty strings

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\payslip-detail-panel.tsx` (lines 61-62)

```typescript
other_pay: parseInt(otherPay) || 0,
penalties: parseInt(penalties) || 0,
```

`parseInt("50000.5")` = 50000 (truncation, but VND is integer so acceptable).
`parseInt("")` = NaN, `NaN || 0` = 0 (acceptable fallback).

However, `parseInt("abc")` = NaN → 0 (silently accepts invalid input). Should validate before save.

**Suggested fix:** Use `Number()` or explicit validation:
```typescript
const parsedOtherPay = Number(otherPay)
if (isNaN(parsedOtherPay) || parsedOtherPay < 0) {
  setError('Giá trị thu nhập khác không hợp lệ.')
  return
}
```

---

## Medium Priority [P2]

### P2-1: `compareNetPay` always called with `null` — alert feature is dead code

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\payroll-table.tsx` (line 57)

```typescript
const { isAlert } = compareNetPay(p.net_pay, null)
```

Previous period's net pay is never fetched. `compareNetPay(x, null)` always returns `{ changePercent: null, isAlert: false }`. The ">20% change" alert feature described in the plan and types is never triggered.

**Suggested fix:** Fetch the previous period's payslips and create a lookup map:
```typescript
// In the parent component, fetch previous period payslips
const prevNetMap = new Map<string, number>()
// ... populate from previous period
// Then pass to PayrollTable and use:
const { isAlert } = compareNetPay(p.net_pay, prevNetMap.get(p.employee_id) ?? null)
```

### P2-2: Payslip detail panel "Tong khau tru" doesn't include recurring deductions

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\payslip-detail-panel.tsx` (line 108)

```typescript
<Row label="Tong khau tru" value={totalInsurance + payslip.tncn + payslip.penalties} bold />
```

Missing the recurring `deductions` from the total. This is a consequence of P0-2 (not persisted), but even once fixed, this line needs updating:
```typescript
<Row label="Tong khau tru" value={totalInsurance + payslip.tncn + payslip.deductions + payslip.penalties} bold />
```

### P2-3: `Payslip.position` type mismatch — TypeScript allows `'admin'` but DB rejects it

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\types\database-payroll-types.ts` (line 71)

```typescript
position: EmployeePosition  // 'teacher' | 'assistant' | 'office' | 'admin'
```

The `Payslip` TypeScript interface uses `EmployeePosition` which includes `'admin'`, but the DB CHECK constraint only allows `('teacher', 'assistant', 'office')`. This allows TypeScript to pass `'admin'` without complaint, masking P0-1 at compile time.

**Suggested fix:** Define a separate type:
```typescript
export type PayslipPosition = 'teacher' | 'assistant' | 'office'
// In Payslip interface:
position: PayslipPosition
```

### P2-4: Period totals (`total_gross`, `total_net`) in confirm dialog show stale data

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\payroll\[period]\page.tsx` (lines 178-180)

The confirm dialog receives `period.total_gross` and `period.total_net` from the initially fetched period. If the user runs "Tinh tu dong" and then immediately clicks "Duyet", the period totals shown in the confirm dialog are the **pre-calculation** stale values unless `fetchData()` completes first.

The `runAction` function does call `fetchData()` after autoCalculate succeeds, but there is no guarantee the user waits for the re-fetch before clicking "Duyet".

**Suggested fix:** Compute totals from the payslips array instead:
```typescript
totalGross={payslips.reduce((s, p) => s + p.gross_pay, 0)}
totalNet={payslips.reduce((s, p) => s + p.net_pay, 0)}
```

### P2-5: Employee portal payslip month display uses `created_at` instead of period month

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-payslips\[id]\page.tsx` (line 61)

```tsx
<CardTitle className="text-base">Phieu luong thang {p.created_at ? new Date(p.created_at).getMonth() + 1 : '—'}</CardTitle>
```

This shows the month when the payslip DB row was *created*, not the actual payroll period month. If a February payroll is calculated in March, it shows "Thang 3" instead of "Thang 2".

**Suggested fix:** Fetch the period's `month`/`year` via a JOIN or pass it from the parent. The `getMyPayslipDetail` should include `payroll_periods(month, year)`.

### P2-6: Negative net pay not handled or warned

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\services\payroll-calculation-service.ts` (line 93)

If penalties + deductions exceed gross pay, `netPay` goes negative. This is stored and displayed without any validation or warning.

**Suggested fix:**
```typescript
// At minimum, warn in UI. Optionally clamp:
if (netPay < 0) console.warn(`[calculatePayslip] Negative net pay: ${netPay}`)
// Or add an isNegativeWarning flag to PayslipResult
```

### P2-7: Race condition on duplicate period creation

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-period-actions.ts` (lines 91-112)

The check-then-insert pattern has a TOCTOU race. Two simultaneous requests could both pass the duplicate check and attempt to insert. The DB UNIQUE constraint `(branch_id, month, year)` will catch this, but the raw Postgres error won't be user-friendly.

**Suggested fix:** Catch the unique violation error:
```typescript
const { data, error } = await sb.from('payroll_periods').insert({ ... }).select().single()
if (error) {
  if (error.code === '23505') {
    return { success: false, error: `Ky luong thang ${month}/${year} da ton tai.` }
  }
  throw error
}
```

---

## Low Priority [P3]

### P3-1: Excessive `as any` casts on Supabase client

**Files:** All service and action files (12 occurrences)

Every Supabase client is cast to `any` with eslint-disable comments. This eliminates all type safety for query results.

**Suggested fix:** Use typed Supabase client:
```typescript
import type { Database } from '@/lib/types/database'
const supabase = await createClient<Database>()
// Or if createClient doesn't support generics, type the result:
const { data } = await supabase.from('payslips').select('...')
// And type the data inline where needed
```

### P3-2: `PayrollPeriodForm` branchId doesn't sync when parent changes

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\payroll-period-form.tsx` (line 41)

```typescript
const [branchId, setBranchId] = useState(defaultBranchId ?? '')
```

`useState` initial value is only used on mount. If the parent page's `branchId` changes after mount, the dialog still shows the old branch.

**Suggested fix:** Use `useEffect` to sync:
```typescript
useEffect(() => { setBranchId(defaultBranchId ?? '') }, [defaultBranchId])
```

### P3-3: `getMonthBounds` uses JS `Date` which is timezone-sensitive

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\payroll-calculate-actions.ts` (line 24)

```typescript
const lastDay = new Date(year, month, 0).getDate()
```

This uses the server's local timezone to determine the last day of month. On a server running UTC vs ICT (UTC+7), this could theoretically differ around midnight transitions. In practice, this is safe because `getDate()` only returns the day number (1-28/29/30/31) which is the same regardless of timezone for this usage.

No fix needed, but worth a comment:
```typescript
// Note: new Date(year, month, 0) works correctly for day count regardless of timezone
```

### P3-4: Confirm dialog missing keyboard accessibility

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\payroll\confirm-payroll-dialog.tsx`

The double-confirm dialog doesn't have auto-focus on the cancel button (safety-first UX). Currently, pressing Enter might trigger the confirm action.

### P3-5: Employee self-service shows draft payslips if RLS misconfigured

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (line 150)

The `getMyPayslips` function filters `status !== 'draft'` in JavaScript, not in the query. If RLS returns all payslips, drafts are filtered client-side. This is defence-in-depth since the filter works, but a `.neq('status', 'draft')` in the Supabase query would be more efficient and secure.

---

## Edge Cases Found by Scout

1. **Employee with position='admin'** crashes entire payroll batch (P0-1)
2. **Recurring deductions** silently lost — NET figures are correct at calculation time but cannot be audited (P0-2)
3. **Zero-session employees** (newly hired, on leave) produce payslips with 0 teaching_pay but may have allowances — this is handled correctly
4. **Employees removed between runs** — existing payslips preserved via manual map, no orphan payslips created — correct
5. **Concurrent auto-calculate** — no locking mechanism; two users running simultaneously could create duplicate payslips (mitigated by DB UNIQUE constraint)
6. **KPI base_pass=false** handled correctly: `getKpiBonus` returns 0 — verified
7. **Substitute notes with `amount_unit='vnd'`** are excluded from `getSubstituteSessions` (filtered by `amount_unit='sessions'`) — correct
8. **Empty `employee_weekly_notes`** returns 0 from `reduce` — correct
9. **Penalty notes with `amount_unit='sessions'`** treated as VND amount — documented in `getPenaltyAmount` but may be surprising

---

## Positive Observations

1. **Clean separation of concerns**: Pure `calculatePayslip()` function has no side effects, easily testable
2. **Rate snapshotting**: `rate_per_session` and `sub_rate` are correctly copied from employee records to payslips at calculation time, preserving historical accuracy
3. **Manual field preservation**: Existing `other_pay`, `penalties`, and `extra_notes` are preserved during recalculation via `manualMap`
4. **Immutability enforcement**: Both `confirmPayrollPeriod` and `updatePayslipManualFields` correctly check `status === 'draft'` before allowing modifications
5. **24-hour undo**: `undoPayrollPeriod` correctly checks `confirmed_at` timestamp with 24-hour window
6. **Employee portal defence-in-depth**: `getMyPayslipDetail` checks `employee_id === user.id` even though RLS enforces ownership
7. **Tax calculation**: Vietnamese TNCN 7-bracket progressive tax is correctly implemented with proper Math.round()
8. **Insurance conditional**: BHXH/BHYT/BHTN correctly gated on `has_labor_contract`

---

## Recommended Actions (Prioritized)

1. **[MUST FIX]** Map employee `position='admin'` to `'office'` when writing payslip position (P0-1)
2. **[MUST FIX]** Add `deductions` column to payslips table + persist recurring deductions value (P0-2)
3. **[SHOULD FIX]** Check upsert/insert errors in autoCalculatePayslips (P1-3)
4. **[SHOULD FIX]** Recalculate NET after manual field edits, or warn user (P1-4)
5. **[SHOULD FIX]** Parallelize per-employee queries with Promise.all (P1-2)
6. **[IMPROVE]** Implement previous period comparison for >20% alert feature (P2-1)
7. **[IMPROVE]** Fix employee portal month display to use period month, not created_at (P2-5)
8. **[IMPROVE]** Use computed totals in confirm dialog instead of stale period data (P2-4)
9. **[IMPROVE]** Define `PayslipPosition` type separate from `EmployeePosition` (P2-3)
10. **[IMPROVE]** Add negative net pay warning (P2-6)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~85% (extensive `as any` casts on Supabase client) |
| Test Coverage | 0% (no unit tests for calculation engine) |
| Linting Issues | 12 eslint-disable comments for `@typescript-eslint/no-explicit-any` |
| Build Status | Passes (`tsc --noEmit` clean) |
| Security | Role checks present on all actions; RLS policies enforced at DB level |

---

## Unresolved Questions

1. Should accountants be scoped to specific branches, or is all-branch access by design?
2. Should the system prevent payslip generation when attendance week is not yet locked?
3. What happens when an employee transfers branches mid-month — which branch gets their payslip?
4. Should `penalty` notes with `amount_unit='sessions'` be converted to VND (sessions x rate) rather than treated as raw VND amount?
