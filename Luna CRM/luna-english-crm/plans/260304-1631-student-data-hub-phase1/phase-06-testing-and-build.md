# Phase 6: Testing & Build Validation

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: All previous phases complete

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Automated tests for sync conflict logic, build validation, migration deployment, end-to-end verification

## Implementation Steps

### 1. Automated Tests for Sync Conflict Logic
Create `tests/google-sheets-sync-conflict.test.ts`:

**Test cases:**
- `diffRows()` — same-field conflict: both sides changed → Sheet value returned
- `diffRows()` — different-field merge: Sheet changed field A, CRM changed field B → both applied
- `diffRows()` — row reorder: snapshot order differs from current → still matches by student_code
- `diffRows()` — missing snapshot (first run): all Sheet values treated as "new" → full inbound sync
- `diffRows()` — null values: Sheet cell empty vs CRM has value → Sheet wins (null overwrites)
- `validateStudentCode()` — empty string → returns false
- `validateStudentCode()` — null → returns false
- `validateStudentCode()` — valid "S-2026-001" → returns true
- `acquireSyncLock()` — no active run → INSERT sync_runs succeeds, returns lockId
- `acquireSyncLock()` — active run exists → INSERT violates UNIQUE partial index, returns null (skipped)
- `acquireSyncLock()` — stale run exists (>10min) → UPDATE to 'timeout' first, then INSERT succeeds, returns lockId

**Test approach:** Unit tests using Node test runner (`node --test`). Mock Supabase client for DB calls, test pure logic functions directly.

### 2. Build validation
- `npm run lint` — fix any lint errors
- `npm run build` — verify production build succeeds
- Check no TypeScript errors

### 3. Migration deployment
- Run migrations 029-032 on Supabase Cloud
- Verify tables exist in Supabase dashboard
- Verify RLS policies active
- Verify legacy `secondary` rows migrated to `secondary_basic`
- Verify student_code NOT NULL enforced

### 4. Functional verification (manual)
- Create new student on CRM → verify new fields save
- Check Google Sheet "Học viên" tab → verify 16 columns
- Add row on Sheet (with valid Mã HS) → wait 15 min → verify CRM inbound sync
- Add row on Sheet (without Mã HS) → verify skipped + error logged
- Edit student on CRM → wait 15 min → verify Sheet outbound sync
- Edit same field on both → verify Sheet wins
- Trigger 2 sync calls simultaneously → verify 1 skips (lock)
- Open student detail → verify 4 tabs render
- Check student table → verify 3 new columns visible

### 5. Performance check
- Sync cycle should complete < 30s for ~200 students
- No excessive API calls to Google (check logs)

## Related Code Files
- **Create**: `tests/google-sheets-sync-conflict.test.ts`

## Todo List
- [ ] Write automated conflict logic tests (11 test cases)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm test` — all tests pass
- [ ] Migrations deployed to Supabase Cloud
- [ ] Manual test: CRUD with new fields
- [ ] Manual test: 2-way sync (inbound + outbound + conflict)
- [ ] Manual test: concurrent lock
- [ ] Manual test: data quality gate (null student_code)
- [ ] Manual test: student detail tabs
- [ ] Manual test: student table new columns

## Success Criteria
- All 11 automated test cases pass
- Build clean, no errors
- All migrations deployed
- 2-way sync working with concurrency guard
- UI showing new data correctly
