# Code Review: Phase 7 -- Polish + Localization

**Date:** 2026-03-07
**Reviewer:** code-reviewer agent
**Scope:** Audit log system, keyboard navigation, Excel import/export, Vietnamese i18n
**Severity Scale:** P0 (critical) > P1 (high) > P2 (medium) > P3 (low)
**Verdict:** 3 P0, 4 P1, 5 P2, 4 P3

---

## Files Reviewed (14)

| # | File | LOC | Purpose |
|---|------|-----|---------|
| 1 | `supabase/migrations/005_audit_logs.sql` | 25 | Audit log table + RLS |
| 2 | `lib/services/audit-log-service.ts` | 45 | Fire-and-forget audit logging |
| 3 | `lib/hooks/use-attendance-keyboard.ts` | 93 | Arrow key navigation + Ctrl+S |
| 4 | `lib/utils/excel-schedule-parser.ts` | 113 | Parse .xlsx to ParsedSchedule[] |
| 5 | `lib/utils/excel-payroll-export.ts` | 133 | Generate 3-sheet payroll .xlsx |
| 6 | `components/class-schedules/excel-import-dialog.tsx` | 190 | Import UI: file pick, preview, commit |
| 7 | `components/payroll/excel-export-button.tsx` | 60 | Export button + blob download |
| 8 | `components/attendance/attendance-grid.tsx` | 185 | Modified grid with keyboard hook |
| 9 | `components/attendance/attendance-grid-helpers.ts` | 63 | Extracted diff/save/unpersisted builders |
| 10 | `lib/constants/messages.ts` | 133 | Vietnamese UI messages |
| 11 | `lib/actions/payroll-period-actions.ts` | 196 | logAudit on confirm/undo |
| 12 | `lib/actions/kpi-save-actions.ts` | 85 | logAudit on KPI save |
| 13 | `lib/actions/employee-mutation-actions.ts` | 143 | logAudit on create/update |
| 14 | `lib/actions/class-schedule-import-actions.ts` | 93 | Batch import server action |

**Total LOC reviewed:** ~1,363

---

## P0 -- Critical (Must fix before production)

### P0-1: Audit log silently fails for ALL users -- wrong Supabase client

**File:** `lib/services/audit-log-service.ts` lines 9, 27-31
**File:** `supabase/migrations/005_audit_logs.sql` lines 19-24

**Problem:** The `logAudit()` function imports `createClient` from `@/lib/supabase/server`, which creates a **user-session anon-key client**. The `audit_logs` table has RLS enabled with **only a SELECT policy** (admin-only). There is **no INSERT policy**. This means every single `logAudit()` call silently fails because the anon-key client cannot bypass RLS, and RLS denies all inserts by default.

The docstring even states "Uses the service-role client to bypass RLS" but the import contradicts this -- it uses the session client, not the admin client.

**Impact:** Zero audit logs are ever persisted. The entire audit trail feature is non-functional. The fire-and-forget pattern hides this because the catch block swallows the error.

**Fix:**
```typescript
// lib/services/audit-log-service.ts
import { createAdminClient } from '@/lib/supabase/admin'  // service-role client

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const user = await getCurrentUser()
    const sb = createAdminClient()   // bypasses RLS

    await sb.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    })
  } catch {
    console.error('[audit] Failed to log audit event:', params.tableName, params.action)
  }
}
```

**Alternative:** Add an INSERT policy to the RLS migration. However, the service-role approach is cleaner because it prevents users from inserting arbitrary audit records via their own tokens.

---

### P0-2: No file size limit on Excel upload -- DoS vector

**File:** `components/class-schedules/excel-import-dialog.tsx` lines 78-83
**File:** `lib/utils/excel-schedule-parser.ts` line 48

**Problem:** The file input accepts any `.xlsx/.xls` file with no size limit. The entire file is read into memory via `file.arrayBuffer()` and passed to `XLSX.read()`. A malicious or accidentally large file (e.g., 200MB spreadsheet) will:
1. Crash the browser tab (OOM on `arrayBuffer()`)
2. If it reaches the server action, the parsed rows array could have millions of entries
3. Each row triggers a separate database INSERT (N+1 pattern in import action)

**Impact:** Browser crash. If large file reaches server, potential DB connection exhaustion from sequential inserts.

**Fix -- client side (excel-import-dialog.tsx):**
```typescript
const MAX_FILE_SIZE_MB = 2
const MAX_ROWS = 500

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  reset()

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    setImportErrors([{ class_code: '', message: `File vượt quá ${MAX_FILE_SIZE_MB}MB.` }])
    return
  }

  const buf = await file.arrayBuffer()
  const result = parseScheduleExcel(buf)

  if (result.valid.length > MAX_ROWS) {
    setImportErrors([{ class_code: '', message: `Tối đa ${MAX_ROWS} lớp mỗi lần nhập.` }])
    return
  }

  setParseResult(result)
}
```

**Fix -- server side (class-schedule-import-actions.ts):**
```typescript
if (schedules.length > 500) {
  return { success: false, imported_count: 0, errors: [{ class_code: '', message: 'Tối đa 500 lớp mỗi lần nhập.' }] }
}
```

---

### P0-3: Batch import performs N+1 sequential inserts -- partial failure leaves inconsistent state

**File:** `lib/actions/class-schedule-import-actions.ts` lines 56-85

**Problem:** The import loop inserts each schedule row individually with `await sb.from('class_schedules').insert(...)`. Two issues:
1. **N+1 performance**: 100 rows = 100 separate HTTP requests to Supabase. Each takes ~50-100ms, so 100 rows = 5-10 seconds.
2. **No transaction/atomicity**: If row 50 fails due to a duplicate `class_code`, rows 1-49 are already committed. The user sees "49 imported, 1 error" but has no way to undo the partial import. This is confusing for users who expect an all-or-nothing operation.

**Impact:** Slow imports; partial failures produce inconsistent state that is hard to undo.

**Fix -- batch insert with error handling:**
```typescript
// Validate all rows first, then insert all valid ones in a single batch
const validInserts = []
for (const row of schedules) {
  const teacher = empMap.get(row.teacher_code)
  if (!teacher || teacher.position !== 'teacher') { errors.push(...); continue }
  const assistant = empMap.get(row.assistant_code)
  if (!assistant || assistant.position !== 'assistant') { errors.push(...); continue }
  validInserts.push({
    branch_id: effectiveBranch,
    class_code: row.class_code,
    class_name: row.class_name,
    shift_time: row.shift_time,
    days_of_week: row.days_of_week,
    teacher_id: teacher.id,
    assistant_id: assistant.id,
    status: 'active',
  })
}

if (validInserts.length > 0) {
  const { error: batchErr } = await sb
    .from('class_schedules')
    .insert(validInserts)
  if (batchErr) {
    // Handle duplicates from batch; may need upsert or ON CONFLICT
    errors.push({ class_code: '', message: batchErr.message })
  } else {
    imported_count = validInserts.length
  }
}
```

**Note:** Batch insert with Supabase will fail atomically if any row violates a constraint -- which is actually *better* because the user gets all-or-nothing semantics.

---

## P1 -- High (Should fix)

### P1-1: Excel parser crashes on empty/malformed .xlsx -- no defensive guard

**File:** `lib/utils/excel-schedule-parser.ts` lines 49-51

**Problem:** If the uploaded .xlsx file has zero sheets (corrupted file), `workbook.SheetNames[0]` returns `undefined`, and `workbook.Sheets[undefined]` returns `undefined`. Then `XLSX.utils.sheet_to_json(undefined, ...)` throws an unhandled exception that bubbles up to the UI as a generic error.

Similarly, a non-Excel file that happens to have `.xlsx` extension (e.g., renamed HTML file) will throw at `XLSX.read()`.

**Fix:**
```typescript
export function parseScheduleExcel(file: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(file, { type: 'array' })

    if (!workbook.SheetNames.length) {
      return { valid: [], errors: [{ row: 0, message: 'File Excel trống hoặc không hợp lệ.' }] }
    }

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return { valid: [], errors: [{ row: 0, message: 'Không tìm thấy sheet dữ liệu.' }] }
    }

    // ... rest of parsing
  } catch (err) {
    return { valid: [], errors: [{ row: 0, message: 'File không phải định dạng Excel hợp lệ.' }] }
  }
}
```

---

### P1-2: logAudit() called fire-and-forget, but redundantly calls getCurrentUser() -- doubles auth overhead

**File:** `lib/services/audit-log-service.ts` lines 26-27

**Problem:** Every call to `logAudit()` independently calls `getCurrentUser()` (which calls `supabase.auth.getUser()` and then queries the `employees` table). The calling action already has the current user available. This means every mutation incurs 2x auth overhead (one for the action, one for the audit log).

Additionally, in the fire-and-forget pattern (not awaited), the `getCurrentUser()` call inside `logAudit()` creates a new Supabase session client from cookies -- but in Next.js server actions, the cookie store may already be closed by the time the unawaited promise resolves, potentially causing subtle failures.

**Fix -- pass user info from the caller:**
```typescript
export interface AuditLogParams {
  tableName: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  userId?: string       // pass from caller
  userEmail?: string    // pass from caller
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const sb = createAdminClient()
    await sb.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
    })
  } catch {
    console.error('[audit] Failed to log audit event:', params.tableName, params.action)
  }
}
```

Then callers pass: `logAudit({ ..., userId: user.id, userEmail: user.email })`

---

### P1-3: updateEmployee accepts `Record<string, unknown>` -- arbitrary column injection

**File:** `lib/actions/employee-mutation-actions.ts` lines 94-96, 124-125

**Problem:** The `updateEmployee` function accepts `data: Record<string, unknown>` and passes it directly to `sb.from('employees').update(data)`. A malicious client-side call could pass:
- `{ branch_id: 'other-branch-uuid' }` -- BM moves employee to another branch (current check only validates the employee's *current* branch)
- `{ id: 'new-uuid' }` -- attempt to change primary key
- `{ role: 'admin' }` -- BM role check only triggers if `data.role !== undefined`, but this is easily bypassed if a BM can trigger the action with `role: 'admin'`... wait, the check IS there (lines 105-108). But if BM passes `role: 'branch_manager'`, this is NOT in `BM_ALLOWED_ROLES = ['employee']`, so it is blocked. Good.
- `{ is_active: true }` -- reactivate a deactivated employee without proper workflow

The `logAudit` call at line 137 also logs the raw `data` object, which could include sensitive fields if the client sends unexpected data.

**Fix -- allowlist fields:**
```typescript
const ALLOWED_UPDATE_FIELDS = new Set([
  'full_name', 'phone', 'position', 'role', 'branch_id',
  'rate_per_session', 'sub_rate', 'has_labor_contract',
  'dependent_count', 'is_active',
])

// Filter data to only allowed fields
const safeData: Record<string, unknown> = {}
for (const [key, val] of Object.entries(data)) {
  if (ALLOWED_UPDATE_FIELDS.has(key)) safeData[key] = val
}
```

---

### P1-4: Audit log missing on batch import -- no audit trail for Excel imports

**File:** `lib/actions/class-schedule-import-actions.ts` (entire file)

**Problem:** The batch import action inserts multiple class schedules but never calls `logAudit()`. This is inconsistent with the other actions (employee create/update, payroll confirm/undo, KPI save) which all log audit events. Bulk operations are arguably *more* important to audit since they affect many records at once.

**Fix:** Add audit logging for each imported schedule, or a single summary audit entry:
```typescript
if (imported_count > 0) {
  logAudit({
    tableName: 'class_schedules',
    recordId: effectiveBranch,  // use branch as context
    action: 'INSERT',
    userId: user.id,
    userEmail: user.email,
    newData: { batch_count: imported_count, source: 'excel_import' },
  })
}
```

---

## P2 -- Medium (Logic error or edge case)

### P2-1: Floating-point accumulation in payroll export totals

**File:** `lib/utils/excel-payroll-export.ts` lines 51-63

**Problem:** The summary totals are accumulated using `+=` on JavaScript numbers. For Vietnamese currency amounts (e.g., 15,750,000 VND), floating-point arithmetic can produce rounding errors like `15749999.999999998` instead of `15750000`. When exported to Excel, the user sees unexpected decimal values in the totals row.

**Fix:**
```typescript
// After accumulation, round totals
rows.push([
  'TONG', '', '',
  Math.round(totSessions * 100) / 100,  // sessions can be 0.5
  '', Math.round(totTeachingPay),
  Math.round(totSubPay), Math.round(totKpi), Math.round(totAllowances),
  Math.round(totGross), Math.round(totBhxh), Math.round(totBhyt),
  Math.round(totBhtn), Math.round(totTncn),
  Math.round(totPenalties), Math.round(totDeductions), Math.round(totNet),
])
```

---

### P2-2: Keyboard navigation ignores non-scheduled cells -- arrow key gets stuck

**File:** `lib/hooks/use-attendance-keyboard.ts` lines 76-87

**Problem:** When navigating with arrow keys, the hook moves to the target cell at `targetCells[colOffset + nextDay]` and checks `targetCell.tabIndex >= 0`. Non-scheduled cells render as `<td>` without `tabIndex` (from `AttendanceCell` when `isScheduled=false`), so the arrow key focus attempt silently fails. The user presses ArrowDown and nothing happens -- they are "stuck" because all cells below in that column are unscheduled.

**Suggested improvement:** Skip over unscheduled cells and find the next focusable cell in the arrow direction:
```typescript
// For ArrowDown: scan downward until we find a focusable cell
if (e.key === 'ArrowDown') {
  for (let r = rowIdx + 1; r < rowCount; r++) {
    const tr = allRows[r]
    if (!tr) continue
    const tds = Array.from(tr.querySelectorAll('td'))
    const target = tds[colOffset + dayIdx]
    if (target && target.tabIndex >= 0) { target.focus(); break }
  }
}
```

---

### P2-3: Excel export creates empty sheets for position groups with zero payslips

**File:** `lib/utils/excel-payroll-export.ts` lines 120-130

**Problem:** When a period has no teaching assistants (or no teachers), the export still creates a sheet with only the header row and an empty "TONG" summary row with all zeros. This is confusing in the Excel output.

**Fix:** Skip empty groups:
```typescript
for (const group of POSITION_GROUPS) {
  const filtered = payslips.filter((p) => group.key.includes(p.employee_position))
  if (filtered.length === 0) continue  // skip empty sheet

  const data = buildSheetData(filtered)
  // ...
}
```

Or, if the business wants empty sheets as placeholders, add a note row: `['Khong co du lieu']`.

---

### P2-4: Audit log `newData` can contain unbounded JSON -- no size cap

**File:** `lib/services/audit-log-service.ts` line 36
**File:** `lib/actions/employee-mutation-actions.ts` line 137

**Problem:** The `newData` parameter is stored as JSONB in PostgreSQL. The `updateEmployee` action passes the entire `data: Record<string, unknown>` object. While employee updates are typically small, there is no validation on the size of the data object. A malicious caller could send a massive object (e.g., deeply nested or with very long string values) through the server action.

Additionally, `logAudit` in `kpi-save-actions.ts` (line 78) logs score data which is fine, but the pattern sets a precedent for logging arbitrary data without size checks.

**Fix:** Truncate or limit the `newData`/`oldData` payload before storage:
```typescript
function sanitizeAuditData(data?: Record<string, unknown>): Record<string, unknown> | null {
  if (!data) return null
  const json = JSON.stringify(data)
  if (json.length > 10_000) {
    return { _truncated: true, _size: json.length }
  }
  return data
}
```

---

### P2-5: Messages constant not wired to actual components -- partial i18n

**File:** `lib/constants/messages.ts` (entire file)

**Problem:** The messages file defines 133 Vietnamese labels, but none of the Phase 7 components actually import from it. For example:
- `excel-import-dialog.tsx` hardcodes Vietnamese strings like `'Nhu p lich lop tu Excel'` directly
- `excel-export-button.tsx` hardcodes `'Loi xuat file Excel.'`
- `attendance-grid.tsx` hardcodes `'Chua co lich lop nao cho chi nhanh nay.'`
- `attendance-cell.tsx` hardcodes `'Trang thai: ${status ?? "chua cham"}'`

The messages file exists but is dead code -- nothing imports it.

**Fix:** Either import and use `MESSAGES` in all components, or document that this is a planned incremental migration. At minimum, the new Phase 7 components should reference `MESSAGES` to establish the pattern.

---

## P3 -- Low (Style, performance, or minor improvement)

### P3-1: Export filename doesn't include branch name

**File:** `components/payroll/excel-export-button.tsx` line 35

```typescript
a.download = `bang-luong-${periodName.replace('/', '-')}.xlsx`
```

Produces: `bang-luong-T3-2026.xlsx`. If the accountant exports for multiple branches, all files have the same name. Consider including branch name: `bang-luong-tan-mai-T3-2026.xlsx`.

---

### P3-2: `periodName` parameter unused in `generatePayrollExcel`

**File:** `lib/utils/excel-payroll-export.ts` lines 113-116

```typescript
export function generatePayrollExcel(
  payslips: PayslipWithEmployee[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _periodName: string
): ArrayBuffer {
```

The `_periodName` parameter is explicitly marked unused with an eslint-disable. If it is not needed, remove it. If it will be used later (e.g., for a title row in the sheet), add a TODO comment rather than a dead parameter.

---

### P3-3: DirtyMap type duplicated across two files

**File:** `components/attendance/attendance-grid.tsx` line 34
**File:** `components/attendance/attendance-grid-helpers.ts` line 7

Both files define:
```typescript
type DirtyMap = Map<string, { status: AttendanceStatus; originalStatus: AttendanceStatus | null }>
```

**Fix:** Define `DirtyMap` once in `attendance-grid-helpers.ts` and export it, then import in `attendance-grid.tsx`.

---

### P3-4: Keyboard hook `document.activeElement` is unsafe in SSR

**File:** `lib/hooks/use-attendance-keyboard.ts` line 54

```typescript
const focused = document.activeElement as HTMLElement | null
```

The `'use client'` directive ensures this only runs on the client, so this is safe in practice. However, if the hook is ever called during SSR (edge rendering), `document` will be undefined. The `containerRef.current` check on line 51 provides an implicit guard, but adding an explicit `typeof document === 'undefined'` guard would be more robust.

---

## Edge Cases Found by Scout

1. **Empty grid + keyboard**: If `rows.length === 0`, the grid renders a fallback message (line 109-114). The keyboard hook receives `rowCount: 0`, and `handleKeyDown` would still execute but `allRows` would be empty, so `rowIdx < 0` exits early. Safe.

2. **Export with 0 payslips**: `ExcelExportButton` checks `payslips.length === 0` and disables the button (line 53). If somehow called with empty array, `generatePayrollExcel` produces sheets with only headers + empty summary. Not a crash but produces a confusing Excel file.

3. **BM branch scoping on import**: Correctly handled -- line 37 of `class-schedule-import-actions.ts` forces `effectiveBranch = user.branch_id!`. The `!` assertion is safe because BM always has a `branch_id` in `app_metadata`.

4. **Duplicate class_code in same import file**: The parser does not deduplicate. If the Excel file contains two rows with `class_code: "A1"`, both will pass validation. On insert, the second one will hit a unique constraint error (if one exists on `class_code`) and be reported as an error. If there is no unique constraint, both are inserted -- which could be a data integrity issue.

5. **Concurrent imports**: Two users importing simultaneously for the same branch could both pass the employee lookup but create conflicting class_codes. The DB unique constraint (if present) would catch this, but the error message would be generic.

---

## Positive Observations

1. **Clean barrel re-exports**: `employee-actions.ts` and `class-schedule-actions.ts` properly split into query/mutation/import modules with barrel re-exports. Good for file size compliance.

2. **BM branch scoping**: The import action correctly forces `effectiveBranch` for BMs (line 37), preventing cross-branch imports.

3. **Employee position validation**: The import action validates that `teacher_code` maps to position `'teacher'` and `assistant_code` maps to position `'assistant'` (lines 58-63). This prevents misassignment.

4. **Fire-and-forget error isolation**: `logAudit()` correctly wraps all logic in try/catch with a silent console.error. Even if audit logging fails, the primary operation succeeds.

5. **Keyboard hook**: Clean implementation with proper `useCallback` dependency array, boundary clamping (`Math.max/Math.min`), and focus management via DOM traversal.

6. **Excel export column widths**: Pre-defined `COL_WIDTHS` array makes the exported Excel immediately readable without manual column resizing.

7. **Diff preview before save**: The attendance grid shows changes before committing -- excellent UX for preventing accidental bulk updates.

---

## Summary

| Severity | Count | Key Theme |
|----------|-------|-----------|
| P0 | 3 | Audit log completely non-functional; no file size limit; N+1 import |
| P1 | 4 | Parser crash on bad files; redundant auth; no field allowlist; missing audit |
| P2 | 5 | Float rounding; keyboard stuck; empty sheets; unbounded JSON; dead messages |
| P3 | 4 | Filename, unused param, type duplication, SSR guard |

**Critical path:** P0-1 must be fixed first -- audit logging is entirely broken. Without the admin client fix, the feature does nothing and gives a false sense of security. P0-2 and P0-3 should follow immediately.

---

## Recommended Fix Order

1. **P0-1**: Switch `audit-log-service.ts` to use `createAdminClient()` from `lib/supabase/admin.ts`
2. **P0-2**: Add file size limit (2MB client-side) and row limit (500 server-side) to Excel import
3. **P0-3**: Refactor batch import to use single `.insert(validInserts)` call
4. **P1-1**: Add try/catch with user-friendly error return in `parseScheduleExcel()`
5. **P1-2**: Pass userId/userEmail from caller to `logAudit()` to avoid redundant auth
6. **P1-3**: Add field allowlist to `updateEmployee()`
7. **P1-4**: Add audit logging for batch import operations
8. Remaining P2/P3 items as time permits

---

## Unresolved Questions

1. Is there a unique constraint on `class_schedules.class_code`? If not, duplicate codes from import will silently create duplicates.
2. Should the audit log viewer UI be built as part of Phase 7, or is it deferred? Currently there is no way to view audit logs in the app.
3. Should batch import be transactional (all-or-nothing) or best-effort (partial success)? Current implementation is best-effort but the UX implies all-or-nothing.
