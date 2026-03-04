# Phase 1: Database Gap-Fill Migration (034)

## Context
- Parent plan: [plan.md](./plan.md)
- GO/NO-GO assessment: `plans/reports/go-no-go-assessment-260304-student-hub-phase1.md`
- Existing migrations: `029_extend-students-add-program-types.sql`, `030_create-easycheck-data-tables.sql`, `031_create-learning-path-tables.sql`, `032_create-sheet-sync-snapshots.sql`, `033_add-rls-student-hub-tables.sql`
- Legacy enum: `supabase/migrations/002_create-leads-table.sql` — leads column is `program_interest` (NOT `program_type`)
- Brainstorm: `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md`

## Overview
- **Priority**: P1 (blocks all other phases)
- **Status**: Pending
- **Description**: Single gap-fill migration 034 — adds everything missing from 029-033: `lead_source` enum value, legacy `secondary` migration, student_code enforcement, `sync_runs` table with UNIQUE partial index, attendance UNIQUE constraint, and `sync_runs` RLS

## Key Insights
- **Migrations 029-033 already exist** in repo — cannot rewrite them (may be deployed to Supabase Cloud)
- 029 is missing: `lead_source` enum update, legacy migration, student_code enforcement
- 031 has learning tables only — no `sync_runs` table
- 032 has `sheet_sync_snapshots` only — no `sync_runs` table
- 033 RLS covers 8 tables — missing `sync_runs`
- 030 missing UNIQUE constraint on `(student_id, class_date)` for attendance_records
- **Strategy**: single migration 034 fills ALL gaps at once

## What Already Exists (029-033)
| Migration | Content | Status |
|---|---|---|
| 029 | 3 program_type values, 8 student columns, idempotent constraints, indexes, lead backfill | ✅ Complete |
| 030 | 5 EasyCheck tables, indexes, updated_at triggers | ✅ Complete |
| 031 | learning_paths + learning_milestones, indexes, triggers | ✅ Complete |
| 032 | sheet_sync_snapshots table, synced_at index | ✅ Complete |
| 033 | RLS on 8 tables (5 EasyCheck + 2 learning + snapshots) | ✅ Complete |

## What's Missing (→ Migration 034)
| Gap | Impact | Source |
|---|---|---|
| `lead_source` enum missing `google_sheet` | Blocks Phase 4 inbound sync lead auto-creation | Plan requirement |
| Legacy `secondary` not migrated | Stale data, inconsistent enum usage | Plan requirement |
| `student_code` NOT NULL not enforced | 2-way sync key unreliable | Plan requirement |
| `sync_runs` table missing | No concurrency guard for sync | Plan requirement |
| UNIQUE partial index on sync_runs missing | Concurrent syncs can run | Plan requirement |
| `sync_runs` RLS missing | Security gap | Plan requirement |
| Attendance UNIQUE (student_id, class_date) missing | Duplicate attendance records possible | Plan requirement |

## Architecture

### Migration 034: Gap-fill for Student Hub Phase 1
```sql
-- ============================================================================
-- Migration 034: Student Hub Phase 1 gap-fill
-- Fills gaps from 029-033: lead_source enum, legacy migration, student_code
-- enforcement, sync_runs table, attendance UNIQUE, sync_runs RLS
-- ============================================================================

-- Step 1: Add google_sheet to lead_source enum (required for Phase 4 inbound sync)
ALTER TYPE public.lead_source ADD VALUE IF NOT EXISTS 'google_sheet';

-- Step 2: Migrate legacy 'secondary' → 'secondary_basic' on all existing rows
-- NOTE: Cannot remove enum values in PostgreSQL. Document 'secondary' as deprecated.
-- CRITICAL: leads table uses `program_interest` column, NOT `program_type`
UPDATE public.leads SET program_interest = 'secondary_basic'
  WHERE program_interest = 'secondary';
UPDATE public.students SET program_type = 'secondary_basic'
  WHERE program_type = 'secondary';

-- Step 3: Backfill null student_code with collision-safe generated codes
-- Uses CTE with ROW_NUMBER, B-prefix distinguishes backfill from manual codes
WITH codes AS (
  SELECT
    id,
    'S-' || TO_CHAR(COALESCE(enrollment_date, created_at), 'YYYY') || '-B'
      || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0') AS new_code
  FROM public.students
  WHERE student_code IS NULL
)
UPDATE public.students s
SET student_code = c.new_code
FROM codes c
WHERE s.id = c.id
  AND NOT EXISTS (
    SELECT 1 FROM public.students s2 WHERE s2.student_code = c.new_code
  );

-- Step 4: Enforce NOT NULL on student_code (safe after backfill)
ALTER TABLE public.students ALTER COLUMN student_code SET NOT NULL;

-- Step 5: UNIQUE constraint on attendance_records (prevent dupe per student per day)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_records_student_date_unique'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT attendance_records_student_date_unique
      UNIQUE (student_id, class_date);
  END IF;
END $$;

-- Step 6: Create sync_runs table (concurrency guard for 2-way sync)
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sync_runs_status_check
    CHECK (status IN ('running', 'completed', 'error', 'timeout'))
);

-- Step 7: UNIQUE partial index — primary lock mechanism
-- INSERT fails atomically if another 'running' row exists
-- App code: UPDATE stale rows (started_at > 10min) to 'timeout' before INSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_runs_single_active
  ON public.sync_runs ((true)) WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at_desc
  ON public.sync_runs (started_at DESC);

-- Step 8: RLS + policies for sync_runs
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_sync_runs_select ON public.sync_runs;
CREATE POLICY admin_sync_runs_select ON public.sync_runs
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS service_sync_runs_all ON public.sync_runs;
CREATE POLICY service_sync_runs_all ON public.sync_runs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

## Related Code Files
- **Modify**: None (SQL only)
- **Create**:
  - `supabase/migrations/034_student-hub-phase1-gaps.sql`

## Implementation Steps

### 1. Create migration 034
1. Add `google_sheet` to `lead_source` enum
2. UPDATE legacy `secondary` → `secondary_basic` on `leads.program_interest` + `students.program_type`
3. Backfill NULL student_code with collision-safe CTE (S-YYYY-BNNN pattern)
4. ALTER student_code SET NOT NULL
5. Add UNIQUE constraint on attendance_records (student_id, class_date)
6. CREATE `sync_runs` table with status CHECK constraint
7. CREATE UNIQUE partial index on sync_runs for concurrency guard
8. Enable RLS + policies on sync_runs (admin SELECT, service_role ALL)

### 2. Deploy to Supabase Cloud
1. Run migration 034 via Supabase dashboard or CLI
2. Verify in Supabase: `lead_source` enum includes `google_sheet`
3. Verify: no rows with `program_interest = 'secondary'` or `program_type = 'secondary'`
4. Verify: `student_code` has no NULL values, NOT NULL constraint active
5. Verify: `sync_runs` table exists with UNIQUE partial index
6. Verify: RLS active on `sync_runs`

## Todo List
- [ ] Write migration 034 (gap-fill SQL)
- [ ] Run migration on Supabase Cloud
- [ ] Verify `lead_source` enum has `google_sheet`
- [ ] Verify no legacy `secondary` rows remain
- [ ] Verify `student_code` NOT NULL enforced
- [ ] Verify `sync_runs` table + UNIQUE partial index
- [ ] Verify RLS on `sync_runs`
- [ ] Verify attendance UNIQUE constraint

## Success Criteria
- Migration 034 executes without errors
- `lead_source` enum has 7 values (6 existing + `google_sheet`)
- `program_type` enum has 7 values, no rows use `secondary`
- `student_code` is NOT NULL on all rows, backfill codes use `S-YYYY-BNNN` pattern
- `sync_runs` table exists with UNIQUE partial index on `status='running'`
- RLS active on `sync_runs` (admin SELECT, service_role ALL)
- Attendance has UNIQUE (student_id, class_date)
- Total: 9 new tables across 029-034 (5 EasyCheck + 2 learning + sheet_sync_snapshots + sync_runs)

## Risk Assessment
- `ALTER TYPE ADD VALUE` cannot run inside transaction — Supabase handles this
- Legacy `secondary` cannot be removed from enum (PostgreSQL limitation) — documented as deprecated
- student_code backfill uses `B`-prefixed codes (`S-YYYY-BNNN`) to avoid collision with manual codes
- Backfill CTE includes `NOT EXISTS` check as extra collision safety
- If 029-033 not yet deployed to Supabase Cloud, must deploy them first before 034

## Security Considerations
- RLS on sync_runs (service_role only for writes — cron process)
- student_notes already restricted to admin role in 033
- sheet_sync_snapshots already restricted to service_role in 033
