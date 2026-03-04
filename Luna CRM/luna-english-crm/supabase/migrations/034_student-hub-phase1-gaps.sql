-- ============================================================================
-- Migration 034: Student Hub Phase 1 gap-fill
-- Fills gaps from 029-033: lead_source enum, legacy migration, student_code
-- enforcement, sync_runs table, attendance UNIQUE, sync_runs RLS
-- ============================================================================

-- Step 1: Add google_sheet to lead_source enum (required for inbound sync)
ALTER TYPE public.lead_source ADD VALUE IF NOT EXISTS 'google_sheet';

-- Step 2: Migrate legacy 'secondary' → 'secondary_basic' on all existing rows
-- NOTE: Cannot remove enum values in PostgreSQL. 'secondary' is now deprecated.
-- CRITICAL: leads table uses `program_interest` column, NOT `program_type`
UPDATE public.leads SET program_interest = 'secondary_basic'
  WHERE program_interest = 'secondary';
UPDATE public.students SET program_type = 'secondary_basic'
  WHERE program_type = 'secondary';

-- Step 3: Backfill null student_code with collision-safe generated codes
-- B-prefix distinguishes backfill codes from manual codes (S-YYYY-NNN)
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
