-- ============================================================================
-- Migration 033: RLS policies for Student Hub tables
-- ============================================================================

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_sync_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- attendance_records
-- ============================================================================
DROP POLICY IF EXISTS admin_attendance_records_all ON public.attendance_records;
CREATE POLICY admin_attendance_records_all ON public.attendance_records
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_attendance_records_select ON public.attendance_records;
CREATE POLICY authenticated_attendance_records_select ON public.attendance_records
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- teacher_comments
-- ============================================================================
DROP POLICY IF EXISTS admin_teacher_comments_all ON public.teacher_comments;
CREATE POLICY admin_teacher_comments_all ON public.teacher_comments
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_teacher_comments_select ON public.teacher_comments;
CREATE POLICY authenticated_teacher_comments_select ON public.teacher_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- student_scores
-- ============================================================================
DROP POLICY IF EXISTS admin_student_scores_all ON public.student_scores;
CREATE POLICY admin_student_scores_all ON public.student_scores
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_student_scores_select ON public.student_scores;
CREATE POLICY authenticated_student_scores_select ON public.student_scores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- homework_records
-- ============================================================================
DROP POLICY IF EXISTS admin_homework_records_all ON public.homework_records;
CREATE POLICY admin_homework_records_all ON public.homework_records
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_homework_records_select ON public.homework_records;
CREATE POLICY authenticated_homework_records_select ON public.homework_records
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- student_notes (internal-only visibility)
-- ============================================================================
DROP POLICY IF EXISTS admin_student_notes_all ON public.student_notes;
CREATE POLICY admin_student_notes_all ON public.student_notes
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================================
-- learning_paths
-- ============================================================================
DROP POLICY IF EXISTS admin_learning_paths_all ON public.learning_paths;
CREATE POLICY admin_learning_paths_all ON public.learning_paths
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_learning_paths_select ON public.learning_paths;
CREATE POLICY authenticated_learning_paths_select ON public.learning_paths
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- learning_milestones
-- ============================================================================
DROP POLICY IF EXISTS admin_learning_milestones_all ON public.learning_milestones;
CREATE POLICY admin_learning_milestones_all ON public.learning_milestones
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS authenticated_learning_milestones_select ON public.learning_milestones;
CREATE POLICY authenticated_learning_milestones_select ON public.learning_milestones
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- sheet_sync_snapshots (cron/service role writes snapshots)
-- ============================================================================
DROP POLICY IF EXISTS admin_sheet_sync_snapshots_select ON public.sheet_sync_snapshots;
CREATE POLICY admin_sheet_sync_snapshots_select ON public.sheet_sync_snapshots
  FOR SELECT
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS service_sheet_sync_snapshots_select ON public.sheet_sync_snapshots;
CREATE POLICY service_sheet_sync_snapshots_select ON public.sheet_sync_snapshots
  FOR SELECT
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_sheet_sync_snapshots_insert ON public.sheet_sync_snapshots;
CREATE POLICY service_sheet_sync_snapshots_insert ON public.sheet_sync_snapshots
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_sheet_sync_snapshots_delete ON public.sheet_sync_snapshots;
CREATE POLICY service_sheet_sync_snapshots_delete ON public.sheet_sync_snapshots
  FOR DELETE
  USING (auth.role() = 'service_role');
