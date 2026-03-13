---
title: "Phase 2: Unlock Attendance Override (Admin + BM)"
status: completed
priority: P2
effort: 1.5h
completed: 2026-03-14
---

# Phase 2: Unlock Attendance Override (Admin + BM)

## Context Links

- **Brainstorm:** `plans/reports/brainstorm-260313-attendance-grid-ux-improvements.md` (Feature 2)
- **Current lock logic:** `lib/actions/attendance-save-actions.ts` (lockWeek, unlockWeek, saveAttendanceBatch)
- **Current query:** `lib/actions/attendance-query-actions.ts` (getAttendanceGrid returns `isLocked`)
- **Auto-lock:** `lib/utils/date-helpers.ts` — `isWeekLocked()` (>3 days past week = locked)
- **DB schema:** `supabase/migrations/001_create_all_tables.sql` lines 165-172
- **Type:** `lib/types/database-schedule-types.ts` lines 64-72 (AttendanceLock)
- **Attendance page:** `app/(dashboard)/attendance/page.tsx` (merges auto-lock + manual lock)
- **Grid component:** `components/attendance/attendance-grid.tsx` (renders lock state)

## Overview

Allow Admin and Branch Manager to override both manual lock AND auto-lock on attendance weeks. Currently:
- **Manual lock** can be undone by admin only (delete `attendance_locks` row)
- **Auto-lock** (>3 days past week) is permanent — NO override possible

After this change: Admin/BM can override auto-lock via an explicit `is_override=true` row in `attendance_locks`, and both roles can unlock manual locks.

## Key Insights

1. **Current UNIQUE constraint:** `(branch_id, week_start)` — only 1 row per branch per week. Override needs a separate row, so constraint must change to `(branch_id, week_start, is_override)`.
2. **`isWeekLocked()` in date-helpers.ts stays unchanged** — it's a pure utility. Override logic lives in the actions layer.
3. **Lock state becomes a 3-value enum in practice:**
   - `unlocked` — no manual lock, not auto-locked (or auto-lock has override)
   - `manual_locked` — manual lock row exists
   - `auto_locked` — past grace period, no override row
4. **Payroll guard is critical** — if payroll_periods for that branch/month is `confirmed`, save must be blocked even if week is overridden.
5. **BM scope:** `unlockWeek` and `overrideAutoLock` must enforce `branch_id` from JWT for BM role.

## Requirements

**Functional:**
- F1: Admin + BM can unlock manually-locked weeks (currently admin-only)
- F2: Admin + BM can override auto-locked weeks by inserting `attendance_locks(is_override=true)`
- F3: After override, attendance grid becomes editable for that week
- F4: "Kho lại" (re-lock) button available after unlocking/overriding
- F5: Cannot save attendance if payroll period is confirmed for the month containing that week
- F6: UI shows lock type indicator (auto-lock vs manual-lock)

**Non-functional:**
- NF1: Migration is additive (no data loss)
- NF2: Existing lock rows (is_override=false) continue working
- NF3: RLS policies unchanged (admin=all, BM=own branch)

## Architecture

### Lock State Resolution

```
Input:
  autoLocked     = isWeekLocked(weekStart)      // pure date check, unchanged
  hasManualLock  = attendance_locks row WHERE is_override=false EXISTS
  hasOverride    = attendance_locks row WHERE is_override=true EXISTS

Output:
  isLocked       = (autoLocked AND NOT hasOverride) OR hasManualLock
  lockType       = hasManualLock ? 'manual' : (autoLocked ? 'auto' : null)
  canUnlock      = isLocked AND (role='admin' OR role='branch_manager')
```

### Data Flow

```
[attendance_locks table]
  branch_id | week_start | is_override | locked_by | locked_at
  ---       | ---        | false       | ...       | ...         ← manual lock
  ---       | ---        | true        | ...       | ...         ← auto-lock override

[getAttendanceGrid] → queries both rows → returns { isLocked, lockType, hasOverride }
[attendance-grid.tsx] → renders lock state + unlock/override button
[overrideAutoLock] → inserts is_override=true row
[unlockWeek] → deletes is_override=false row (manual unlock) or is_override=true row (remove override)
```

## Related Code Files

**New:**
- `supabase/migrations/008_attendance_lock_override.sql`
- `lib/actions/attendance-lock-actions.ts` — extracted from attendance-save-actions (ISSUE-12 fix: 200-line limit)

**Edit:**
- `lib/types/database-schedule-types.ts` — add `is_override` to `AttendanceLock`
- `lib/actions/attendance-save-actions.ts` — update `saveAttendanceBatch()` lock check + payroll guard; `lockWeek` stays here (relies on `DEFAULT false`, no code change — ISSUE-2 documented)
- `lib/actions/attendance-query-actions.ts` — return `lockType`, `hasOverride` in `AttendanceGridData`
- `lib/actions/office-attendance-actions.ts` — update `getOfficeAttendanceGrid()` multi-row lock query + `saveOfficeAttendanceBatch()` override-aware lock check (ISSUE-3/4 fix)
- `lib/actions/attendance-actions.ts` — re-export `overrideAutoLock`, `removeOverride`, `unlockWeek` from new file
- `app/(dashboard)/attendance/page.tsx` — pass `userRole` to grid, remove client-side `isWeekLocked()` merge
- `app/(dashboard)/office-attendance/page.tsx` — remove client-side `isWeekLocked()` merge, pass override-aware lock props (ISSUE-10 fix)
- `components/attendance/attendance-grid.tsx` — unlock/override button UI + audit log
- `components/office-attendance/office-attendance-grid.tsx` — pass override props, show unlock button

## Implementation Steps

### Step 1: Migration — `008_attendance_lock_override.sql`

**File:** `supabase/migrations/008_attendance_lock_override.sql`

```sql
-- Add is_override column to attendance_locks
ALTER TABLE attendance_locks
  ADD COLUMN is_override BOOLEAN NOT NULL DEFAULT false;

-- Drop old unique constraint and create new one
-- Old: UNIQUE(branch_id, week_start)
-- New: UNIQUE(branch_id, week_start, is_override)
-- This allows both a manual-lock row (is_override=false) and override row (is_override=true)
ALTER TABLE attendance_locks
  DROP CONSTRAINT attendance_locks_branch_id_week_start_key;

ALTER TABLE attendance_locks
  ADD CONSTRAINT attendance_locks_branch_week_override_key
  UNIQUE (branch_id, week_start, is_override);
```

**Run in Supabase SQL Editor** (cloud project, no local Supabase).

### Step 2: Update TypeScript type — `AttendanceLock`

**File:** `lib/types/database-schedule-types.ts` (lines 64-72)

Add `is_override` field:

```typescript
export interface AttendanceLock {
  id: string
  branch_id: string
  week_start: string
  locked_by: string
  locked_at: string
  is_override: boolean  // NEW: true = auto-lock override, false = manual lock
}
```

No change to `AttendanceLockInsert` (it derives from `Omit<AttendanceLock, 'id'>`), so `is_override` is automatically included.

### Step 3: Update `AttendanceGridData` type

**File:** `lib/actions/attendance-query-actions.ts`

Extend the return type:

```typescript
export interface AttendanceGridData {
  rows: AttendanceGridRow[]
  conflicts: ScheduleConflict[]
  summary: WeekSummary[]
  isLocked: boolean
  lockType: 'manual' | 'auto' | null  // NEW
  hasOverride: boolean                  // NEW
}
```

### Step 4: Update `getAttendanceGrid()` — query both lock types

**File:** `lib/actions/attendance-query-actions.ts`

Replace the single `maybeSingle()` lock query (lines 73-78) with a query that returns all lock rows for the week:

```typescript
// Replace lines 73-78:
const { data: lockRows } = await sb
  .from('attendance_locks')
  .select('id, is_override')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', dateFrom)

const hasManualLock = (lockRows ?? []).some((r: { is_override: boolean }) => !r.is_override)
const hasOverride = (lockRows ?? []).some((r: { is_override: boolean }) => r.is_override)
const autoLocked = isWeekLocked(weekStart)
const isLocked = (autoLocked && !hasOverride) || hasManualLock
const lockType = hasManualLock ? 'manual' as const : (autoLocked ? 'auto' as const : null)
```

Add `isWeekLocked` to the import from date-helpers:

```typescript
import { getWeekDates, getWeekStart, parseIsoDateLocal, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
```

Update the return:

```typescript
return {
  success: true,
  data: { rows, conflicts, summary, isLocked, lockType, hasOverride },
}
```

### Step 5: Update `saveAttendanceBatch()` — combined lock check + payroll guard

**File:** `lib/actions/attendance-save-actions.ts`

Replace the current lock check (lines 40-51) with the new combined logic:

```typescript
// Auto-lock check — allow if override exists
const autoLocked = isWeekLocked(normalizedWeekStart)
if (autoLocked) {
  const { data: overrideRow } = await sb
    .from('attendance_locks')
    .select('id')
    .eq('branch_id', effectiveBranch)
    .eq('week_start', normalizedWeekStartStr)
    .eq('is_override', true)
    .maybeSingle()
  if (!overrideRow) {
    return { success: false, error: 'Tuan nay da bi khoa tu dong, khong the luu.' }
  }
}

// Manual lock check
const { data: manualLock } = await sb
  .from('attendance_locks')
  .select('id')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', normalizedWeekStartStr)
  .eq('is_override', false)
  .maybeSingle()
if (manualLock) {
  return { success: false, error: 'Tuan nay da bi khoa, khong the luu.' }
}

// Payroll guard — block save if payroll for that month is confirmed
// ISSUE-5 FIX: Check BOTH months if week crosses month boundary
const weekEndDate = new Date(normalizedWeekStart)
weekEndDate.setDate(weekEndDate.getDate() + 6)
const startMonth = normalizedWeekStart.getMonth() + 1
const startYear = normalizedWeekStart.getFullYear()
const endMonth = weekEndDate.getMonth() + 1
const endYear = weekEndDate.getFullYear()

let payrollFilter = `and(month.eq.${startMonth},year.eq.${startYear})`
if (startMonth !== endMonth || startYear !== endYear) {
  payrollFilter += `,and(month.eq.${endMonth},year.eq.${endYear})`
}
const { data: confirmedPeriod } = await sb
  .from('payroll_periods')
  .select('id')
  .eq('branch_id', effectiveBranch)
  .eq('status', 'confirmed')
  .or(payrollFilter)
  .limit(1)
  .maybeSingle()
if (confirmedPeriod) {
  return { success: false, error: 'Không thể lưu — bảng lương tháng này đã được xác nhận.' }
}
```

### Step 6: Extract lock actions into `attendance-lock-actions.ts` (ISSUE-12 fix)

**File:** `lib/actions/attendance-lock-actions.ts` (NEW)

Extract `unlockWeek()`, `overrideAutoLock()`, `removeOverride()` into this new file. Keep `lockWeek()` and `saveAttendanceBatch()` in `attendance-save-actions.ts`.

**Note (ISSUE-2):** `lockWeek()` does NOT set `is_override` explicitly — it relies on `DEFAULT false`. This is correct and intentional. No code change needed for `lockWeek()`.

### Step 6a: `unlockWeek()` — allow BM + delete by type

```typescript
export async function unlockWeek(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    // Allow admin + branch_manager (was admin-only)
    const canUnlock = user.role === 'admin' || user.role === 'branch_manager'
    if (!canUnlock) return { success: false, error: 'Bạn không có quyền mở khoá tuần.' }

    // ISSUE-6 FIX: BM scoped to own branch (pre-existing bug fixed)
    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    const sb = supabase as any

    // Delete manual lock row (is_override=false)
    const { error } = await sb
      .from('attendance_locks')
      .delete()
      .eq('branch_id', effectiveBranch)
      .eq('week_start', canonicalWeekStart)
      .eq('is_override', false)

    if (error) throw error

    // ISSUE-14 FIX: Audit log
    logAudit(user.id, user.email ?? '', 'attendance_unlock', { branch_id: effectiveBranch, week_start: canonicalWeekStart })

    return { success: true }
  } catch (err) {
    console.error('[unlockWeek]', err)
    return { success: false, error: 'Không thể mở khoá tuần.' }
  }
}
```

### Step 7: Add `overrideAutoLock()` action

**File:** `lib/actions/attendance-lock-actions.ts`:

```typescript
export async function overrideAutoLock(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canOverride = user.role === 'admin' || user.role === 'branch_manager'
    if (!canOverride) return { success: false, error: 'Bạn không có quyền mở khoá tuần.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    // ISSUE-9 FIX: Verify the week is actually auto-locked
    const weekDate = parseIsoDateLocal(canonicalWeekStart)
    if (!isWeekLocked(weekDate)) {
      return { success: false, error: 'Tuần này chưa bị khoá tự động.' }
    }

    const supabase = await createClient()
    const sb = supabase as any

    // ISSUE-5 FIX: Cross-month payroll guard
    const weekEndDate = new Date(weekDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const startMonth = weekDate.getMonth() + 1
    const startYear = weekDate.getFullYear()
    const endMonth = weekEndDate.getMonth() + 1
    const endYear = weekEndDate.getFullYear()

    let payrollFilter = `and(month.eq.${startMonth},year.eq.${startYear})`
    if (startMonth !== endMonth || startYear !== endYear) {
      payrollFilter += `,and(month.eq.${endMonth},year.eq.${endYear})`
    }
    const { data: confirmedPeriod } = await sb
      .from('payroll_periods')
      .select('id')
      .eq('branch_id', effectiveBranch)
      .eq('status', 'confirmed')
      .or(payrollFilter)
      .limit(1)
      .maybeSingle()
    if (confirmedPeriod) {
      return { success: false, error: 'Không thể mở khoá — bảng lương tháng này đã được xác nhận.' }
    }

    // Insert override row
    const { error } = await sb
      .from('attendance_locks')
      .insert({
        branch_id: effectiveBranch,
        week_start: canonicalWeekStart,
        locked_by: user.id,
        locked_at: new Date().toISOString(),
        is_override: true,
      })

    if (error) {
      // Already overridden — idempotent
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return { success: true }
      }
      throw error
    }

    // ISSUE-14 FIX: Audit log
    logAudit(user.id, user.email ?? '', 'attendance_lock_override', { branch_id: effectiveBranch, week_start: canonicalWeekStart })

    return { success: true }
  } catch (err) {
    console.error('[overrideAutoLock]', err)
    return { success: false, error: 'Không thể mở khoá tuần.' }
  }
}
```

### Step 8: Add `removeOverride()` action (for re-locking)

**File:** `lib/actions/attendance-lock-actions.ts`:

```typescript
export async function removeOverride(
  branchId: string,
  weekStartStr: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    const canRemove = user.role === 'admin' || user.role === 'branch_manager'
    if (!canRemove) return { success: false, error: 'Bạn không có quyền khoá lại tuần.' }

    const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId
    const canonicalWeekStart = toISODate(getWeekStart(parseIsoDateLocal(weekStartStr)))

    const supabase = await createClient()
    const sb = supabase as any

    const { error } = await sb
      .from('attendance_locks')
      .delete()
      .eq('branch_id', effectiveBranch)
      .eq('week_start', canonicalWeekStart)
      .eq('is_override', true)

    if (error) throw error

    // ISSUE-14 FIX: Audit log
    logAudit(user.id, user.email ?? '', 'attendance_override_removed', { branch_id: effectiveBranch, week_start: canonicalWeekStart })

    return { success: true }
  } catch (err) {
    console.error('[removeOverride]', err)
    return { success: false, error: 'Không thể khoá lại tuần.' }
  }
}
```

### Step 9: Update barrel export

**File:** `lib/actions/attendance-actions.ts`

```typescript
export { saveAttendanceBatch, lockWeek } from './attendance-save-actions'
export { unlockWeek, overrideAutoLock, removeOverride } from './attendance-lock-actions'
```

### Step 10: Update attendance page — pass role info

**File:** `app/(dashboard)/attendance/page.tsx`

Current state management (lines 34, 44-49): page fetches `isAdmin` and stores it. Need to also pass `userRole` to the grid.

Add `userRole` state:

```typescript
const [userRole, setUserRole] = useState<string>('')

// Update the useEffect (line 45-49):
useEffect(() => {
  getCurrentUser().then((user) => {
    if (user) {
      setUserRole(user.role)
      if (user.role === 'admin') setIsAdmin(true)
    }
  })
}, [])
```

Update the `fetchGrid` callback: remove the client-side `isWeekLocked()` merge (line 67-68). The server now returns the correct `isLocked` considering overrides.

```typescript
// Current (line 67-68):
const autoLocked = isWeekLocked(weekStart)
setData({ ...gridResult.data, isLocked: gridResult.data.isLocked || autoLocked })

// New:
setData(gridResult.data)
```

**Wait** — currently `getAttendanceGrid` does NOT check `isWeekLocked()` server-side. It only checks for `attendance_locks` row. The auto-lock is merged client-side at line 67-68.

After Phase 2, the server action will handle auto-lock + override logic. So the client merge must be removed. This is handled in Step 4 (server action now returns the correct combined `isLocked`).

Remove `isWeekLocked` from the page import:

```typescript
// Before:
import { getWeekStart, toISODate, isWeekLocked } from '@/lib/utils/date-helpers'
// After:
import { getWeekStart, toISODate } from '@/lib/utils/date-helpers'
```

Pass new props to `AttendanceGrid`:

```tsx
<AttendanceGrid
  initialRows={data.rows}
  branchId={branchId}
  weekStart={weekStart}
  isLocked={data.isLocked}
  lockType={data.lockType}
  hasOverride={data.hasOverride}
  userRole={userRole}
  onSaved={fetchGrid}
/>
```

### Step 11: Update `AttendanceGrid` component — Props + UI

**File:** `components/attendance/attendance-grid.tsx`

**11a. Update Props interface** (line 26-32):

```typescript
interface Props {
  initialRows: AttendanceGridRow[]
  branchId: string
  weekStart: Date
  isLocked: boolean
  lockType: 'manual' | 'auto' | null  // NEW
  hasOverride: boolean                  // NEW
  userRole: string                      // NEW
  onSaved: () => void
}
```

**11b. Add imports:**

```typescript
import { Lock, Unlock } from 'lucide-react'
import { unlockWeek, overrideAutoLock, removeOverride } from '@/lib/actions/attendance-actions'
```

Note: `Save` already imported; add `Unlock` icon.

**11c. Add unlock/override handlers** (after `handleLock` function, ~line 98):

```typescript
async function handleUnlock() {
  const msg = lockType === 'auto'
    ? 'Mở khoá tuần đã khoá tự động? Bạn sẽ có thể chỉnh sửa chấm công.'
    : 'Mở khoá tuần này? Bạn sẽ có thể chỉnh sửa chấm công.'
  if (!confirm(msg)) return
  setSaving(true)
  setError(null)
  const weekStartStr = toISODate(weekStart)
  let result: { success: boolean; error?: string }

  if (lockType === 'auto') {
    result = await overrideAutoLock(branchId, weekStartStr)
  } else {
    result = await unlockWeek(branchId, weekStartStr)
  }

  setSaving(false)
  if (!result.success) setError(result.error ?? 'Lỗi mở khoá tuần.')
  else onSaved()
}

async function handleRemoveOverride() {
  if (!confirm('Khoá lại tuần này?')) return
  setSaving(true)
  setError(null)
  const result = await removeOverride(branchId, toISODate(weekStart))
  setSaving(false)
  if (!result.success) setError(result.error ?? 'Lỗi khoá lại tuần.')
  else onSaved()
}
```

**11d. Update the locked state UI** (lines 160-176):

Replace the entire bottom section with a 3-state render:

```tsx
{/* UNLOCKED — show save + lock buttons */}
{!isLocked && (
  <div className="flex gap-2 items-center flex-wrap">
    <Button onClick={() => setDiffOpen(true)} disabled={dirty.size === 0} size="sm">
      <Save className="h-4 w-4 mr-1" />Lưu tuần ({dirty.size} thay đổi)
    </Button>
    <Button variant="outline" onClick={handleLock} size="sm">
      <Lock className="h-4 w-4 mr-1" />Khoá tuần
    </Button>
    {hasOverride && canUnlock && (
      <Button variant="destructive" onClick={handleRemoveOverride} size="sm">
        <Lock className="h-4 w-4 mr-1" />Khoá lại
      </Button>
    )}
    <span className="text-xs text-muted-foreground ml-1">Ctrl+S để lưu nhanh</span>
  </div>
)}

{/* LOCKED — show lock info + unlock button for admin/BM */}
{isLocked && (
  <div className="flex items-center gap-2 flex-wrap">
    <p className="text-sm text-destructive flex items-center gap-1">
      <Lock className="h-4 w-4" />
      {lockType === 'auto'
        ? 'Tuần này đã khoá tự động.'
        : 'Tuần này đã khoá, không thể chỉnh sửa.'}
    </p>
    {canUnlock && (
      <Button variant="outline" onClick={handleUnlock} size="sm" disabled={saving}>
        <Unlock className="h-4 w-4 mr-1" />Mở khoá
      </Button>
    )}
  </div>
)}
```

Where `canUnlock` is derived from props:

```typescript
// Inside the component, before the return:
const canUnlock = userRole === 'admin' || userRole === 'branch_manager'
```

### Step 12: ISSUE-3/4/10 FIX — Update office attendance module

**CRITICAL:** The office attendance module has identical lock patterns that MUST be updated.

**12a. `lib/actions/office-attendance-actions.ts` — `getOfficeAttendanceGrid()`**

Replace `.maybeSingle()` lock query (ISSUE-4: breaks with 2 rows) with multi-row query:

```typescript
// Replace: .maybeSingle() on attendance_locks
// With:
const { data: lockRows } = await sb
  .from('attendance_locks')
  .select('id, is_override')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', dateFrom)

const hasManualLock = (lockRows ?? []).some((r: { is_override: boolean }) => !r.is_override)
const hasOverride = (lockRows ?? []).some((r: { is_override: boolean }) => r.is_override)
const autoLocked = isWeekLocked(weekStart)
const isLocked = (autoLocked && !hasOverride) || hasManualLock
const lockType = hasManualLock ? 'manual' as const : (autoLocked ? 'auto' as const : null)
```

Update `OfficeGridData` return type to include `lockType`, `hasOverride`.

**12b. `lib/actions/office-attendance-actions.ts` — `saveOfficeAttendanceBatch()`**

Replace the lock check (same pattern as class attendance Step 5):
- Auto-lock check with override awareness
- Manual lock check with `is_override=false` filter
- Cross-month payroll guard (same as Step 5)

**12c. `app/(dashboard)/office-attendance/page.tsx`**

Remove client-side `isWeekLocked()` merge (same as Step 10 for class attendance):
```typescript
// Remove: import { isWeekLocked } from date-helpers
// Remove: const autoLocked = isWeekLocked(weekStart)
// Replace: setData({ ...gridResult.data, isLocked: gridResult.data.isLocked || autoLocked })
// With: setData(gridResult.data)
```

Add `userRole` state, pass `lockType`, `hasOverride`, `userRole` to `OfficeAttendanceGrid`.

**12d. `components/office-attendance/office-attendance-grid.tsx`**

Add same unlock/override button UI as class attendance grid (Step 11). Accept `lockType`, `hasOverride`, `userRole` props.

### Step 13: Verify build

```bash
npm run build
```

### Step 14: Run migration on Supabase Cloud

Execute `008_attendance_lock_override.sql` in the Supabase SQL Editor for project `btwwqeemwedtbnskjcem`.

## Todo List

- [ ] Create migration `008_attendance_lock_override.sql`
- [ ] Update `AttendanceLock` type in `database-schedule-types.ts`
- [ ] Update `AttendanceGridData` interface + `getAttendanceGrid()` in `attendance-query-actions.ts`
- [ ] Update `saveAttendanceBatch()` lock check + cross-month payroll guard
- [ ] Extract `attendance-lock-actions.ts` with `unlockWeek()`, `overrideAutoLock()`, `removeOverride()`
- [ ] `overrideAutoLock()` includes `isWeekLocked()` guard (ISSUE-9)
- [ ] `overrideAutoLock()` + `saveAttendanceBatch()` use cross-month payroll guard (ISSUE-5)
- [ ] All 3 lock actions include `logAudit()` calls (ISSUE-14)
- [ ] Update barrel export in `attendance-actions.ts`
- [ ] Update `attendance/page.tsx` — pass role, remove client-side auto-lock merge
- [ ] Update `attendance-grid.tsx` — Props, unlock button, lock type indicator
- [ ] ISSUE-3/4/10: Update `office-attendance-actions.ts` — multi-row lock query + override-aware save
- [ ] ISSUE-10: Update `office-attendance/page.tsx` — remove client-side `isWeekLocked()` merge
- [ ] ISSUE-3: Update `office-attendance-grid.tsx` — unlock/override button UI
- [ ] Run migration on Supabase Cloud
- [ ] Build passes
- [ ] Manual test: admin override auto-locked week, save, re-lock
- [ ] Manual test: same flow on office attendance page

## Validation Checklist

- [ ] Manual lock: admin locks → BM unlocks → grid editable (class + office)
- [ ] Manual lock: BM locks → BM unlocks → grid editable
- [ ] Auto-lock: week >3 days old → grid locked → admin clicks "Mở khoá" → grid editable
- [ ] Auto-lock override: BM overrides own branch week → saves attendance → re-locks
- [ ] Override on non-auto-locked week → error "Tuần này chưa bị khoá tự động" (ISSUE-9)
- [ ] Payroll guard: confirmed payroll month → override blocked with error message
- [ ] Payroll guard: cross-month week with one month confirmed → blocked (ISSUE-5)
- [ ] Payroll guard: confirmed payroll month → save blocked even if overridden
- [ ] BM cannot override other branch's week (effectiveBranch enforced)
- [ ] Existing manual locks still work (is_override=false default)
- [ ] Lock type shows correctly: "khoá tự động" vs "khoá thủ công"
- [ ] Office attendance grid: same unlock/override behavior as class grid (ISSUE-3/10)
- [ ] Audit log entries for override, unlock, remove_override (ISSUE-14)
- [ ] Build: `npm run build` — 0 errors

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| BM edits attendance after payroll confirmed | HIGH | Cross-month payroll guard in `saveAttendanceBatch`, `overrideAutoLock`, AND office save (ISSUE-5) |
| Dangling override row after manual re-lock | LOW | Leave both rows — manual lock takes precedence in lock state formula (ISSUE-7 documented) |
| Migration breaks UNIQUE constraint on existing data | LOW | No existing `is_override=true` rows. All get `DEFAULT false`. New constraint strictly wider. |
| File size: `attendance-save-actions.ts` | RESOLVED | Extracted to `attendance-lock-actions.ts` (ISSUE-12) |
| Dual-locked week (manual + auto) requires 2 unlocks | LOW | Documented as expected behavior — manual lock takes priority (ISSUE-8) |

## Security Considerations

- **Role enforcement:** All actions check `user.role` server-side. BM scoped to `user.branch_id`.
- **RLS:** Existing policies on `attendance_locks` unchanged. `is_override` is just a new column.
- **Payroll immutability:** Cross-month guard blocks both months. Cannot bypass via override.
- **Audit trail:** All override/unlock/remove actions logged via `logAudit()` (ISSUE-14).

## Review Issues Resolved

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | LOW | Office grid header not updated | Added to Phase 1 |
| 2 | MEDIUM | `lockWeek()` DEFAULT assumption | Documented in Step 6 |
| 3 | **HIGH** | Office attendance actions not updated | Added Step 12a-12d |
| 4 | **HIGH** | `.maybeSingle()` breaks with 2 rows | Multi-row query in Step 12a |
| 5 | **HIGH** | Cross-month payroll guard | `.or()` filter checking both months |
| 6 | MEDIUM | Pre-existing `unlockWeek` branchId bug | Fixed in Step 6a code |
| 7 | MEDIUM | Concurrent lock/override ambiguity | Documented: manual lock takes precedence |
| 8 | MEDIUM | Dual-locked needs 2 unlocks | Documented as expected UX |
| 9 | MEDIUM | Override on non-auto-locked week | `isWeekLocked()` guard in Step 7 |
| 10 | MEDIUM | Office attendance page not updated | Added Step 12c-12d |
| 11 | MEDIUM | Diacritics self-correction | Removed confusing block |
| 12 | MEDIUM | File exceeds 200-line limit | Extracted `attendance-lock-actions.ts` |
| 14 | LOW | Override actions not audit-logged | `logAudit()` in all 3 actions |
