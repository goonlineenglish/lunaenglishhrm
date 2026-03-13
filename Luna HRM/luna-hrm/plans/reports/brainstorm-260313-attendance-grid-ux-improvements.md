# Brainstorm: Attendance Grid UX Improvements

**Date:** 2026-03-13
**Scope:** 2 features — calendar dates in header + unlock override

---

## Feature 1: Calendar Dates in Grid Header

### Problem
Grid header shows only day names (T2, T3, T4...). Users must mentally map which actual date each column represents.

### Solution
Add actual date (DD/MM) below day name in each `<th>`:
```
T2      T3      T4      T5      T6      T7      CN
10/03   11/03   12/03   13/03   14/03   15/03   16/03
```

### Impact
- 1 file: `attendance-grid.tsx` (lines 130-132)
- `getWeekDates(weekStart)` already available — just format + render
- ~5 lines changed

---

## Feature 2: Unlock Attendance (Admin + BM Override)

### Problem
Two lock layers exist:
1. **Manual lock** — BM/Admin bấm "Khoá tuần" → insert `attendance_locks`
2. **Auto-lock** — `isWeekLocked()` after 3 days grace → no override possible

Current unlock: Admin-only, manual lock only. No one can override auto-lock.

### Requirements (User Confirmed)
- Admin + BM can unlock (BM scoped to own branch)
- Auto-lock overridable by Admin/BM
- Re-lockable after override

### Solution: `is_override` Column

Add `is_override BOOLEAN DEFAULT false` to `attendance_locks`.

**Lock state logic:**
```
hasOverride = attendance_locks row with is_override=true exists
hasManualLock = attendance_locks row with is_override=false exists
autoLocked = isWeekLocked(weekStart) — unchanged

isLocked = (autoLocked AND NOT hasOverride) OR (hasManualLock)
```

**Actions:**
- `overrideAutoLock(branchId, weekStartStr)` → insert `attendance_locks(is_override=true)`
- `unlockWeek()` → allow admin + branch_manager (not admin-only)
- `lockWeek()` → unchanged (admin/BM can lock)
- `saveAttendanceBatch()` → check new combined lock logic

**UI:**
- When locked (auto or manual): show "Mở khóa" button for admin/BM
- When unlocked via override: show "Khóa lại" button
- Visual indicator: distinguish auto-lock vs manual-lock

### Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/008_attendance_lock_override.sql` | ADD COLUMN `is_override` |
| `attendance-save-actions.ts` | New `overrideAutoLock()`, update `unlockWeek()` role guard, update save lock check |
| `attendance-query-actions.ts` | Return override status in grid data |
| `attendance-grid.tsx` | Calendar dates + unlock button for admin/BM |
| `date-helpers.ts` | No change (isWeekLocked stays as utility) |

### Risk
- BM unlocks old week, edits attendance → affects confirmed payroll. Mitigation: check if payroll period is confirmed before allowing save.
- Override row left dangling after re-lock. Mitigation: delete override row when manual lock applied.

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Show DD/MM under day name | Minimal change, high UX value |
| 2 | Auto-lock overridable | Admin/BM need flexibility for late corrections |
| 3 | Admin + BM can unlock | BM manages own branch day-to-day |
| 4 | `is_override` column | Reuse existing table, simple boolean flag, no new table |
| 5 | Payroll confirm guard | Prevent editing attendance after payroll confirmed |
