# Plan Review: Attendance Grid UX Improvements

**Date:** 2026-03-13
**Reviewer:** code-reviewer (adversarial)
**Plan:** `plans/260313-attendance-grid-ux-improvements/`
**Phases:** 2 (Calendar Dates in Header + Unlock Override)

---

## Phase 1: Calendar Dates in Header

**Verdict: APPROVE** -- Straightforward, correct, minimal risk.

### ISSUE-1: [LOW] Office attendance grid not updated

**File:** `phase-01-calendar-dates-header.md`
**Problem:** The plan only modifies `components/attendance/attendance-grid.tsx` (class-based attendance). The office attendance grid (`components/office-attendance/office-attendance-grid.tsx`, line 99-101) has the identical header pattern showing only day names without dates. After Phase 1, the two grids will be visually inconsistent -- class attendance shows dates, office attendance does not.
**Fix:** Add the same DD/MM formatting to `office-attendance-grid.tsx` lines 99-101 (identical pattern: `DAYS.map((d) => <th>{getDayName(d)}</th>)`). 3-minute extra effort.

No other issues found in Phase 1. The plan correctly identifies `weekDates[d-1]`, `getWeekDates()` is already imported, and `w-10` is sufficient.

---

## Phase 2: Unlock Override

### ISSUE-2: [HIGH] UNIQUE constraint `(branch_id, week_start, is_override)` allows duplicate manual locks

**File:** `phase-02-unlock-override.md`, Step 1 (migration)
**Problem:** The proposed UNIQUE constraint `(branch_id, week_start, is_override)` means: one row where `is_override=false` and one where `is_override=true` per (branch, week). This is correct for the intended semantics. HOWEVER, `is_override` is a BOOLEAN -- there are only two possible values. The concern is that the UNIQUE constraint uses a boolean as a discriminator, which works correctly but is semantically unusual. More critically, if someone inserts a second `is_override=false` row (e.g., two BMs lock the same week concurrently), the constraint will correctly prevent it. This is fine.

**ACTUAL HIGH ISSUE:** The plan says to change `lockWeek()` (Step 6 context) but **does NOT show the updated `lockWeek()` code**. The existing `lockWeek()` does NOT set `is_override` in the INSERT (line 121). After migration adds `is_override BOOLEAN NOT NULL DEFAULT false`, the existing `lockWeek()` will still work because `DEFAULT false` covers it. But the plan should explicitly document this assumption. If `lockWeek()` is not updated, when `unlockWeek()` adds `.eq('is_override', false)` filter, it will only delete rows where `is_override=false` -- which is correct because `lockWeek()` inserts with default `false`. This is actually fine.

**Downgrading to MEDIUM -- the assumption is correct but undocumented.** Add a note that `lockWeek()` relies on `DEFAULT false` and needs no code change.

### ISSUE-3: [HIGH] Office attendance actions NOT updated -- override bypass

**File:** `phase-02-unlock-override.md`, File Change Summary table
**Problem:** The plan does NOT mention updating `lib/actions/office-attendance-actions.ts`. This file has its own `saveOfficeAttendanceBatch()` with the same lock check pattern (lines 138-149):
```typescript
if (isWeekLocked(normalizedWeekStart)) {
  return { success: false, error: '...' }
}
const { data: lockRow } = await sb
  .from('attendance_locks').select('id')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', normalizedWeekStartStr)
  .maybeSingle()
if (lockRow) { return { success: false, error: '...' } }
```
After Phase 2, if admin overrides auto-lock on class attendance, they can edit class attendance BUT office attendance on the same week will remain blocked because `saveOfficeAttendanceBatch` still calls `isWeekLocked()` without checking for override rows. This is inconsistent behavior.

Additionally, `getOfficeAttendanceGrid()` (line 80-85) uses `.maybeSingle()` which will break when two rows exist (manual lock + override). `.maybeSingle()` returns error if multiple rows found.

**Fix:** Either:
1. Update `office-attendance-actions.ts` with the same override-aware lock check pattern, OR
2. Extract a shared `checkLockState(sb, branchId, weekStartStr)` helper used by both action files

### ISSUE-4: [HIGH] `getOfficeAttendanceGrid` uses `.maybeSingle()` -- breaks with 2 rows

**File:** `phase-02-unlock-override.md` (missing from plan)
**Problem:** `office-attendance-actions.ts` line 80-85:
```typescript
const { data: lockData } = await sb
  .from('attendance_locks')
  .select('id')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', dateFrom)
  .maybeSingle()
```
After migration changes the UNIQUE constraint, it becomes possible to have TWO rows for the same `(branch_id, week_start)` -- one with `is_override=false` and one with `is_override=true`. `.maybeSingle()` will error (or return null depending on Supabase version) when multiple rows exist. This will break the office attendance grid query.

The plan correctly updates `getAttendanceGrid()` in `attendance-query-actions.ts` (Step 4) to use a multi-row query. But it does NOT update the office attendance equivalent.

**Fix:** Update `getOfficeAttendanceGrid()` to use the same multi-row lock query pattern as the updated `getAttendanceGrid()`.

### ISSUE-5: [HIGH] Payroll guard uses `weekStart` month -- cross-month weeks mismatched

**File:** `phase-02-unlock-override.md`, Step 5 (payroll guard in `saveAttendanceBatch`)
**Problem:** The payroll guard derives month from `normalizedWeekStart.getMonth() + 1`:
```typescript
const weekMonth = normalizedWeekStart.getMonth() + 1
const weekYear = normalizedWeekStart.getFullYear()
```
A week starting Monday 2026-02-23 contains dates in both February AND March (Feb 23-Mar 01). If payroll for March is confirmed but February is not, saving attendance for this cross-month week would check February (month of Monday) and allow it -- even though some attendance dates fall in the confirmed March payroll period.

Conversely, a week starting Monday 2026-03-30 includes April dates. If March payroll is confirmed, saving is blocked for the entire week, even though some dates (Mar 30, 31) are in the unconfirmed April period.

**Fix:** The guard should check BOTH months if the week spans a month boundary:
```typescript
const weekEnd = new Date(normalizedWeekStart)
weekEnd.setDate(weekEnd.getDate() + 6)
const startMonth = normalizedWeekStart.getMonth() + 1
const startYear = normalizedWeekStart.getFullYear()
const endMonth = weekEnd.getMonth() + 1
const endYear = weekEnd.getFullYear()

// Check both months if week crosses month boundary
const { data: confirmedPeriod } = await sb
  .from('payroll_periods')
  .select('id')
  .eq('branch_id', effectiveBranch)
  .eq('status', 'confirmed')
  .or(`and(month.eq.${startMonth},year.eq.${startYear}),and(month.eq.${endMonth},year.eq.${endYear})`)
  .limit(1)
  .maybeSingle()
```

Alternatively, if the business rule is "block if ANY day falls in a confirmed payroll month", the simpler approach is correct but should be documented as "blocks entire week if the Monday's month is confirmed."

### ISSUE-6: [HIGH] `unlockWeek` existing bug: uses raw `branchId` instead of `effectiveBranch`

**File:** `phase-02-unlock-override.md`, Step 6
**Problem:** The EXISTING code at line 160 has a bug: `unlockWeek()` uses the raw `branchId` parameter directly (`.eq('branch_id', branchId)`) instead of computing `effectiveBranch` like all other actions do. This means an admin could pass any branchId and it works correctly, BUT if the plan now allows BM to call `unlockWeek()`, the BM can pass a different branch's ID as the `branchId` parameter and delete locks from other branches.

The plan's Step 6 code DOES fix this by adding `const effectiveBranch = user.role === 'branch_manager' ? user.branch_id! : branchId`. Good -- the plan correctly addresses this pre-existing bug.

**However**, the plan should explicitly call this out as a pre-existing bug being fixed, for the reviewer/implementer's awareness.

**Downgrading to MEDIUM** -- plan's code does fix it, but should document it.

### ISSUE-7: [MEDIUM] Race condition: concurrent override + manual lock

**File:** `phase-02-unlock-override.md`, Architecture section
**Problem:** Consider this race:
1. BM-A clicks "Mo khoa" on auto-locked week (calls `overrideAutoLock`)
2. BM-A starts editing attendance
3. BM-B (or same BM in another tab) clicks "Khoa tuan" (calls `lockWeek`)
4. `lockWeek` inserts `is_override=false` row -- succeeds (UNIQUE allows it alongside `is_override=true`)
5. BM-A clicks "Save" -- `saveAttendanceBatch` checks manual lock -- finds `is_override=false` row -- BLOCKS save

This is actually the correct behavior (manual lock takes precedence). The plan's lock state formula `isLocked = (autoLocked AND NOT hasOverride) OR hasManualLock` correctly captures this. BM-A's unsaved changes are lost, which is expected.

**However**, the plan mentions "Delete override row when manual lock is applied" as mitigation for "Dangling override row" (Risk table), but the `lockWeek()` code is NOT modified to delete the override row. The plan says "OR leave both rows (harmless since manual lock takes precedence)" which is acceptable.

**Verdict:** No code bug, but the plan should pick one approach (leave both vs. cleanup) and document it explicitly. Currently ambiguous.

### ISSUE-8: [MEDIUM] `lockType` is wrong when both manual lock AND auto-lock are active

**File:** `phase-02-unlock-override.md`, Step 4
**Problem:** Lock type resolution:
```typescript
const lockType = hasManualLock ? 'manual' : (autoLocked ? 'auto' : null)
```
When a week is BOTH auto-locked AND manually locked, `lockType` returns `'manual'`. This means the UI shows "Tuan nay da khoa" (manual lock message) and the unlock button calls `unlockWeek()` which only deletes the `is_override=false` row. After unlocking, the week is still locked because `isWeekLocked()` returns true and there's no override row.

The user would need to click unlock again (this time `lockType` would be `'auto'`, triggering `overrideAutoLock`). Two-click unlock is confusing UX.

**Fix:** When both are active, unlock should handle both in sequence, OR the UI should show both states and let user decide. At minimum, document this as expected two-step behavior.

### ISSUE-9: [MEDIUM] `overrideAutoLock` does not verify `isWeekLocked()` is true

**File:** `phase-02-unlock-override.md`, Step 7
**Problem:** `overrideAutoLock()` does not check `isWeekLocked(weekStart)` before inserting the override row. If called on a non-auto-locked week, it inserts a useless override row. While harmless (it's idempotent and doesn't break anything), it creates confusing data.

**Fix:** Add a guard:
```typescript
const weekDate = parseIsoDateLocal(canonicalWeekStart)
if (!isWeekLocked(weekDate)) {
  return { success: false, error: 'Tuan nay chua bi khoa tu dong.' }
}
```

### ISSUE-10: [MEDIUM] Client-side `isWeekLocked` removed from attendance page but NOT from office attendance page

**File:** `phase-02-unlock-override.md`, Step 10
**Problem:** Plan removes `isWeekLocked` from `app/(dashboard)/attendance/page.tsx` import (Step 10, line 451-458) because the server now handles it. But `app/(dashboard)/office-attendance/page.tsx` (line 17, 47-48) also uses the same client-side `isWeekLocked` merge pattern. The plan does not touch this file at all.

After Phase 2, class attendance uses server-side override-aware lock resolution, but office attendance still uses client-side `isWeekLocked()` without override awareness. The two pages will have inconsistent lock behavior.

**Fix:** Update office-attendance page to also rely on server-side lock resolution.

### ISSUE-11: [MEDIUM] `saveAttendanceBatch` payroll guard missing from `lockWeek` and `overrideAutoLock` error messages contain non-diacritical Vietnamese

**File:** `phase-02-unlock-override.md`, Step 5
**Problem:** The plan initially writes error strings WITHOUT diacritics, then self-corrects. The final code in Step 5 shows corrected diacritics. However, the self-correction pattern may confuse the implementer about which strings to use. The code block at line 202-227 shows non-diacritical strings, then the correction at line 249-253 shows diacritical strings.

**Fix:** Remove the non-diacritical code block entirely. Only show the final corrected version. Otherwise an implementer copy-pasting the first code block gets wrong strings.

### ISSUE-12: [MEDIUM] File size: `attendance-save-actions.ts` will exceed 200 lines

**File:** `phase-02-unlock-override.md`, Risk table
**Problem:** Current file is 170 lines. Adding `overrideAutoLock()` (~35 lines), `removeOverride()` (~25 lines), and expanding `saveAttendanceBatch()` lock check (~15 extra lines) = ~245 lines. This exceeds the project's 200-line file limit per `development-rules.md`.

The plan acknowledges this in the Risk table but defers to "check after implementation." Per project rules, the plan should include the extraction step as part of implementation, not as a post-hoc cleanup.

**Fix:** Plan Step 8.5: Extract `overrideAutoLock`, `removeOverride`, `unlockWeek` into `attendance-lock-actions.ts`. Update barrel export accordingly.

### ISSUE-13: [LOW] Migration file numbering: `008` but only `000`-`007` exist

**File:** `phase-02-unlock-override.md`, Step 1
**Problem:** Existing migrations are `000_reset_database.sql` through `007_payslip_audit_logs.sql`. The plan creates `008_attendance_lock_override.sql`. This is correct numbering. No issue.

**Non-issue, removed.**

### ISSUE-14: [LOW] Missing audit log entries for override/unlock

**File:** `phase-02-unlock-override.md`, Next Steps
**Problem:** The plan mentions "Consider adding audit log entries for override/unlock actions" as a future step. Given that override bypasses a safety mechanism (auto-lock), audit logging should be part of the implementation, not deferred. The project already has `logAudit()` as a fire-and-forget utility.

**Fix:** Add `logAudit(user.id, user.email, 'attendance_lock_override', ...)` calls to `overrideAutoLock`, `removeOverride`, and updated `unlockWeek`. Low effort (~3 lines each).

### ISSUE-15: [LOW] `handleUnlock` in grid component uses `branchId` from props -- could be empty for admin

**File:** `phase-02-unlock-override.md`, Step 11c
**Problem:** `handleUnlock()` calls `overrideAutoLock(branchId, weekStartStr)`. The `branchId` is a prop passed from the page. For admin users, `branchId` comes from the branch selector state. If the selector somehow resets (e.g., React state loss on re-render), `branchId` could be empty. The server action would then use the empty string as `branchId` for admin (since admin falls through to the raw `branchId` param in `effectiveBranch` computation).

This is a pre-existing pattern across all actions (admin always passes branchId from selector). The defense is that the page does not render the grid until `branchId` is selected (line 53-54 guard). So this is a theoretical, not practical, risk.

**No fix needed** -- pre-existing pattern with existing guard.

---

## Summary Table

| Issue | Severity | Category | Status |
|-------|----------|----------|--------|
| ISSUE-1 | LOW | Consistency | Office grid header not updated |
| ISSUE-2 | MEDIUM | Documentation | `lockWeek()` DEFAULT assumption undocumented |
| ISSUE-3 | **HIGH** | Completeness | `office-attendance-actions.ts` not updated for override |
| ISSUE-4 | **HIGH** | Bug | `.maybeSingle()` breaks with 2 lock rows in office grid |
| ISSUE-5 | **HIGH** | Logic | Cross-month week payroll guard mismatch |
| ISSUE-6 | MEDIUM | Security (pre-existing) | `unlockWeek` raw branchId bug -- fixed by plan |
| ISSUE-7 | MEDIUM | Race condition | Concurrent lock/override behavior ambiguous |
| ISSUE-8 | MEDIUM | UX | Dual-locked week requires 2 unlocks |
| ISSUE-9 | MEDIUM | Validation | Override on non-auto-locked week not guarded |
| ISSUE-10 | MEDIUM | Consistency | Office attendance page not updated |
| ISSUE-11 | MEDIUM | Code quality | Confusing diacritics self-correction in plan |
| ISSUE-12 | MEDIUM | Standards | File exceeds 200-line limit |
| ISSUE-14 | LOW | Audit | Override actions not audit-logged |

---

## Verdict: **REVISE**

Three HIGH issues must be fixed before implementation:

1. **ISSUE-3 + ISSUE-4 + ISSUE-10:** The plan completely misses `office-attendance-actions.ts` and `office-attendance/page.tsx`. The override feature will be inconsistent across the two attendance modules, and the `.maybeSingle()` call in the office grid query will break when both a manual lock and override row exist. These three issues are one cohesive gap.

2. **ISSUE-5:** The payroll guard's month derivation from `weekStart` is incorrect for cross-month boundary weeks. This needs a clear business decision + implementation.

### Required Revisions Before Implementation

1. Add `office-attendance-actions.ts` and `office-attendance/page.tsx` to the File Change Summary. Apply the same override-aware lock check pattern to `saveOfficeAttendanceBatch()` and `getOfficeAttendanceGrid()`.

2. Decide and document payroll guard behavior for cross-month weeks. Either:
   - Check both months (stricter: block if either month confirmed)
   - Document that only Monday's month is checked (simpler but has edge case)

3. Add `office-attendance-grid.tsx` to Phase 1 for DD/MM header consistency.

4. Plan the file extraction (`attendance-lock-actions.ts`) as part of implementation, not deferred.

5. Add `logAudit()` calls to override/unlock actions.

6. Clean up the diacritics confusion in Step 5 code blocks.

---

*Reviewed by: code-reviewer agent | 2026-03-13*
