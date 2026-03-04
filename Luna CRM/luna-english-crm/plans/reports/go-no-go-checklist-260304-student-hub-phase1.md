# GO/NO-GO Checklist — Student Hub Phase 1

> **Date**: 2026-03-04
> **Plan**: `plans/260304-1631-student-data-hub-phase1/plan.md`
> **Migration files**: 029-034
> **Status**: PENDING DEPLOYMENT

---

## Pre-Cook Evidence Requirements

All 4 gates must PASS before running `/cook --auto`.

### Gate 1: Database Migrations Deployed
**Action**: Deploy 029 → 030 → 031 → 032 → 033 → 034 on Supabase Cloud SQL Editor (in order).

| # | Migration | Description | Status |
|---|-----------|-------------|--------|
| 1 | 029_extend-students-add-program-types.sql | 3 enum values, 8 columns, 3 indexes, 3 CHECK constraints, lead backfill | ⬜ |
| 2 | 030_create-easycheck-data-tables.sql | 5 tables, 5 indexes, 5 triggers | ⬜ |
| 3 | 031_create-learning-path-tables.sql | 2 tables, 3 indexes, 2 triggers, 3 CHECK constraints | ⬜ |
| 4 | 032_create-sheet-sync-snapshots.sql | 1 table, 1 index | ⬜ |
| 5 | 033_add-rls-student-hub-tables.sql | RLS on 8 tables, policies | ⬜ |
| 6 | 034_student-hub-phase1-gaps.sql | lead_source enum, legacy migration, student_code NOT NULL, sync_runs, attendance UNIQUE, RLS | ⬜ |

### Gate 2: SQL Verify Pack — All Checks PASS
**Action**: Run `supabase/migrations/verify-pack-student-hub-phase1.sql` on Supabase SQL Editor.

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | program_type enum has 7 values | PASS | ⬜ |
| 2 | lead_source has google_sheet | PASS | ⬜ |
| 3 | students has 8 new columns | PASS | ⬜ |
| 4 | student_code is NOT NULL | PASS | ⬜ |
| 5 | no null student_code rows | PASS | ⬜ |
| 6 | leads: no secondary in program_interest | PASS | ⬜ |
| 7 | students: no secondary in program_type | PASS | ⬜ |
| 8 | 5 EasyCheck tables exist | PASS | ⬜ |
| 9 | 2 learning tables exist | PASS | ⬜ |
| 10 | sheet_sync_snapshots exists | PASS | ⬜ |
| 11 | sync_runs table exists | PASS | ⬜ |
| 12 | sync_runs UNIQUE partial index exists | PASS | ⬜ |
| 13 | attendance UNIQUE constraint exists | PASS | ⬜ |
| 14 | RLS enabled on 9 tables | PASS | ⬜ |
| 15 | students CHECK constraints (3) | PASS | ⬜ |

### Gate 3: Concurrent Sync Lock Test
**Action**: Run verify pack checks #16-18 manually.

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | INSERT sync_runs (status='running') | Returns new row ID | ⬜ |
| 2 | INSERT sync_runs (status='running') again | FAIL: duplicate key violation | ⬜ |
| 3 | UPDATE test row to 'completed' | Cleanup succeeds | ⬜ |

### Gate 4: Build & Lint (post-implementation)
**Action**: Run after Phase 2-5 code is implemented.

| # | Command | Expected | Status |
|---|---------|----------|--------|
| 1 | `npm run lint` | No errors | ⬜ |
| 2 | `npm run build` | Clean build | ⬜ |
| 3 | `npm test` | 11 sync conflict tests pass | ⬜ |

---

## Decision

| Gate | Status | Blocker? |
|------|--------|----------|
| Gate 1: Migrations | ⬜ | YES |
| Gate 2: Verify Pack | ⬜ | YES |
| Gate 3: Lock Test | ⬜ | YES |
| Gate 4: Build & Lint | ⬜ | NO (post-cook) |

**GO condition**: Gates 1-3 all PASS → proceed with `/cook --auto`.
Gate 4 is verified AFTER implementation phases 2-5.

---

## Post-GO Command
```
/clear
/cook --auto "F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\plans\260304-1631-student-data-hub-phase1\plan.md"
```
