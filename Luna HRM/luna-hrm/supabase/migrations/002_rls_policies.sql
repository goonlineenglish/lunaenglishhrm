-- ============================================================
-- Luna HRM — Migration 002: Row-Level Security Policies
-- Role hierarchy: admin > branch_manager > accountant > employee
-- Roles stored in auth.jwt()->'app_metadata' (NOT user_metadata)
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- Read role and branch_id from JWT app_metadata (immutable by client)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT (auth.jwt()->'app_metadata'->>'role')::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT (auth.jwt()->'app_metadata'->>'branch_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS on all 17 tables
-- ============================================================
ALTER TABLE branches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_locks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_weekly_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evaluations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_periods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_evaluations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: branches
-- Admin: full CRUD all branches
-- BM: SELECT/UPDATE own branch only
-- Accountant: SELECT all
-- Employee: SELECT own branch (via employee.branch_id)
-- ============================================================

CREATE POLICY "branches_admin_all" ON branches
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "branches_bm_select_own" ON branches
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager' AND id = get_user_branch_id());

CREATE POLICY "branches_bm_update_own" ON branches
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'branch_manager' AND id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND id = get_user_branch_id());

CREATE POLICY "branches_accountant_select" ON branches
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "branches_employee_select_own" ON branches
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND id = (SELECT branch_id FROM employees WHERE id = auth.uid())
  );

-- ============================================================
-- TABLE: employees
-- Admin: full CRUD all employees
-- BM: SELECT/INSERT/UPDATE own branch employees
-- Accountant: SELECT all employees
-- Employee: SELECT/UPDATE own record only
-- ============================================================

CREATE POLICY "employees_admin_all" ON employees
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "employees_bm_select_own_branch" ON employees
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "employees_bm_insert_own_branch" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "employees_bm_update_own_branch" ON employees
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "employees_accountant_select" ON employees
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "employees_self_select" ON employees
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND id = auth.uid());

CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'employee' AND id = auth.uid())
  -- ISSUE-2 fix: prevent self-escalation — employees cannot change authority fields.
  -- Only safe profile columns (phone, address, bank_account_number, etc.) can be updated.
  WITH CHECK (
    get_user_role() = 'employee' AND id = auth.uid()
    AND role = (SELECT role FROM employees WHERE id = auth.uid())
    AND branch_id IS NOT DISTINCT FROM (SELECT branch_id FROM employees WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM employees WHERE id = auth.uid())
  );

-- ============================================================
-- TABLE: class_schedules
-- Attendance RLS: no branch_id on attendance → JOIN via class_schedules
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all
-- Employee: SELECT own branch classes (they teach/assist in)
-- ============================================================

CREATE POLICY "class_schedules_admin_all" ON class_schedules
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "class_schedules_bm_all_own_branch" ON class_schedules
  FOR ALL TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "class_schedules_accountant_select" ON class_schedules
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "class_schedules_employee_select" ON class_schedules
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND (teacher_id = auth.uid() OR assistant_id = auth.uid())
  );

-- ============================================================
-- TABLE: attendance
-- No direct branch_id — RLS uses JOIN via class_schedules.branch_id
-- Admin: full CRUD all
-- BM: full CRUD where class is in own branch (JOIN)
-- Accountant: SELECT all
-- Employee: SELECT own records only
-- ============================================================

CREATE POLICY "attendance_admin_all" ON attendance
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "attendance_bm_all_own_branch" ON attendance
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM class_schedules cs
      WHERE cs.id = attendance.schedule_id
        AND cs.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM class_schedules cs
      WHERE cs.id = attendance.schedule_id
        AND cs.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "attendance_accountant_select" ON attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "attendance_employee_select_own" ON attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: office_attendance
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all
-- Employee: SELECT own records
-- ============================================================

CREATE POLICY "office_attendance_admin_all" ON office_attendance
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "office_attendance_bm_all_own_branch" ON office_attendance
  FOR ALL TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "office_attendance_accountant_select" ON office_attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "office_attendance_employee_select_own" ON office_attendance
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: attendance_locks
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all
-- Employee: SELECT own branch
-- ============================================================

CREATE POLICY "attendance_locks_admin_all" ON attendance_locks
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "attendance_locks_bm_all_own_branch" ON attendance_locks
  FOR ALL TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "attendance_locks_accountant_select" ON attendance_locks
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "attendance_locks_employee_select" ON attendance_locks
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND branch_id = (SELECT branch_id FROM employees WHERE id = auth.uid())
  );

-- ============================================================
-- TABLE: employee_weekly_notes
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all, UPDATE (mark processed)
-- Employee: SELECT own notes only
-- ============================================================

CREATE POLICY "employee_weekly_notes_admin_all" ON employee_weekly_notes
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "employee_weekly_notes_bm_all_own_branch" ON employee_weekly_notes
  FOR ALL TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "employee_weekly_notes_accountant_select" ON employee_weekly_notes
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "employee_weekly_notes_accountant_update_processed" ON employee_weekly_notes
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'accountant')
  WITH CHECK (get_user_role() = 'accountant');

CREATE POLICY "employee_weekly_notes_employee_select_own" ON employee_weekly_notes
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: kpi_evaluations
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all
-- Employee: SELECT own records only
-- ============================================================

CREATE POLICY "kpi_evaluations_admin_all" ON kpi_evaluations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "kpi_evaluations_bm_all_own_branch" ON kpi_evaluations
  FOR ALL TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
  WITH CHECK (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "kpi_evaluations_accountant_select" ON kpi_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "kpi_evaluations_employee_select_own" ON kpi_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: payroll_periods
-- Admin: full CRUD
-- BM: SELECT own branch (they don't run payroll, just view)
-- Accountant: full CRUD all branches
-- Employee: no direct access
-- ============================================================

CREATE POLICY "payroll_periods_admin_all" ON payroll_periods
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "payroll_periods_bm_select_own_branch" ON payroll_periods
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "payroll_periods_accountant_all" ON payroll_periods
  FOR ALL TO authenticated
  USING (get_user_role() = 'accountant')
  WITH CHECK (get_user_role() = 'accountant');

-- ============================================================
-- TABLE: payslips
-- Admin: full CRUD
-- BM: SELECT own branch payslips
-- Accountant: full CRUD all branches
-- Employee: SELECT own payslips only
-- ============================================================

CREATE POLICY "payslips_admin_all" ON payslips
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "payslips_bm_select_own_branch" ON payslips
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id());

CREATE POLICY "payslips_accountant_all" ON payslips
  FOR ALL TO authenticated
  USING (get_user_role() = 'accountant')
  WITH CHECK (get_user_role() = 'accountant');

CREATE POLICY "payslips_employee_select_own" ON payslips
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: salary_components
-- Admin: full CRUD
-- BM: SELECT/INSERT/UPDATE for own branch employees
-- Accountant: SELECT all
-- Employee: SELECT own components
-- ============================================================

CREATE POLICY "salary_components_admin_all" ON salary_components
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "salary_components_bm_all_own_branch" ON salary_components
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = salary_components.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = salary_components.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "salary_components_accountant_select" ON salary_components
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "salary_components_employee_select_own" ON salary_components
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: evaluation_templates
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only
-- Employee: no access
-- ============================================================

CREATE POLICY "evaluation_templates_admin_all" ON evaluation_templates
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "evaluation_templates_bm_select" ON evaluation_templates
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager');

CREATE POLICY "evaluation_templates_accountant_select" ON evaluation_templates
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

-- ============================================================
-- TABLE: evaluation_criteria
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only
-- Employee: no access
-- ============================================================

CREATE POLICY "evaluation_criteria_admin_all" ON evaluation_criteria
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "evaluation_criteria_bm_select" ON evaluation_criteria
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager');

CREATE POLICY "evaluation_criteria_accountant_select" ON evaluation_criteria
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

-- ============================================================
-- TABLE: evaluation_periods
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only
-- Employee: no access
-- ============================================================

CREATE POLICY "evaluation_periods_admin_all" ON evaluation_periods
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "evaluation_periods_bm_select" ON evaluation_periods
  FOR SELECT TO authenticated
  USING (get_user_role() = 'branch_manager');

CREATE POLICY "evaluation_periods_accountant_select" ON evaluation_periods
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

-- ============================================================
-- TABLE: employee_evaluations
-- Admin: full CRUD all
-- BM: full CRUD own branch employees
-- Accountant: SELECT all
-- Employee: SELECT own evaluations only
-- ============================================================

CREATE POLICY "employee_evaluations_admin_all" ON employee_evaluations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "employee_evaluations_bm_all_own_branch" ON employee_evaluations
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_evaluations.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_evaluations.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "employee_evaluations_accountant_select" ON employee_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "employee_evaluations_employee_select_own" ON employee_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'employee' AND employee_id = auth.uid());

-- ============================================================
-- TABLE: evaluation_scores
-- Admin: full CRUD all
-- BM: full CRUD scores for own branch employee evaluations
-- Accountant: SELECT all
-- Employee: SELECT own evaluation scores only
-- ============================================================

CREATE POLICY "evaluation_scores_admin_all" ON evaluation_scores
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "evaluation_scores_bm_all_own_branch" ON evaluation_scores
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      JOIN employees e ON e.id = ee.employee_id
      WHERE ee.id = evaluation_scores.evaluation_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      JOIN employees e ON e.id = ee.employee_id
      WHERE ee.id = evaluation_scores.evaluation_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "evaluation_scores_accountant_select" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "evaluation_scores_employee_select_own" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      WHERE ee.id = evaluation_scores.evaluation_id
        AND ee.employee_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: employee_notes
-- Admin: full CRUD all
-- BM: full CRUD own branch employees
-- Accountant: SELECT all
-- Employee: no access (BM/admin only — internal notes)
-- ============================================================

CREATE POLICY "employee_notes_admin_all" ON employee_notes
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "employee_notes_bm_all_own_branch" ON employee_notes
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_notes.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'branch_manager'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_notes.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "employee_notes_accountant_select" ON employee_notes
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');
