# Code Review: Phase 4 (Spreadsheet UI) + Phase 5 (Tests & Cleanup)

**Reviewer**: code-reviewer
**Date**: 2026-03-09
**Scope**: 12 files (4 Phase-4 UI, 2 Phase-5 tests, 6 backend context)
**LOC reviewed**: ~1,150 (new/modified)
**Tests**: 130 passing (6 suites), 0 failures

---

## Scope

### Phase 4 — Spreadsheet UI
- `components/payroll/payroll-spreadsheet-row.tsx` (NEW, 166 LOC)
- `components/payroll/payroll-spreadsheet.tsx` (NEW, 210 LOC)
- `components/payroll/reinitialize-confirm-dialog.tsx` (NEW, 82 LOC)
- `app/(dashboard)/payroll/[period]/page.tsx` (MODIFIED, 255 LOC)

### Phase 5 — Tests & Cleanup
- `tests/payroll-audit-service.test.ts` (NEW, 142 LOC)
- `tests/payroll-prefill-service.test.ts` (NEW, 195 LOC)

### Backend Context (prior phase, verified)
- `lib/actions/payroll-calculate-actions.ts` (344 LOC)
- `lib/actions/payroll-payslip-actions.ts` (310 LOC)
- `lib/actions/payroll-period-actions.ts` (214 LOC)
- `lib/services/payroll-audit-service.ts` (67 LOC)
- `lib/services/payroll-prefill-service.ts` (86 LOC)
- `lib/utils/excel-payroll-export.ts` (134 LOC)

---

## Overall Assessment

Solid implementation of a semi-manual payroll spreadsheet with proper separation of concerns. The invariants listed in the brief (batch save sets `is_reviewed`, confirm rejects unreviewed, period totals sync, reinitialize resets) are all correctly enforced. Backend security (role checks, branch guards, period status enforcement) is thorough. Tests are well-structured with edge cases covered.

Several medium-severity issues found, primarily around UI state management (dirty state across tabs), a subtle audit comparison bug with `null` vs `0`, and one security-adjacent input sanitization gap. No critical blockers.

---

## Issues

### ISSUE-1: Dirty state shared across tabs causes data loss on tab switch
- Category: bug
- Severity: high
- File: `app/(dashboard)/payroll/[period]/page.tsx:218-225`
- Problem: Each tab renders its own `PayrollSpreadsheet` with `onDirtyChange={setIsDirty}`, but all three tabs share the same `isDirty` state. When a user edits rows in the "assistant" tab then switches to "teacher" tab, the teacher's `PayrollSpreadsheet` mounts with empty edits, calls `onDirtyChange(false)`, clearing the parent's `isDirty` flag. The user can now click Confirm/Export/Re-init despite having unsaved edits in the assistant tab. Additionally, the assistant tab's local `edits` Map is lost when switching tabs because `TabsContent` unmounts inactive content by default.
- Evidence:
```tsx
// page.tsx:224 — all tabs write to the same setter
<PayrollSpreadsheet
  onDirtyChange={setIsDirty}  // last-mounted tab wins
/>
```
```tsx
// payroll-spreadsheet.tsx:45-47
useEffect(() => {
  onDirtyChange?.(isDirty)  // fires false on mount for newly-mounted tab
}, [isDirty, onDirtyChange])
```
- Suggested fix: Track dirty state per-tab using a `Map<TabType, boolean>` at the page level. Derive the global `isDirty` as `anyTabDirty = [...dirtyMap.values()].some(Boolean)`. Alternatively, use `forceMount` on `TabsContent` to keep all three spreadsheets mounted (preserving their edit state) and show/hide via CSS. The `forceMount` approach is simpler and preserves the user's in-progress edits across tab switches.

### ISSUE-2: Audit diff treats `null` and empty string as equal
- Category: bug
- Severity: medium
- File: `lib/services/payroll-audit-service.ts:35`
- Problem: The comparison `String(oldVal ?? '') === String(newVal ?? '')` treats `null` and `''` (empty string) as identical. If `extra_notes` is `null` in the DB and the user explicitly sets it to `''`, no audit entry is created. Similarly, `0` vs `null` compares as `"0" === ""` which catches the difference, but the asymmetry is fragile.
- Evidence:
```ts
// line 35
if (String(oldVal ?? '') === String(newVal ?? '')) continue
```
When `oldVal = null` and `newVal = ''`: `String(null ?? '') === String('' ?? '')` => `'' === ''` => skipped.
- Suggested fix: For numeric fields, compare directly with `===`. For string fields (`extra_notes`), normalize both to `null` if empty before comparing. A cleaner approach:
```ts
const normalizeVal = (v: unknown) => (v === '' ? null : v)
if (normalizeVal(oldVal) === normalizeVal(newVal)) continue
```

### ISSUE-3: `batchUpdatePayslips` N+1 sequential updates instead of parallel or bulk
- Category: performance
- Severity: medium
- File: `lib/actions/payroll-payslip-actions.ts:179-201`
- Problem: The batch update iterates items sequentially with `for...of`, each making a separate `.update()` call. For a branch with 21 employees, this means 21 sequential network roundtrips to Supabase. Audit log inserts are fire-and-forget (good), but the main updates are not parallelized.
- Evidence:
```ts
// line 179-201
for (const item of items) {
  const current = currentMap.get(item.payslip_id)
  if (!current) continue
  // ... one network call per item
  const { error: updateErr } = await sb
    .from('payslips')
    .update({ ...item.fields, is_reviewed: true })
    .eq('id', item.payslip_id)
```
- Suggested fix: Use `Promise.all()` to parallelize, same pattern used in `initializePayslips`. Supabase handles concurrent writes fine since each targets a different row:
```ts
await Promise.all(items.map(async (item) => {
  // ...existing logic per item
}))
```

### ISSUE-4: No input size limit on `batchUpdatePayslips` items array
- Category: security
- Severity: medium
- File: `lib/actions/payroll-payslip-actions.ts:122-126`
- Problem: The action accepts an unbounded `items` array. A malicious client could send thousands of items causing a long-running server action, DB lock contention, or OOM. The empty-check on line 126 guards against 0 items but not excessive counts.
- Evidence:
```ts
export async function batchUpdatePayslips(
  periodId: string,
  items: PayslipBatchItem[]  // no size limit
): Promise<ActionResult<{ updatedCount: number }>> {
  if (items.length === 0) return { success: true, data: { updatedCount: 0 } }
```
- Suggested fix: Add a reasonable upper bound (a branch has max ~50 employees):
```ts
if (items.length > 200) {
  return { success: false, error: 'Quá nhiều phiếu lương trong một lần cập nhật.' }
}
```

### ISSUE-5: No numeric field validation in `batchUpdatePayslips`
- Category: edge-case
- Severity: medium
- File: `lib/actions/payroll-payslip-actions.ts:179-201`
- Problem: The `fields` object from the client is spread directly into the `.update()` call without validating that numeric fields are actually numbers (not `NaN`, `Infinity`, or negative values where negative is not allowed). While the UI does `isNaN(parsed) ? 0 : parsed`, a malicious client bypassing the UI could send arbitrary values.
- Evidence:
```ts
// line 192-194
const { error: updateErr } = await sb
  .from('payslips')
  .update({ ...item.fields, is_reviewed: true, updated_at: new Date().toISOString() })
  .eq('id', item.payslip_id)
```
- Suggested fix: Validate each numeric field before update:
```ts
const numericFields = ['kpi_bonus','allowances','deductions','penalties','other_pay','bhxh','bhyt','bhtn','tncn','gross_pay','net_pay']
for (const f of numericFields) {
  const v = item.fields[f]
  if (v !== undefined && (typeof v !== 'number' || !isFinite(v))) {
    return { success: false, error: `Giá trị ${f} không hợp lệ.` }
  }
}
```

### ISSUE-6: `PayslipBatchItem.fields` typed as `EditablePayslipFields` (all optional) — allows extra keys
- Category: security
- Severity: low
- File: `lib/actions/payroll-payslip-actions.ts:28-29`
- Problem: The `EditablePayslipFields` interface has all fields optional. The `fields` object is spread directly into the Supabase `.update()` call. If a client sends non-editable fields (e.g., `sessions_worked`, `employee_id`, `payroll_period_id`), TypeScript compile-time checks would catch this, but the runtime JSON from the client is not validated against the interface. The spread `...item.fields` could overwrite protected columns.
- Evidence:
```ts
export interface PayslipBatchItem {
  payslip_id: string
  fields: EditablePayslipFields  // TS-only contract, no runtime validation
}
// ...
.update({ ...item.fields, is_reviewed: true, updated_at: new Date().toISOString() })
```
- Suggested fix: Whitelist fields before spreading:
```ts
const EDITABLE_KEYS = ['kpi_bonus','allowances','deductions','penalties','other_pay','bhxh','bhyt','bhtn','tncn','gross_pay','net_pay','extra_notes'] as const
const safeFields: Record<string, unknown> = {}
for (const k of EDITABLE_KEYS) {
  if (k in item.fields) safeFields[k] = (item.fields as Record<string, unknown>)[k]
}
```

### ISSUE-7: `PayrollSpreadsheetRow` memo comparison may be too shallow for `edits` object
- Category: performance
- Severity: low
- File: `components/payroll/payroll-spreadsheet-row.tsx:165`
- Problem: `memo(PayrollSpreadsheetRowInner)` uses default shallow comparison. The `edits` prop is `edits.get(payslip.id) ?? {}`, which creates a **new empty object `{}`** on every render for rows with no edits. This defeats memoization for all un-edited rows, causing them to re-render on every keystroke in any other row.
- Evidence:
```tsx
// payroll-spreadsheet.tsx:168
edits={edits.get(payslip.id) ?? {}}
// Each render: new {} !== previous {} → memo fails
```
- Suggested fix: Hoist the empty-edits constant outside the component:
```tsx
const EMPTY_EDITS: Partial<EditablePayslipFields> = {}
// ...
edits={edits.get(payslip.id) ?? EMPTY_EDITS}
```

### ISSUE-8: Footer `colSpan` logic breaks when columns are filtered by tab
- Category: bug
- Severity: medium
- File: `components/payroll/payroll-spreadsheet.tsx:178-189`
- Problem: The footer uses index-based logic (`i === 0` for "Tong cong" label with `colSpan={2}`, `i === 1` returns null). This assumes columns 0 and 1 are always the code and name columns. Since `visibleColumns` filters by `showFor`, if any column before index 2 is hidden (currently none are, but adding `showFor` to early columns would break this), the footer will display incorrectly. More concretely: the `colSpan={2}` eats column index 1, but the total number of `<td>` elements becomes `visibleColumns.length - 1` (one less than headers), potentially misaligning the GROSS/NET totals.
- Evidence:
```tsx
{visibleColumns.map((col, i) => {
  if (i === 0) return <td key={col.key} colSpan={2}>Tổng cộng</td>
  if (i === 1) return null  // absorbed by colSpan
  // ...remaining cells
})}
```
- Suggested fix: Use key-based matching instead of index-based:
```tsx
{visibleColumns.map((col) => {
  if (col.key === 'employee_code') return <td key={col.key} colSpan={2}>Tổng cộng</td>
  if (col.key === 'employee_name') return null
  // ...
})}
```

### ISSUE-9: `totalGross` / `totalNet` in spreadsheet footer may diverge from `period.total_gross`
- Category: edge-case
- Severity: low
- File: `components/payroll/payroll-spreadsheet.tsx:93-94` and `app/(dashboard)/payroll/[period]/page.tsx:104`
- Problem: The page header shows `period.total_gross` and `period.total_net` from the DB, while the spreadsheet footer independently sums client-side `payslips.reduce(...)`. After a save, `syncPeriodTotals` updates the DB, but until `fetchData()` completes, the header and footer show different values. Additionally, the spreadsheet footer sums from the original `payslips` prop, not accounting for unsaved edits in the `edits` Map, so dirty gross/net values are not reflected in the footer sum.
- Evidence:
```tsx
// payroll-spreadsheet.tsx:93 — sums from unedited payslips array
const totalGross = payslips.reduce((s, p) => s + (p.gross_pay ?? 0), 0)
// page.tsx:104 — from period DB record
GROSS {formatVND(period?.total_gross ?? 0)}
```
- Suggested fix: For the footer totals, merge the edits into the sum:
```ts
const totalGross = payslips.reduce((s, p) => {
  const edit = edits.get(p.id)
  return s + (edit?.gross_pay ?? p.gross_pay ?? 0)
}, 0)
```

### ISSUE-10: `onDirtyChange` in `useEffect` dependency array can cause infinite loop
- Category: bug
- Severity: medium
- File: `components/payroll/payroll-spreadsheet.tsx:45-47`
- Problem: The `useEffect` depends on `[isDirty, onDirtyChange]`. The parent passes `setIsDirty` (a stable setState reference) so this is safe today. However, if the parent ever passes an inline function (e.g., `onDirtyChange={(d) => setIsDirty(d)}`), the effect would fire every render, calling `onDirtyChange` which triggers a parent re-render, which passes a new function, creating an infinite loop. This is a latent stability hazard.
- Evidence:
```tsx
useEffect(() => {
  onDirtyChange?.(isDirty)
}, [isDirty, onDirtyChange])
```
- Suggested fix: Either use `useRef` for the callback:
```tsx
const onDirtyChangeRef = useRef(onDirtyChange)
onDirtyChangeRef.current = onDirtyChange
useEffect(() => {
  onDirtyChangeRef.current?.(isDirty)
}, [isDirty])
```
Or document that `onDirtyChange` must be a stable reference (which it currently is).

### ISSUE-11: Excel export missing `other_pay` column
- Category: bug
- Severity: medium
- File: `lib/utils/excel-payroll-export.ts:12-18` and `30-49`
- Problem: The HEADERS array includes `'Dạy thay'` and `'KPI'` but does not include a header for `other_pay` ("Khác (+)"). The data rows include `substitute_pay` and `kpi_bonus` at positions matching "Day thay" and "KPI", but `other_pay` is completely missing from the export. This means the exported Excel does not contain the "Khac (+)" manual adjustment amounts, which is critical for accountant reconciliation.
- Evidence:
```ts
const HEADERS = [
  'STT', 'Ma NV', 'Ho ten',
  'So buoi', 'Don gia', 'Luong buoi',
  'Day thay', 'KPI', 'Phu cap',
  'GROSS', 'BHXH', 'BHYT', 'BHTN', 'TNCN',
  'Phat', 'Khau tru', 'NET',
]
// No 'Khac (+)' column
// In row data: other_pay is not included
rows.push([
  idx + 1, p.employee_code, p.employee_name,
  p.sessions_worked, p.rate_per_session, p.teaching_pay,
  p.substitute_pay, p.kpi_bonus, p.allowances,
  p.gross_pay, p.bhxh, p.bhyt, p.bhtn, p.tncn,
  p.penalties, p.deductions, p.net_pay,
])
```
- Suggested fix: Add "Khac (+)" header after "Phu cap" and include `p.other_pay` in the data row at the corresponding position. Also add `substitute_sessions` as a separate column (currently only `substitute_pay` is exported, making it impossible to verify the calculation).

### ISSUE-12: `notes` dialog state not synced with edits Map on open
- Category: edge-case
- Severity: low
- File: `components/payroll/payroll-spreadsheet-row.tsx:63,98`
- Problem: When the notes button is clicked, `notesValue` is initialized from `currentValue(col)` which reads from edits-then-payslip. But `notesValue` is a local useState that persists across dialog open/close within the same mount cycle. If the user: (1) opens notes, types something, clicks "Luu ghi chu", (2) the parent saves via batch, (3) the parent's `fetchData()` re-renders with new payslip data, (4) the user opens notes again — the `notesValue` will still be the old value from step 1 because the component was not unmounted. The `onClick` does set `setNotesValue(noteVal)` which reads the current value, so this is actually handled. However, the initial `useState('')` means on first mount, the notes dialog opens with empty text even if the payslip already has `extra_notes`.
- Evidence:
```tsx
const [notesValue, setNotesValue] = useState('')  // initial empty
// ...
onClick={() => { setNotesValue(noteVal); setNotesOpen(true) }}  // re-sync on open — OK
```
- Suggested fix: This is currently handled by the `onClick` handler re-syncing `notesValue`. Marking as low priority — the only edge case is if the dialog is programmatically opened without going through the button click.

### ISSUE-13: `markPayslipsReviewed` no loading state in UI
- Category: edge-case
- Severity: low
- File: `components/payroll/payroll-spreadsheet.tsx:81-86`
- Problem: The "Duyet tat ca" button calls `handleMarkAllReviewed` which awaits a server action, but there is no loading state. The user can click the button multiple times before the first call completes, causing duplicate server calls.
- Evidence:
```tsx
const handleMarkAllReviewed = useCallback(async () => {
  const unreviewed = payslips.filter((p) => !p.is_reviewed).map((p) => p.id)
  if (unreviewed.length === 0) return
  const result = await markPayslipsReviewed(periodId, unreviewed)
  if (result.success) onSaved()
}, [payslips, periodId, onSaved])
```
- Suggested fix: Add a `markingReviewed` loading state, disable button while loading.

### ISSUE-14: `beforeunload` guard does not prevent React Router navigation
- Category: edge-case
- Severity: low
- File: `app/(dashboard)/payroll/[period]/page.tsx:63-69`
- Problem: The `beforeunload` event only fires on browser-level navigation (tab close, refresh, address bar). Client-side navigation via Next.js `<Link>` or `router.push()` bypasses `beforeunload` entirely. The user could click the back button in the header (line 95-97 `router.push('/payroll')`) and lose all unsaved edits without warning.
- Evidence:
```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) { e.preventDefault(); e.returnValue = '' }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```
- Suggested fix: Intercept the back button click to warn about unsaved changes:
```tsx
<button onClick={() => {
  if (isDirty && !confirm('Ban co thay doi chua luu. Roi di?')) return
  router.push('/payroll')
}} ...>
```

### ISSUE-15: Test mock for prefill service does not differentiate between queries on same table
- Category: maintainability
- Severity: low
- File: `tests/payroll-prefill-service.test.ts:99-156`
- Problem: The mock Supabase client returns the same data for all calls to the same table name. The `salary_components` table is queried twice (once for allowances, once for deductions) but the mock returns the same `allowanceData` or `deductionData` for both calls. Test assertions acknowledge this (`// both weekly note queries return same mock data`) but this means the tests cannot verify that the correct `component_type` filter is being applied.
- Evidence:
```ts
// line 117-121 — same data returned regardless of .eq('component_type', 'allowance') vs 'deduction'
Object.defineProperty(chain, 'then', {
  get: () => (res) => res({ data: table === 'salary_components' ? allowanceData : [] }),
})
```
- Suggested fix: Track `.eq()` calls and return different data based on the filter value. This would let tests verify that allowances and deductions are correctly separated.

---

## Positive Observations

1. **Security layers are thorough**: Every server action checks auth, role, and branch ownership. The payslip period-id cross-check in `batchUpdatePayslips` (line 173) prevents IDOR attacks where a payslip ID from another period is injected.

2. **Invariant enforcement**: The `is_reviewed` gate in `confirmPayrollPeriod` (lines 140-156) correctly prevents premature confirmation. The explicit variable `unreviewedCount` avoids the `(count ?? 0 > 0)` precedence bug that was flagged in prior reviews.

3. **Audit logging is fire-and-forget safe**: `insertAuditLogs` uses try-catch with console.error, never throws, and is called with `void` keyword. Audit failure does not block payroll operations.

4. **Good component composition**: The spreadsheet is cleanly split into Row (memo'd), Spreadsheet (state management), and Page (orchestration). The `SPREADSHEET_COLUMNS` config-driven approach makes adding/removing columns trivial.

5. **Test quality**: The audit service tests cover no-change, single-change, multi-change, null handling, undefined-to-defined transitions, and all 12 auditable fields. The prefill tests verify the return shape contract and aggregation behavior.

6. **Shared Supabase client pattern**: Both `initializePayslips` and `reinitializePayslips` pass `sb` to sub-functions rather than creating new clients, preventing the N+1 client creation bug fixed in prior production review.

7. **`syncPeriodTotals` is correctly extracted**: Both batch update and initialize flows call the same `syncPeriodTotals`, preventing total_gross/total_net drift.

---

## Metrics

| Metric | Value |
|--------|-------|
| Type coverage | Full TS strict (no `any` leaks to UI; backend `any` casts are annotated/suppressed) |
| Test coverage | `buildAuditLogEntries`: high (12 tests). `fetchPrefillData`: moderate (8 tests). UI: 0 (no component tests). |
| Lint issues | 0 (eslint-disable comments are scoped to Supabase `any` casts) |
| Build | Clean (0 errors, 130 tests passing) |

---

## Recommended Actions (Priority Order)

1. **[HIGH] Fix dirty-state-across-tabs bug** (ISSUE-1) — Use `forceMount` on TabsContent or per-tab dirty tracking. This is a data-loss risk.
2. **[MEDIUM] Whitelist editable fields in batchUpdatePayslips** (ISSUE-6) — Runtime field whitelist prevents column injection via crafted client payloads.
3. **[MEDIUM] Add input size limit to batchUpdatePayslips** (ISSUE-4) — Simple guard, 5 lines.
4. **[MEDIUM] Add missing `other_pay` to Excel export** (ISSUE-11) — Accountant reconciliation gap.
5. **[MEDIUM] Fix footer colSpan to use key-based matching** (ISSUE-8) — Fragile but currently correct; fix before adding columns.
6. **[MEDIUM] Parallelize batch updates** (ISSUE-3) — Performance improvement for larger branches.
7. **[LOW] Fix memo defeat for empty edits** (ISSUE-7) — Hoist `EMPTY_EDITS` constant.
8. **[LOW] Add navigation guard for client-side routing** (ISSUE-14) — `beforeunload` is not enough.
9. **[LOW] Improve prefill test mocks** (ISSUE-15) — Track filter params for accurate assertions.

---

### VERDICT
- Status: REVISE
- Reason: ISSUE-1 (dirty state across tabs) is a high-severity data-loss bug where switching tabs silently clears the dirty flag, allowing Confirm/Export/Re-init to proceed with unsaved edits. ISSUE-6 (field whitelist) is a security hardening gap that should be addressed before production. ISSUE-11 (missing `other_pay` in Excel) is a functional gap for accountant workflows. Recommend fixing ISSUE-1, ISSUE-4, ISSUE-6, and ISSUE-11 before merging.
