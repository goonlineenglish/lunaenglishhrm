-- ============================================================================
-- VERIFY PACK: Student Hub Phase 1 — Migrations 029-034
-- Run on Supabase SQL Editor after deploying all migrations.
-- Each query returns a row. Check the "result" column for PASS/FAIL.
-- ============================================================================

-- 1. program_type enum has 7 values (4 original + 3 new)
SELECT
  CASE WHEN COUNT(*) = 7 THEN 'PASS' ELSE 'FAIL: got ' || COUNT(*) END AS result,
  'program_type enum has 7 values' AS check_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS detail
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'program_type';

-- 2. lead_source enum has 'google_sheet' value
SELECT
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL: google_sheet not found' END AS result,
  'lead_source has google_sheet value' AS check_name
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'lead_source' AND e.enumlabel = 'google_sheet';

-- 3. Students table has all 8 new columns from 029
SELECT
  CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL: got ' || COUNT(*) || '/8' END AS result,
  'students has 8 new columns' AS check_name,
  string_agg(column_name, ', ') AS detail
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name IN (
    'date_of_birth', 'gender', 'address', 'teacher_name',
    'tuition_amount', 'payment_status', 'program_type', 'sheet_row_index'
  );

-- 4. student_code is NOT NULL
SELECT
  CASE WHEN is_nullable = 'NO' THEN 'PASS' ELSE 'FAIL: still nullable' END AS result,
  'student_code is NOT NULL' AS check_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'student_code';

-- 5. No students with NULL student_code
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' null rows' END AS result,
  'no null student_code rows' AS check_name
FROM public.students
WHERE student_code IS NULL;

-- 6. No rows use legacy 'secondary' in leads.program_interest
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' rows still secondary' END AS result,
  'leads: no secondary in program_interest' AS check_name
FROM public.leads
WHERE program_interest = 'secondary';

-- 7. No rows use legacy 'secondary' in students.program_type
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' rows still secondary' END AS result,
  'students: no secondary in program_type' AS check_name
FROM public.students
WHERE program_type = 'secondary';

-- 8. 5 EasyCheck tables exist
SELECT
  CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL: got ' || COUNT(*) || '/5' END AS result,
  '5 EasyCheck tables exist' AS check_name,
  string_agg(table_name, ', ') AS detail
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'attendance_records', 'teacher_comments', 'student_scores',
    'homework_records', 'student_notes'
  );

-- 9. 2 learning tables exist
SELECT
  CASE WHEN COUNT(*) = 2 THEN 'PASS' ELSE 'FAIL: got ' || COUNT(*) || '/2' END AS result,
  '2 learning tables exist' AS check_name,
  string_agg(table_name, ', ') AS detail
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('learning_paths', 'learning_milestones');

-- 10. sheet_sync_snapshots table exists
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  'sheet_sync_snapshots exists' AS check_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'sheet_sync_snapshots';

-- 11. sync_runs table exists
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  'sync_runs table exists' AS check_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'sync_runs';

-- 12. sync_runs UNIQUE partial index exists
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  'sync_runs UNIQUE partial index exists' AS check_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'sync_runs'
  AND indexname = 'idx_sync_runs_single_active';

-- 13. attendance_records UNIQUE (student_id, class_date) constraint exists
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  'attendance UNIQUE (student_id, class_date) exists' AS check_name
FROM pg_constraint
WHERE conname = 'attendance_records_student_date_unique';

-- 14. RLS enabled on all 9 tables
SELECT
  CASE WHEN COUNT(*) = 9 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || '/9 tables have RLS' END AS result,
  'RLS enabled on 9 tables' AS check_name,
  string_agg(relname::text, ', ') AS detail
FROM pg_class
WHERE relname IN (
  'attendance_records', 'teacher_comments', 'student_scores',
  'homework_records', 'student_notes', 'learning_paths',
  'learning_milestones', 'sheet_sync_snapshots', 'sync_runs'
)
AND relrowsecurity = true;

-- 15. CHECK constraints on students (payment_status, gender, tuition)
SELECT
  CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL: got ' || COUNT(*) || '/3' END AS result,
  'students CHECK constraints exist (payment, gender, tuition)' AS check_name,
  string_agg(conname, ', ') AS detail
FROM pg_constraint
WHERE conrelid = 'public.students'::regclass
  AND contype = 'c'
  AND conname IN (
    'students_payment_status_check',
    'students_gender_check',
    'students_tuition_amount_non_negative_check'
  );

-- 16. sync_runs concurrent lock test: INSERT first row succeeds
-- (Run this, copy the returned id for cleanup in #18)
INSERT INTO public.sync_runs (status) VALUES ('running') RETURNING id, status;

-- 17. sync_runs concurrent lock test: second INSERT should FAIL
-- Expected: "duplicate key value violates unique constraint"
-- Uncomment and run AFTER #16 succeeds:
-- INSERT INTO public.sync_runs (status) VALUES ('running');

-- 18. Cleanup: mark test row as completed using the id from #16
-- Replace '<id-from-step-16>' with the actual UUID returned
-- This avoids accidentally updating a real running sync
UPDATE public.sync_runs SET status = 'completed', completed_at = NOW()
  WHERE id = '<id-from-step-16>';

-- ============================================================================
-- SUMMARY: All 15 checks (1-15) should show PASS.
-- Checks 16-18 are manual concurrent lock verification.
-- ============================================================================
