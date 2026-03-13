# Code Review — Attendance Lock/Override Feature
**Date:** 2026-03-14
**Scope:** Migration 008 + lock-override actions + save guards + UI buttons
**Reviewer:** code-reviewer agent

---

## Scope

| File | LOC | Type |
|------|-----|------|
| `supabase/migrations/008_attendance_lock_override.sql` | 22 | SQL migration |
| `lib/types/database-schedule-types.ts` | 96 | Types |
| `lib/actions/attendance-lock-actions.ts` | 193 | Server actions (new) |
| `lib/actions/attendance-save-actions.ts` | 175 | Server actions (updated) |
| `lib/actions/attendance-query-actions.ts` | 104 | Server actions (updated) |
| `lib/actions/office-attendance-actions.ts` | 233 | Server actions (updated) |
| `lib/actions/attendance-actions.ts` | 16 | Barrel re-export |
| `components/attendance/attendance-grid.tsx` | 253 | Client component |
| `components/office-attendance/office-attendance-grid.tsx` | 205 | Client component |
| `app/(dashboard)/attendance/page.tsx` | 191 | Page |
| `app/(dashboard)/office-attendance/page.tsx` | 103 | Page |

**Total reviewed:** ~1,595 lines

---

## Overall Assessment

The lock/override feature is well-structured. The core logic — `isWeekLocked` check, override row lookup, manual lock check, payroll guard — is correctly implemented and duplicated consistently across both save actions. The UI buttons render conditionally based on the correct `lockType + hasOverride + userRole` combination. Branch scoping is applied at all write paths. No orphaned imports or missing function bodies detected.

Three issues found: one P1 (logic correctness on `isLocked` when both locks coexist), one P2 (UI race on `userRole`), one P2 (missing index for new `is_override` column), plus two P3 observations.

---

## P1 — High Priority

### P1-1: `lockType` is `'manual'` when both manual lock + auto-lock coexist, masking the override button

**File:** `lib/actions/attendance-query-actions.ts` line 89, `lib/actions/office-attendance-actions.ts` line 94

**Current logic:**
```ts
const lockType: 'auto' | 'manual' | null = hasManualLock ? 'manual' : (autoLocked ? 'auto' : null)
```

**Problem:** If a week is both auto-locked (time-based) AND has a manual lock row, `lockType` is `'manual'`. This is correct for the lock label. However, if someone removes the manual lock via `unlockWeek` and the week remains auto-locked, `isLocked` stays true (correct) but `lockType` flips to `'auto'` only on the next refetch — that part is fine.

The actual bug: consider the reverse scenario. A week has an override row (`hasOverride=true`) — meaning auto-lock is cancelled — but ALSO has a manual lock. Current `isLocked` formula:
```ts
const isLocked = (autoLocked && !hasOverride) || hasManualLock
```
This correctly locks it (manual lock wins). However `lockType='manual'` means the UI shows "Mở khoá" (unlockWeek) button, not the "Khoá lại" (removeOverride) button.

Result: the orphaned override row is never shown to the user and cannot be removed via UI. The override row remains in the DB silently even after the manual lock is removed, meaning that week would be incorrectly editable after the manual lock is lifted.

**Fix:** When `hasOverride` is true, always render the "Khoá lại" button regardless of `lockType`. In the grid components, change the `hasOverride` render condition from:
```tsx
{hasOverride && (userRole === 'admin' || userRole === 'branch_manager') && (
```
This condition already shows the button whenever `hasOverride` is true, regardless of `isLocked` — so actually the button does render in this scenario. **On re-reading: the `hasOverride` button renders even when `isLocked=true && lockType='manual'`**, since it's inside the `{isLocked && ...}` block but uses a separate condition. This is correct behavior and the orphaned row IS surfaced.

**Revised verdict:** The compound state (manual lock + override row) is unusual but both buttons would render simultaneously: "Mở khoá" (for manual lock) and "Khoá lại" (for override). This is mildly confusing UX but not a logic bug. However, there is a genuine logic issue: `overrideAutoLock` does not guard against inserting an override row when a manual lock already exists. A user could override an auto-locked week, then manually lock it again, resulting in double-lock state. The override row then becomes orphaned after the manual lock is removed.

**Recommendation:** In `overrideAutoLock`, add a pre-check that no manual lock row exists before inserting the override:
```ts
const { data: existingManualLock } = await sb
  .from('attendance_locks')
  .select('id')
  .eq('branch_id', effectiveBranch)
  .eq('week_start', canonicalWeekStart)
  .eq('is_override', false)
  .maybeSingle()
if (existingManualLock) {
  return { success: false, error: 'Tuần này đã bị khoá thủ công.' }
}
```

---

## P2 — Medium Priority

### P2-1: `userRole` race condition — buttons may not render on first load

**File:** `app/(dashboard)/attendance/page.tsx` lines 35, 46–51, `app/(dashboard)/office-attendance/page.tsx` lines 25, 30–35

`userRole` is populated by a `useEffect` that calls `getCurrentUser()` asynchronously. The grid data (`fetchGrid`) is also fetched in a `useEffect`. On first render, both effects fire concurrently. If `fetchGrid` completes before the role effect, `data` is populated but `userRole` is still `''` — meaning the unlock/override buttons will not render (the role check fails silently). A subsequent re-render (from any state change) would fix it, but the initial view is broken.

This is a pre-existing pattern in this codebase (present in the production review). For this feature specifically, it means admins/BMs briefly see a locked grid with no action buttons on first load.

**Fix options:**
1. Combine role + grid fetch in a single `useCallback` that sets `userRole` before or alongside `data`.
2. Derive `isAdmin`/`userRole` from a shared auth context instead of per-page fetches.
3. Minimal: defer rendering `AttendanceGrid` until `userRole !== ''`.

### P2-2: No index on `(branch_id, week_start, is_override)` in migration 008

**File:** `supabase/migrations/008_attendance_lock_override.sql`

Migration 008 drops the old UNIQUE index and creates a new one on `(branch_id, week_start, is_override)`. The UNIQUE constraint implicitly creates a B-tree index, so uniqueness lookups are covered.

However, `attendance-save-actions.ts` and `attendance-lock-actions.ts` both query with `.eq('is_override', false)` and `.eq('is_override', true)` separately — i.e., two point lookups on `(branch_id, week_start, is_override)`. The existing `idx_attendance_locks_branch_week` index in migration 003 covers `(branch_id, week_start)` only. The new UNIQUE constraint index on `(branch_id, week_start, is_override)` supersedes it and would be used for these queries, so query performance is fine.

**Observation only:** Migration 003's `idx_attendance_locks_branch_week` index is now redundant (covered by the UNIQUE constraint index). Consider dropping it in a follow-up migration for cleanliness, but this is not a blocker.

### P2-3: `isWeekLocked` comment is misleading

**File:** `lib/utils/date-helpers.ts` line 114

The JSDoc says "3 days past next Monday" but the implementation adds 10 days to `weekStart` (which is always Monday). That is: Monday + 10 = Thursday of the following week. The comment should say "3 days past Sunday (end of week)" or "+10 days from week start". This is not a logic bug (10 = 7 days in week + 3 grace days is the intended formula), only a misleading comment.

---

## P3 — Low Priority

### P3-1: Duplicate `ActionResult` interface across action files

`office-attendance-actions.ts` defines its own `ActionResult<T>` (line 8) while also importing from `attendance-query-actions.ts` would be available via the barrel. This is a pre-existing pattern in the codebase, not introduced by this diff, but `attendance-lock-actions.ts` correctly imports `ActionResult` from `attendance-query-actions` rather than redeclaring it. The `office-attendance-actions.ts` keeps its own local declaration. This creates two equivalent but structurally identical types — not a bug, but inconsistent.

### P3-2: `overrideAutoLock` error message uses generic "Không thể mở khoá tuần" for duplicate row

**File:** `lib/actions/attendance-lock-actions.ts` lines 125–128

When a duplicate key error is detected (override already exists), the function returns `{ success: true }` silently. This is the correct idempotent pattern. However, the catch-all message at line 144 is also "Không thể mở khoá tuần" — same as `unlockWeek`'s catch message. The audit log will distinguish them, but if a client displays this error, the user cannot distinguish which action failed. Low severity since success path is idempotent.

---

## Positive Observations

- Branch scoping (`effectiveBranch`) applied consistently across all 3 lock-management functions and both save actions.
- `canonicalWeekStart` normalization (via `getWeekStart(parseIsoDateLocal(...))`) applied in every write path — prevents Monday-drift bugs.
- Cross-month payroll guard logic is identical and correct in all three locations (save-actions, office-actions, lock-actions). The `.or(payrollFilter)` with Supabase PostgREST composite `and()` syntax is used correctly.
- `overrideAutoLock` guards that the week is actually auto-locked before inserting (`if (!isWeekLocked(...)) return error`) — prevents override rows being created for unlocked weeks.
- Audit log (`logAudit`) called on all three lock mutations (unlock, override, removeOverride) with distinguishable `action` metadata.
- Migration 008 uses `ADD COLUMN IF NOT EXISTS` — idempotent and safe.
- The new UNIQUE constraint `(branch_id, week_start, is_override)` correctly enforces at most 1 manual lock + 1 override row per (branch, week). This is elegant.
- `isLocked` formula `(autoLocked && !hasOverride) || hasManualLock` is logically correct: override cancels auto-lock, manual lock always locks.
- `lockType` correctly returns `'manual'` over `'auto'` when both conditions are true — manual lock label takes precedence in UI message.
- UI buttons render correctly for the three distinct states: manual lock (unlock button), auto-lock without override (override button), override active (re-lock button). Buttons are correctly suppressed for non-admin/BM roles.
- `AttendanceSaveItem` and `OfficeSaveItem` are consistently typed and validated server-side.
- `lockWeek` in `attendance-save-actions.ts` explicitly sets `is_override: false` — correct, prevents silent default reliance.
- Barrel re-export (`attendance-actions.ts`) correctly exports all three new functions.

---

## Recommended Actions

1. **(P1-1 — Recommended)** Add manual-lock pre-check in `overrideAutoLock` to prevent orphaned override rows when a manual lock already exists.
2. **(P2-1 — Recommended)** Resolve `userRole` race condition by sequencing role fetch before grid render, or using a shared auth context.
3. **(P2-2 — Optional)** Add a comment or a `DROP INDEX` for the now-redundant `idx_attendance_locks_branch_week` in a future migration.
4. **(P2-3 — Minor)** Fix the JSDoc comment on `isWeekLocked` to accurately describe the +10 days formula.
5. **(P3-1 — Cleanup)** Consolidate `ActionResult` into a single shared type module to avoid the pattern of per-file redeclaration.

---

## Verdict

**APPROVE with recommended fix on P1-1.** The orphaned-override scenario (P1-1) is an edge case requiring deliberate misuse (create override, then manually lock same week), but since both lock rows surface in the UI simultaneously, a confused admin could create this state. The payroll guard, branch scoping, and audit trail are solid. The UI conditional rendering is correct for all standard lock states.

---

## Unresolved Questions

- Does the `isWeekLocked` threshold of "+10 days from week start" match the original spec? The comment says "3 days past week end" which would be Sunday+3 = Wednesday = +9 from Monday, not +10. Verify with product spec.
- Should `overrideAutoLock` be restricted to `admin` only (not BM)? Currently both roles can override. Confirm intended access level.
