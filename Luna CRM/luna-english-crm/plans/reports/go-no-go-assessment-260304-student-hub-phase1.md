# GO/NO-GO Assessment — Student Data Hub Phase 1 (v0.5.0)

Date: 2026-03-04 17:30
Assessor: Claude Code (pre-implementation self-review)

## Status: ⛔ NO-GO — 6 FAIL items found

---

## A. Build/Test Gate — ⏸️ NOT YET (no code changes yet)

- [ ] `npm run lint` — N/A (no new code written)
- [ ] `npm run build` — N/A
- [ ] `npm test` — N/A

**Verdict**: SKIP — gate applies post-implementation.

## B. Migration Gate (029-032) — ⚠️ PARTIAL PASS / 5 FAILs

**Discovery**: Migrations 029-033 **already exist** in the repo (5 files, not 4 as plan says).

| Plan says | Actual file | Status |
|---|---|---|
| `029_extend-students-migrate-program-types.sql` | `029_extend-students-add-program-types.sql` | EXISTS but **INCOMPLETE** |
| `030_create-easycheck-data-tables.sql` | `030_create-easycheck-data-tables.sql` | ✅ PASS |
| `031_create-learning-sync-tables.sql` | `031_create-learning-path-tables.sql` | ⚠️ **MISSING sync tables** |
| `032_add-rls-student-hub-tables.sql` | `032_create-sheet-sync-snapshots.sql` | ⚠️ **Only snapshots, no sync_runs** |
| (not in plan) | `033_add-rls-student-hub-tables.sql` | ⚠️ **MISSING sync_runs RLS** |

### FAIL 1: Migration 029 — Missing 4 critical items
Existing 029 has:
- ✅ 3 new program_type enum values
- ✅ 8 new student columns
- ✅ Idempotent constraints (DO $$ IF NOT EXISTS pattern) — **Round 3 Finding 3 already fixed!**
- ✅ Indexes on program_type, payment_status, teacher_name
- ✅ Backfill from leads (date_of_birth, program_type)
- ❌ **MISSING**: `lead_source` enum — no `ALTER TYPE public.lead_source ADD VALUE 'google_sheet'`
- ❌ **MISSING**: Legacy `secondary` → `secondary_basic` migration (UPDATE leads.program_interest + students.program_type)
- ❌ **MISSING**: student_code backfill (S-YYYY-BNNN pattern for NULL codes)
- ❌ **MISSING**: student_code SET NOT NULL enforcement

### FAIL 2: Migration 031 — Missing sync tables
Existing 031 has learning_paths + learning_milestones only.
- ❌ **MISSING**: `sheet_sync_snapshots` table — moved to 032 but **without sync_runs**
- ❌ **MISSING**: `sync_runs` table (concurrency guard)
- ❌ **MISSING**: UNIQUE partial index `idx_sync_runs_single_active`

### FAIL 3: Migration 032 — Only snapshots, no sync_runs
Existing 032 is ONLY `sheet_sync_snapshots`. **No `sync_runs` table at all.**

### FAIL 4: Migration 033 (RLS) — Missing sync_runs
Existing 033 enables RLS on 8 tables (not 9).
- ❌ **MISSING**: `sync_runs` table RLS + service_role policies
- ❌ **MISSING**: `sync_runs` table doesn't exist to apply RLS to

### FAIL 5: Plan says 4 files (029-032), actual is 5 files (029-033)
Plan numbering and file naming are inconsistent with what exists.

## C. Schema/Data Gate — ⛔ FAIL

- [ ] `lead_source` includes `google_sheet` — **❌ FAIL** (not in migration 029)
- [x] `program_type` includes `primary_basic`, `secondary_basic`, `secondary_advanced` — ✅ (in 029)
- [ ] No legacy `secondary` rows — **❌ FAIL** (no migration for this)
- [ ] `students.student_code` is NOT NULL — **❌ FAIL** (no enforcement in any migration)
- [ ] 9 tables exist — **❌ FAIL** (only 8 tables, `sync_runs` missing)

## D. RLS/Security Gate — ⚠️ PARTIAL

- [x] RLS on 8 tables — ✅ (033 covers 8 tables)
- [ ] RLS on `sync_runs` — **❌ FAIL** (table doesn't exist)
- [x] `sheet_sync_snapshots` restricted to `service_role` — ✅
- [x] `student_notes` admin-only — ✅

## E. Concurrency Gate — ⛔ FAIL

- [ ] `sync_runs` table exists — **❌ FAIL**
- [ ] UNIQUE partial index on `sync_runs` — **❌ FAIL**
- [ ] Lock mechanism — **❌ FAIL** (nothing to lock with)

## F. Sync Behavior Gate — ⏸️ NOT YET (no sync code written)

No code changes. N/A until Phase 4 implementation.

## G. UI Gate — ⏸️ NOT YET (no UI code written)

No code changes. N/A until Phase 5 implementation.

---

## Summary of Gaps

### Critical (blocks implementation):
1. **No `sync_runs` table** — entire concurrency guard is missing. Must create.
2. **No `lead_source` enum update** — `google_sheet` value needed for inbound sync lead auto-creation.
3. **No legacy `secondary` migration** — existing rows still use deprecated value.
4. **No `student_code` NOT NULL enforcement** — 2-way sync relies on student_code as cross-system key.

### Plan vs Reality mismatches:
5. **5 migration files (029-033)** exist, plan says 4 files (029-032).
6. **Migration 031** in plan combines learning+sync tables, but actual 031 is learning-only.
7. **Migration 032** in plan is RLS, but actual 032 is sheet_sync_snapshots only.

### What's already correct:
- ✅ 8 new columns on students (029)
- ✅ 3 new program_type values (029)
- ✅ Idempotent constraints with DO $$ pattern (029)
- ✅ 5 EasyCheck tables (030)
- ✅ 2 learning tables (031)
- ✅ sheet_sync_snapshots (032)
- ✅ RLS on 8 tables with correct policies (033)
- ✅ student-hub types already in users.ts (Student interface extended)

---

## Recommended Fix: Create migration 034

Instead of rewriting 029-033 (already exist, may be deployed), create a **single new migration 034** that fills ALL gaps:

```
supabase/migrations/034_student-hub-phase1-gaps.sql
```

Contents:
1. `ALTER TYPE public.lead_source ADD VALUE IF NOT EXISTS 'google_sheet'`
2. `UPDATE leads SET program_interest = 'secondary_basic' WHERE program_interest = 'secondary'`
3. `UPDATE students SET program_type = 'secondary_basic' WHERE program_type = 'secondary'`
4. Backfill NULL student_code with CTE (S-YYYY-BNNN pattern)
5. `ALTER TABLE students ALTER COLUMN student_code SET NOT NULL`
6. `CREATE TABLE sync_runs (...)` with UNIQUE partial index
7. `ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY` + service_role policies
8. Attendance UNIQUE constraint `(student_id, class_date)` — plan says this, 030 doesn't have it

After 034 is created → re-evaluate checklist. Then proceed to Phase 2-6 implementation.

---

## Decision: ⛔ NO-GO

Cannot proceed with Phase 2-6 until migration gaps are filled via 034.
