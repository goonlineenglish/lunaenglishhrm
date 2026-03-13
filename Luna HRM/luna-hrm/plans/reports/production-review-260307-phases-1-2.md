# Production Readiness Review -- Phases 1-2

**Reviewer:** Code Reviewer Agent (Claude Opus 4.6)
**Date:** 2026-03-07
**Scope:** Phase 1 (Database + Auth + Scaffold) + Phase 2 (Class Schedules + Attendance)
**Files reviewed:** 40+ files across `supabase/migrations/`, `lib/actions/`, `lib/services/`, `lib/types/`, `lib/utils/`, `components/`, `app/`
**LOC reviewed:** ~3,500+

---

**Verdict: CONDITIONAL APPROVE**

Phases 1-2 are architecturally sound. Auth uses `app_metadata` (immutable by client), RLS covers all 17 tables, date handling uses timezone-safe `parseIsoDateLocal`, attendance saves include schedule-ownership validation. The codebase follows consistent patterns and is well-structured.

However, 3 P0 and 5 P1 issues must be addressed before production deploy.

---

## [P0] Critical -- Must Fix Before Deploy

### P0-1: Invalid Index on Non-Existent Column `employees.status`

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/supabase/migrations/003_indexes.sql` (line 77)

```sql
CREATE INDEX idx_employees_status
  ON employees (status);
```

The `employees` table has no column named `status`. The correct column is `is_active` (boolean). This migration will **fail at deploy time**, blocking all subsequent migrations.

**Impact:** Deploy blocker. All indexes after this one will not be created.

**Fix:**
```sql
CREATE INDEX idx_employees_is_active
  ON employees (is_active);
```

---

### P0-2: Cron Endpoint Uses Timing-Attack-Vulnerable String Comparison

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/app/api/cron/weekly-reminder/route.ts` (line 14)

```typescript
if (secret !== process.env.CRON_SECRET) {
```

The `!==` operator is vulnerable to timing attacks. An attacker can statistically determine the correct secret character-by-character by measuring response times. The `/api/` path is NOT in `PROTECTED_PATHS` in `proxy.ts`, so this endpoint is reachable without authentication.

**Impact:** Secret can be brute-forced by an attacker with network access.

**Fix:**
```typescript
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

const secret = request.headers.get('x-cron-secret') ?? ''
if (!process.env.CRON_SECRET || !safeCompare(secret, process.env.CRON_SECRET)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### P0-3: `/api/` Routes Not Protected by Middleware -- Any Unauthenticated User Can Hit Cron

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/proxy.ts` (line 7)

```typescript
const PROTECTED_PATHS = ['/dashboard', '/branches', '/employees', '/attendance', ...]
```

The `/api/` path prefix is absent from `PROTECTED_PATHS`. While the cron endpoint has its own `CRON_SECRET` check, **any future API route** added without explicit auth will be publicly accessible by default. This is a systemic risk.

Currently the only API route is the cron endpoint which has its own guard, but the architectural gap is dangerous for future phases (payroll API, KPI API, etc.).

**Impact:** Any API route added without auth protection becomes public by default.

**Fix:** Either:
- (a) Add `/api/` to `PROTECTED_PATHS` and exempt cron with a sub-path check, OR
- (b) Document prominently in code standards that ALL `/api/*` routes MUST implement their own auth, and add a middleware-level safeguard like:

```typescript
if (pathname.startsWith('/api/') && !pathname.startsWith('/api/cron/')) {
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## [P1] High -- Should Fix Before Deploy

### P1-1: `updateEmployee` Allows BM to Change Employee's `branch_id` -- Cross-Branch Transfer Without Admin

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/employee-mutation-actions.ts` (lines 106-117)

```typescript
const ALLOWED_UPDATE_FIELDS = new Set([
  'full_name', 'phone', 'position', 'role', 'branch_id',
  'rate_per_session', 'sub_rate', 'has_labor_contract',
  'dependent_count', 'is_active',
])
```

The `branch_id` field is in the allowlist. A branch_manager can set `branch_id` to another branch's UUID, effectively transferring an employee out of their own branch. The RLS policy on employees checks `branch_id = get_user_branch_id()` for USING clause (reads the row before update), but the WITH CHECK does the same -- meaning if a BM changes `branch_id` to another branch, the DB will reject it.

**However**, the code currently checks that the employee's existing `branch_id` matches the BM's branch (line 129-136), so the BM can read the record. The WITH CHECK on update will reject a branch_id change to a different branch.

**Partial safety via RLS**, but the application-level code should explicitly prevent BMs from modifying `branch_id`:

```typescript
if (user.role === 'branch_manager') {
  delete safeData.branch_id  // BMs cannot transfer employees between branches
  delete safeData.is_active  // Consider: should BM deactivate employees?
}
```

---

### P1-2: `employee_weekly_notes` -- BM Can Delete Notes from Any Branch Via Direct ID

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/weekly-notes-actions.ts` (lines 110-129)

```typescript
export async function deleteWeeklyNote(id: string): Promise<ActionResult> {
  // ...
  const { error } = await sb.from('employee_weekly_notes').delete().eq('id', id)
```

No branch scoping check for BM role. A branch_manager can delete any weekly note from any branch by providing its UUID. RLS policy `employee_weekly_notes_bm_all_own_branch` would reject cross-branch deletes, so the actual risk is mitigated by RLS. However, the error would be silently swallowed (Supabase returns no error for delete of zero rows when RLS blocks it), giving a false `success: true` response.

**Impact:** UX confusion (BM gets success but note not deleted). Defense-in-depth gap.

**Fix:** Add branch check before delete:
```typescript
if (user.role === 'branch_manager') {
  const { data: note } = await sb.from('employee_weekly_notes')
    .select('branch_id').eq('id', id).maybeSingle()
  if (!note || note.branch_id !== user.branch_id)
    return { success: false, error: 'Ghi chu khong thuoc chi nhanh cua ban.' }
}
```

---

### P1-3: `deactivateClassSchedule` -- BM Not Branch-Scoped

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/class-schedule-mutation-actions.ts` (lines 136-161)

```typescript
export async function deactivateClassSchedule(id: string): Promise<ActionResult> {
  // ...
  const { error } = await sb
    .from('class_schedules')
    .update({ status: 'inactive' })
    .eq('id', id)
```

No check that the schedule belongs to the BM's branch. RLS blocks cross-branch update, but the action returns `success: true` even if zero rows were affected (Supabase `.update().eq()` does not error on zero-row match).

**Impact:** BM believes schedule was deactivated but nothing happened. Defense-in-depth gap.

**Fix:** Verify branch ownership before deactivation, or check `count` after update:
```typescript
const { data, error, count } = await sb
  .from('class_schedules')
  .update({ status: 'inactive' })
  .eq('id', id)
  .select()
  .single()
if (!data) return { success: false, error: 'Lich lop khong ton tai hoac khong thuoc chi nhanh.' }
```

---

### P1-4: `getWeeklyNotes` Does Not Normalize `weekStartStr` to Canonical Monday

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/weekly-notes-actions.ts` (line 44)

```typescript
let query = sb
  .from('employee_weekly_notes')
  .select(...)
  .eq('week_start', weekStartStr)  // raw string, NOT normalized
```

Unlike `saveAttendanceBatch` and `lockWeek` which normalize via `getWeekStart(parseIsoDateLocal(weekStartStr))`, `getWeeklyNotes` passes the raw string directly. If the caller sends "2026-03-10" (Tuesday) instead of "2026-03-09" (Monday), the query returns zero results even though notes exist.

The attendance page happens to pass the correct Monday because `weekStart` state is initialized from `getWeekStart(new Date())`, but the API contract is fragile.

**Impact:** Could silently return empty notes if caller sends non-Monday date. Low probability but violates the normalization pattern used everywhere else.

**Fix:**
```typescript
const normalized = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))
let query = sb
  .from('employee_weekly_notes')
  .select(...)
  .eq('week_start', normalized)
```

---

### P1-5: `createWeeklyNote` Does Not Validate Employee Belongs to Branch

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/weekly-notes-actions.ts` (lines 72-106)

A BM creates a note with `branch_id` forced to their own branch, but `employee_id` is not validated to belong to that branch. The BM could create a note for an employee in another branch. RLS would allow the INSERT because `branch_id = get_user_branch_id()` passes, but the note would reference an employee from another branch -- corrupting payroll data since notes are the "single source of truth" for payroll adjustments.

**Impact:** Data integrity issue -- weekly notes could reference employees from wrong branch, affecting payroll calculations in Phase 3.

**Fix:**
```typescript
if (user.role === 'branch_manager') {
  const err = await checkBmBranchAccess(sb, data.employee_id, user.branch_id ?? null)
  if (err) return { success: false, error: err }
}
```

---

## [P2] Medium -- Fix Post-Launch

### P2-1: `as any` Cast on Supabase Client Throughout All Server Actions

**Files:** Every server action file (`employee-query-actions.ts`, `branch-actions.ts`, `class-schedule-query-actions.ts`, `attendance-query-actions.ts`, `attendance-save-actions.ts`, `office-attendance-actions.ts`, `weekly-notes-actions.ts`, `employee-notes-actions.ts`, etc.)

Pattern:
```typescript
const supabase = await createClient()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any
```

This completely negates type safety from the `Database` interface in `lib/types/database.ts`. Typos in column names, wrong filter types, missing required fields -- none caught at compile time.

**Impact:** Any table/column name typo becomes a runtime error instead of compile error. The `Database` interface exists but is never used at query call sites.

**Fix:** Remove `as any` and use properly-typed Supabase client. If the generated types cause friction with `select('*, relation(...)')`, create typed wrapper functions or use `.returns<T>()`.

---

### P2-2: `getEmployees` Query Has No LIMIT -- Unbounded Result Set

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/employee-query-actions.ts` (line 31)

```typescript
let query = sb.from('employees').select('*, branches(name)').order('full_name')
```

No `.limit()` call. For a small English center this is fine, but as a defensive measure and API contract, all list queries should have a reasonable upper bound.

**Impact:** Low for current scale (likely <100 employees). Becomes a performance issue if data grows unexpectedly.

**Fix:** Add `.limit(500)` or implement pagination.

---

### P2-3: Duplicate `ActionResult` Type Definition in Multiple Files

**Files:**
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/employee-query-actions.ts` (line 7)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/class-schedule-query-actions.ts` (line 7)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/attendance-query-actions.ts` (line 18)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/office-attendance-actions.ts` (line 8)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/weekly-notes-actions.ts` (line 9)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/branch-actions.ts` (line 7)

Same interface defined 6 times. DRY violation.

**Fix:** Extract to a shared types file like `lib/types/action-result.ts` and import everywhere.

---

### P2-4: Duplicate `ROLE_LABELS` / `POSITION_LABELS` Definitions

**Files:**
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/constants/roles.ts` (lines 7-12, 21-26)
- `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/types/user.ts` (lines 36-41, 43-48)

Both files define identical `ROLE_LABELS` and `POSITION_LABELS` maps. Components import from different sources.

**Fix:** Single source of truth -- keep in `lib/constants/roles.ts`, remove from `lib/types/user.ts` and re-export from there if needed.

---

### P2-5: `class-schedules/page.tsx` Passes Empty `branchId=""` to Form and Import

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/app/(dashboard)/class-schedules/page.tsx` (lines 89, 97)

```typescript
<ClassScheduleForm branchId="" onSaved={fetchData} />
<ExcelImportDialog branchId="" onImported={fetchData} />
```

Empty string `""` is passed as `branchId`. For BMs, the server action overrides with `user.branch_id`. For admins, this means:
- `createClassSchedule` uses `data.branch_id` which comes from the form payload (which also has no branch selector visible for admin on this page).
- `batchImportClassSchedules` fails silently because `effectiveBranch` is empty string and `if (!effectiveBranch)` catches it.

Admin users on the class schedules page have no branch selector and no way to specify which branch. The page only works for BMs.

**Impact:** Admin users cannot create/import class schedules from this page. Functional gap for admin role.

**Fix:** Add `BranchSelector` for admin users on the class schedules page, similar to attendance page pattern.

---

### P2-6: `formatDate` in `date-helpers.ts` Uses `new Date(string)` for String Input

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/utils/date-helpers.ts` (lines 36-43)

```typescript
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
```

When `date` is a string like `"2026-03-07"`, `new Date("2026-03-07")` parses as UTC midnight, which in Vietnam (UTC+7) displays as March 7th but in UTC- timezones could shift to March 6th. This contradicts the explicit design decision to use `parseIsoDateLocal` everywhere.

**Impact:** Incorrect date display in UTC- timezones. The server runs in Vietnam (UTC+7) so this may not manifest in production, but it violates the timezone-safety pattern.

**Fix:**
```typescript
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseIsoDateLocal(date) : date
```

---

### P2-7: `attendance-grid.tsx` -- Race Condition Between `getCurrentUser` Effect and `fetchGrid` Effect

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/app/(dashboard)/attendance/page.tsx` (lines 37-67)

```typescript
useEffect(() => {
  getCurrentUser().then((user) => {
    if (user?.role === 'admin') setIsAdmin(true)
  })
}, [])

const fetchGrid = useCallback(async () => {
  if (isAdmin && !branchId) { ... }
  // ...
}, [weekStart, branchId, isAdmin])

useEffect(() => { fetchGrid() }, [fetchGrid])
```

On initial mount, `isAdmin` starts as `false`. The `fetchGrid` effect runs immediately with `isAdmin=false`, so for an admin user, the grid fetch fires without branch scoping (BM path is taken because `isAdmin` hasn't been set yet). The `getCurrentUser` resolves later, sets `isAdmin=true`, which triggers a re-render and correct fetch.

**Impact:** For admin users, first load makes an unnecessary server call with wrong branch scoping. The server action handles this safely (returns data scoped by RLS), so no data leak, but it's an unnecessary network round-trip and brief flash of incorrect state.

**Fix:** Load user role server-side via layout or page props instead of client-side effect. The dashboard layout already calls `getCurrentUser()` -- pass `isAdmin` as a prop.

---

## [P3] Low -- Nice to Have

### P3-1: `lookupEmployeeByCode` -- ILIKE Pattern Injection

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/class-schedule-query-actions.ts` (line 87)

```typescript
.ilike('employee_code', `%${code}%`)
```

If `code` contains `%` or `_` characters (LIKE wildcards), the search will match unintended patterns. Not a security vulnerability since results are limited by RLS and `.limit(10)`, but the UX could be confusing.

**Fix:** Escape LIKE wildcards:
```typescript
const escaped = code.replace(/[%_]/g, '\\$&')
.ilike('employee_code', `%${escaped}%`)
```

---

### P3-2: `attendance_locks` Table Has No `updated_at` Column

Unlike all other tables, `attendance_locks` has no `updated_at` trigger. This is intentional (locks are insert-only, delete-to-unlock), but it's inconsistent with the other 16 tables. Not a bug, just an observation.

---

### P3-3: No Input Length Validation on Text Fields

**Files:** `employee-mutation-actions.ts`, `class-schedule-mutation-actions.ts`, `weekly-notes-actions.ts`

Free-text fields like `full_name`, `class_code`, `description` have no maximum length validation. While PostgreSQL TEXT columns have no inherent limit, extremely long strings (>10KB) could bloat the database and cause UI rendering issues.

**Fix:** Add reasonable limits:
```typescript
if (input.full_name.length > 200) return { success: false, error: 'Ten qua dai.' }
```

---

### P3-4: `audit-log-service.ts` -- Fire-and-Forget Pattern Masks Failures

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/services/audit-log-service.ts` (lines 25-43)

`logAudit` is called without `await` throughout the codebase. If the audit_logs table doesn't exist or has schema issues, all audit logging silently fails. The catch block only logs to console.

This is an acceptable trade-off for non-critical audit logging, but consider adding a health check for the audit table on app startup.

---

### P3-5: `employee_code` Input Not Sanitized on Create

**File:** `F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm/lib/actions/employee-mutation-actions.ts` (line 59)

`employee_code` is stored as-is from user input. Leading/trailing whitespace, special characters, or very long strings are accepted. The UNIQUE constraint `(branch_id, employee_code)` prevents exact duplicates but not near-duplicates like `"T01"` vs `"T01 "`.

**Fix:** Trim and validate format:
```typescript
const code = input.employee_code.trim().toUpperCase()
if (!/^[A-Z0-9-]{1,20}$/.test(code)) return { success: false, error: 'Ma khong hop le.' }
```

---

## Production Checklist

### Security
- [x] Auth uses `app_metadata` (not client-writable `user_metadata`)
- [x] Middleware uses `getUser()` not `getSession()` for session validation
- [x] RLS enabled on all 17 tables + audit_logs (18 total)
- [x] Employee self-update policy prevents role/branch escalation (WITH CHECK)
- [x] BM role restrictions: can only assign `employee` role, branch-scoped queries
- [x] Admin client (`createAdminClient`) properly separated, service role key not exposed
- [ ] **P0-2:** Cron secret uses timing-attack-vulnerable `!==`
- [ ] **P0-3:** `/api/` routes not protected by middleware
- [x] Password stored in Supabase Auth (bcrypt), never in `employees` table
- [x] `createAuthUser` sets `email_confirm: true` (no email verification bypass)

### Data Integrity
- [x] FK constraints with appropriate CASCADE/RESTRICT behaviors
- [x] Unique constraints: `(branch_id, class_code)`, `(schedule_id, employee_id, date)`, `(employee_id, date)`, `(branch_id, week_start)`, etc.
- [x] CHECK constraints on `position`, `role`, `status`, `note_type`, `days_of_week`
- [x] `chk_teacher_ne_assistant` prevents same person as both
- [x] `parseIsoDateLocal` used consistently for date parsing
- [x] `getWeekStart` normalization in save/lock/unlock paths
- [ ] **P0-1:** Index references non-existent column `employees.status`
- [ ] **P1-4:** `getWeeklyNotes` doesn't normalize weekStartStr
- [ ] **P1-5:** `createWeeklyNote` doesn't validate employee-branch membership

### Error Handling
- [x] All server actions wrapped in try/catch
- [x] Consistent `ActionResult<T>` return pattern
- [x] Vietnamese error messages for user-facing errors
- [x] Auth user rollback on failed employee create
- [x] Metadata sync failure logged but doesn't block employee update
- [x] Excel parser wraps in try/catch with user-friendly error

### Performance
- [x] Indexes on all FK columns used in RLS JOIN paths
- [x] Attendance grid uses batch upsert (not N+1 inserts)
- [x] Employee lookup limited to 10 results
- [x] Excel import has MAX_IMPORT_ROWS = 500 server-side limit
- [x] File size limit (2MB) on Excel import client-side
- [ ] **P2-2:** `getEmployees` has no LIMIT

### Architecture
- [x] Clean separation: query actions / mutation actions / barrel re-exports
- [x] Types match SQL schema (verified manually)
- [x] Consistent `'use server'` declaration on all action files
- [x] Service layer extracted for attendance grid logic
- [x] Client-side debounce on employee code lookup (300ms)
- [x] Keyboard navigation and shortcuts in attendance grid
- [x] CSS-responsive layout (no `useMediaQuery`)

---

## Positive Observations

1. **Timezone-safe date handling** -- `parseIsoDateLocal` + `toISODate` pattern avoids the common UTC pitfall. Well-documented with inline comments.

2. **Employee self-update RLS** -- The WITH CHECK clause on `employees_self_update` prevents privilege escalation by ensuring `role`, `branch_id`, and `is_active` cannot be changed by the employee. This is a sophisticated policy rarely seen in Supabase projects.

3. **Attendance ownership validation** -- `saveAttendanceBatch` verifies each record's `employeeId` is actually the `teacher_id` or `assistant_id` of the schedule. This prevents fabricating attendance for arbitrary employees.

4. **Staged circular FK** -- The `branches.manager_id -> employees.id` FK is correctly staged (CREATE TABLE without FK, then ALTER TABLE ADD CONSTRAINT). Clean solution.

5. **Lock lifecycle consistency** -- All 7 lock-related paths (save attendance, save office attendance, lock, unlock, get grid, get office grid, and isWeekLocked auto-check) consistently normalize dates.

6. **Staff reassignment guard** -- `updateClassSchedule` blocks teacher/assistant changes when attendance records exist, preventing orphaned attendance data.

7. **Audit logging uses admin client** -- Unlike the pattern flagged in Phase 7 review, Phase 1-2 audit service correctly uses `createAdminClient()` to bypass RLS.

8. **BM role assignment restriction** -- `BM_ALLOWED_ROLES = ['employee']` prevents BMs from creating admin or accountant users.

---

## Unresolved Questions

1. **`payslips.position` CHECK allows only 3 values** (`teacher`, `assistant`, `office`) but `employees.position` CHECK allows 4 values (`teacher`, `assistant`, `office`, `admin`). What happens when admin position employees need payslips in Phase 3?

2. **Employee deactivation cascade** -- If an employee is deactivated (`is_active = false`), their `class_schedules` records remain active with FK references. Should deactivation trigger schedule reassignment warnings?

3. **`attendance_locks` shared between class-based and office attendance** -- The same lock table gates both. Is this intentional? If a BM wants to lock class attendance but keep editing office attendance for the same week, the current design doesn't support it.

4. **`branch_id` on `employees` is nullable with ON DELETE SET NULL** -- If a branch is deleted, employees become branch-less. BMs can't see them, employees can't see their own branch. Should branch deletion be RESTRICT instead?

5. **`evaluation_scores.score` has NO CHECK constraint** -- Negative scores or scores exceeding `max_score` can be inserted. While Phase 6 concern, the schema is in Phase 1 migration.

---

## Summary Statistics

| Severity | Count | Details |
|----------|-------|---------|
| P0 Critical | 3 | Invalid index, timing attack on cron, /api/ not protected |
| P1 High | 5 | BM branch_id transfer, notes delete not scoped, deactivate not scoped, weekStart normalization, employee-branch validation |
| P2 Medium | 7 | `as any` casts, no LIMIT, duplicate types/labels, admin no branch selector, formatDate timezone, race condition, ILIKE injection |
| P3 Low | 5 | Wildcards, no updated_at on locks, no text length limits, fire-and-forget audit, employee_code sanitization |
| **Total** | **20** | |

**Recommendation:** Fix all P0 issues and P1-4, P1-5 before deploy (data integrity). Other P1s are mitigated by RLS but should be fixed for defense-in-depth. P2/P3 can be addressed post-launch.
