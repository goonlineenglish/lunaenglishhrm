-- ============================================================
-- Migration 013: KPI Score Scale Update
-- New scoring: tsi/10, funtime/30, parent/20, student/30, demeanor/10 (total/100)
-- New bonus formula: 40,000 × (total/10) × attendance_ratio
-- Add attendance tracking columns to kpi_evaluations
-- ============================================================

-- Drop ALL existing CHECK constraints on the 5 KPI score columns.
-- Uses pg_constraint lookup instead of hard-coded names — safe across all Postgres environments
-- (auto-named constraints like "kpi_evaluations_tsi_score_check" OR manual names).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'kpi_evaluations'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%tsi_score%'
        OR pg_get_constraintdef(oid) LIKE '%funtime_score%'
        OR pg_get_constraintdef(oid) LIKE '%parent_score%'
        OR pg_get_constraintdef(oid) LIKE '%student_score%'
        OR pg_get_constraintdef(oid) LIKE '%demeanor_score%'
      )
  LOOP
    EXECUTE format('ALTER TABLE kpi_evaluations DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END;
$$;

-- Add new CHECK constraints with updated score ranges
ALTER TABLE kpi_evaluations ADD CONSTRAINT kpi_tsi_score_check     CHECK (tsi_score     BETWEEN 0 AND 10);
ALTER TABLE kpi_evaluations ADD CONSTRAINT kpi_funtime_score_check  CHECK (funtime_score  BETWEEN 0 AND 30);
ALTER TABLE kpi_evaluations ADD CONSTRAINT kpi_parent_score_check   CHECK (parent_score   BETWEEN 0 AND 20);
ALTER TABLE kpi_evaluations ADD CONSTRAINT kpi_student_score_check  CHECK (student_score  BETWEEN 0 AND 30);
ALTER TABLE kpi_evaluations ADD CONSTRAINT kpi_demeanor_score_check CHECK (demeanor_score BETWEEN 0 AND 10);

-- total_score is now 0-100 (raw sum of all criteria)
COMMENT ON COLUMN kpi_evaluations.total_score IS 'Sum of all 5 criteria scores (0-100 scale)';

-- Add attendance tracking columns for new bonus formula
-- sessions_worked: actual teaching sessions (attendance status 1 or 0.5)
-- substitute_sessions: substitute sessions from employee_weekly_notes
-- total_scheduled_sessions: total TKB slots in month (all attendance records)
ALTER TABLE kpi_evaluations ADD COLUMN IF NOT EXISTS sessions_worked           NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE kpi_evaluations ADD COLUMN IF NOT EXISTS substitute_sessions       NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE kpi_evaluations ADD COLUMN IF NOT EXISTS total_scheduled_sessions  INT     NOT NULL DEFAULT 0;
