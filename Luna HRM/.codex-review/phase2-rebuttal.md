All 7 issues have been addressed. Here is a summary of the fixes applied:

**ISSUE-1 (CRITICAL — lock not enforced server-side):**
Fixed in both `saveAttendanceBatch` (attendance-actions.ts) and `saveOfficeAttendanceBatch` (office-attendance-actions.ts). Each write action now:
1. Calls `isWeekLocked(weekStart)` to reject auto-locked weeks
2. Queries `attendance_locks` table and rejects if a manual lock row exists
No write can proceed on a locked week regardless of UI state.

**ISSUE-2 (CRITICAL — auto-filled "1" never persisted):**
Fixed in `attendance-grid.tsx`. Added `buildUnpersistedItems()` that collects all scheduled cells with `isScheduled=true`, `status != null`, and `existingId === null`. Before calling `lockWeek()`, the grid now calls `saveAttendanceBatch(branchId, weekStartStr, unpersisted)` first to flush defaults. If this pre-save fails, the lock is aborted with an error shown to the user.

**ISSUE-3 (CRITICAL — no employee/schedule ownership validation):**
Fixed in three places:
- `saveAttendanceBatch`: Verifies all referenced `schedule_id` values belong to `effectiveBranch` via a SELECT before upsert.
- `saveOfficeAttendanceBatch`: Verifies all referenced `employee_id` values exist in `effectiveBranch` with `position='office'`.
- `createClassSchedule` and `updateClassSchedule`: Verify `teacher_id` and `assistant_id` belong to the same branch and are active before insert/update.

**ISSUE-4 (HIGH — branchId="" inconsistency for admin):**
Fixed in both attendance pages (`/attendance` and `/office-attendance`). Admin role is now detected via `getCurrentUser()` on mount. If `isAdmin` is true and no branch is selected, a branch selector (new `BranchSelector` component using `getBranches()`) is shown and data load is gated behind a valid `branchId`. BM still derives branch from JWT server-side as before.

**ISSUE-5 (HIGH — timezone-unsafe date keys):**
Fixed in `lib/utils/date-helpers.ts`. `toISODate()` now uses local year/month/day components instead of `toISOString().split('T')[0]` which produced UTC dates. This prevents the midnight UTC shift that would move Vietnam (UTC+7) dates backward by one day. Also fixed the same pattern in `attendance-grid-service.ts` which was using `toISOString()` directly in `buildRow`.

**ISSUE-6 (HIGH — staff reassignment orphans historical attendance):**
Fixed in `updateClassSchedule`. When `teacher_id` or `assistant_id` is being changed, the action now queries `attendance` for a count of existing records for that `schedule_id`. If count > 0, the update is rejected with a clear Vietnamese error message instructing the user to create a new schedule instead.

**ISSUE-7 (MEDIUM — N+1 updates, non-idempotent saves):**
Fixed in both `saveAttendanceBatch` and `saveOfficeAttendanceBatch`. Replaced the separate insert + per-row update loop with a single `.upsert(rows, { onConflict: ... })` call. Conflict keys: `schedule_id,employee_id,date` for class attendance; `employee_id,date` for office attendance. `existingId` field removed from both `AttendanceSaveItem` and `OfficeSaveItem` as it's no longer needed.

**Build status:** `npm run build` passes cleanly (13 routes, 0 TypeScript errors).
