-- ============================================================
-- Luna HRM — Migration 010: Security & Index Improvements
-- Fixes from Supabase Postgres Best Practices audit (2026-03-15):
--   ISSUE-1: GRANT ALL to anon → least privilege
--   ISSUE-2/3: auth.uid() per-row → (SELECT auth.uid()) cached
--   ISSUE-4: Missing FK indexes (class_schedules.teacher_id/assistant_id, payslips.branch_id)
--   ISSUE-5: Partial indexes for present-status attendance queries
--   ISSUE-7: audit_logs policy → use get_user_role() helper
-- ============================================================

-- ============================================================
-- ISSUE-1: Fix anon permissions — least privilege
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Fix sequences: anon shouldn't insert
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Fix default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;

-- ============================================================
-- ISSUE-2/3: RLS policies — replace auth.uid() with (SELECT auth.uid())
-- Prevents per-row function call overhead.
-- Drop and recreate all policies that use auth.uid() directly.
-- ============================================================

-- TABLE: branches (employee sees own branch via subquery)
DROP POLICY IF EXISTS "branches_employee_select_own" ON branches;
CREATE POLICY "branches_employee_select_own" ON branches
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND id = (SELECT branch_id FROM employees WHERE id = (SELECT auth.uid()))
  );

-- TABLE: employees (self select + self update)
DROP POLICY IF EXISTS "employees_self_select" ON employees;
CREATE POLICY "employees_self_select" ON employees
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "employees_self_update" ON employees;
CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'employee' AND id = (SELECT auth.uid()))
  WITH CHECK (
    get_user_role() = 'employee' AND id = (SELECT auth.uid())
    AND role = (SELECT role FROM employees WHERE id = (SELECT auth.uid()))
    AND branch_id IS NOT DISTINCT FROM (SELECT branch_id FROM employees WHERE id = (SELECT auth.uid()))
    AND is_active = (SELECT is_active FROM employees WHERE id = (SELECT auth.uid()))
  );

-- TABLE: class_schedules (employee sees classes they teach in)
DROP POLICY IF EXISTS "class_schedules_employee_select" ON class_schedules;
CREATE POLICY "class_schedules_employee_select" ON class_schedules
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND (teacher_id = (SELECT auth.uid()) OR assistant_id = (SELECT auth.uid()))
  );

-- TABLE: attendance (employee sees own records)
DROP POLICY IF EXISTS "attendance_employee_select_own" ON attendance;
CREATE POLICY "attendance_employee_select_own" ON attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: office_attendance (employee sees own records)
DROP POLICY IF EXISTS "office_attendance_employee_select_own" ON office_attendance;
CREATE POLICY "office_attendance_employee_select_own" ON office_attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: attendance_locks (employee sees own branch)
DROP POLICY IF EXISTS "attendance_locks_employee_select" ON attendance_locks;
CREATE POLICY "attendance_locks_employee_select" ON attendance_locks
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND branch_id = (SELECT branch_id FROM employees WHERE id = (SELECT auth.uid()))
  );

-- TABLE: employee_weekly_notes (employee sees own notes)
DROP POLICY IF EXISTS "employee_weekly_notes_employee_select_own" ON employee_weekly_notes;
CREATE POLICY "employee_weekly_notes_employee_select_own" ON employee_weekly_notes
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: kpi_evaluations (employee sees own)
DROP POLICY IF EXISTS "kpi_evaluations_employee_select_own" ON kpi_evaluations;
CREATE POLICY "kpi_evaluations_employee_select_own" ON kpi_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: payslips (employee sees own)
DROP POLICY IF EXISTS "payslips_employee_select_own" ON payslips;
CREATE POLICY "payslips_employee_select_own" ON payslips
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: salary_components (employee sees own)
DROP POLICY IF EXISTS "salary_components_employee_select_own" ON salary_components;
CREATE POLICY "salary_components_employee_select_own" ON salary_components
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: employee_evaluations (employee sees own)
DROP POLICY IF EXISTS "employee_evaluations_employee_select_own" ON employee_evaluations;
CREATE POLICY "employee_evaluations_employee_select_own" ON employee_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()));

-- TABLE: evaluation_scores (employee sees own via JOIN)
DROP POLICY IF EXISTS "evaluation_scores_employee_select_own" ON evaluation_scores;
CREATE POLICY "evaluation_scores_employee_select_own" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      WHERE ee.id = evaluation_scores.evaluation_id
        AND ee.employee_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- ISSUE-4: Missing FK indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher_id
  ON class_schedules (teacher_id);

CREATE INDEX IF NOT EXISTS idx_class_schedules_assistant_id
  ON class_schedules (assistant_id);

CREATE INDEX IF NOT EXISTS idx_payslips_branch_id
  ON payslips (branch_id);

-- ============================================================
-- ISSUE-5: Partial indexes for attendance present-status queries
-- Attendance summary + payroll filter status IN ('1', '0.5').
-- Partial index is smaller and faster for these hot read paths.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_status_present
  ON attendance (schedule_id, date)
  WHERE status IN ('1', '0.5');

CREATE INDEX IF NOT EXISTS idx_office_attendance_status_present
  ON office_attendance (branch_id, date)
  WHERE status IN ('1', '0.5');

-- ============================================================
-- ISSUE-7: audit_logs policy — use get_user_role() for consistency
-- ============================================================
DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;
CREATE POLICY "admin_select_audit" ON audit_logs FOR SELECT
  USING (get_user_role() = 'admin');
