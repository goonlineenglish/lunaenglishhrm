-- ============================================================
-- Luna HRM — Migration 014: Multi-Role RBAC Schema + RLS Migration
-- Migrates from single role string to roles array.
-- JWT: app_metadata.roles: string[] (replaces app_metadata.role: string)
-- ============================================================

-- ============================================================
-- STEP 1: Schema change — add employees.roles TEXT[] column
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- Backfill from existing role column
UPDATE employees SET roles = ARRAY[role] WHERE roles = '{}';

-- Ensure non-empty (at least 1 role)
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS chk_roles_not_empty;
ALTER TABLE employees
  ADD CONSTRAINT chk_roles_not_empty CHECK (array_length(roles, 1) > 0);

-- ============================================================
-- STEP 2: New RLS helper functions
-- Replace get_user_role() with multi-role aware helpers
-- ============================================================

-- Returns roles array from JWT app_metadata.roles
-- ISSUE-3 fix: fallback to legacy app_metadata.role if roles[] is absent/empty
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Prefer roles[] array when present and non-empty
    WHEN jsonb_typeof(auth.jwt()->'app_metadata'->'roles') = 'array'
      AND jsonb_array_length(auth.jwt()->'app_metadata'->'roles') > 0
    THEN ARRAY(SELECT jsonb_array_elements_text(auth.jwt()->'app_metadata'->'roles'))
    -- Fallback to legacy single role string
    WHEN auth.jwt()->'app_metadata'->>'role' IS NOT NULL
    THEN ARRAY[auth.jwt()->'app_metadata'->>'role']
    -- Default to employee for any authenticated user
    ELSE ARRAY['employee']::TEXT[]
  END;
$$;

-- Check if user has a specific role (array membership)
CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_name = ANY(get_user_roles());
$$;

-- Global access: admin always global; accountant global UNLESS also BM (then branch-scoped)
CREATE OR REPLACE FUNCTION is_global_access()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_has_role('admin')
    OR (user_has_role('accountant') AND NOT user_has_role('branch_manager'));
$$;

-- Backward-compat wrapper: returns first role for any legacy code that still calls get_user_role()
-- NOTE: Do NOT remove this until all server-side code is migrated.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((get_user_roles())[1], 'employee');
$$;

-- get_user_branch_id() is unchanged — still reads from app_metadata.branch_id
-- get_current_user_is_active() is unchanged — still reads is_active from employees table via SECURITY DEFINER

-- SECURITY DEFINER helper: get current user's roles[] from employees table
-- Required for employees_self_update anti-escalation check.
-- Bypasses RLS (SECURITY DEFINER) to avoid 42P17 infinite recursion.
-- Pattern identical to get_current_user_is_active() in migration 011.
CREATE OR REPLACE FUNCTION get_current_user_roles()
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(roles, ARRAY[]::TEXT[]) FROM employees WHERE id = (SELECT auth.uid());
$$;

-- ============================================================
-- STEP 3: DROP all existing RLS policies (68 data + 1 audit)
-- Re-create with user_has_role() pattern
-- ============================================================

-- branches (5 policies)
DROP POLICY IF EXISTS "branches_admin_all" ON branches;
DROP POLICY IF EXISTS "branches_bm_select_own" ON branches;
DROP POLICY IF EXISTS "branches_bm_update_own" ON branches;
DROP POLICY IF EXISTS "branches_accountant_select" ON branches;
DROP POLICY IF EXISTS "branches_employee_select_own" ON branches;

-- employees (6 policies)
DROP POLICY IF EXISTS "employees_admin_all" ON employees;
DROP POLICY IF EXISTS "employees_bm_select_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_bm_insert_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_bm_update_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_accountant_select" ON employees;
DROP POLICY IF EXISTS "employees_self_select" ON employees;
DROP POLICY IF EXISTS "employees_self_update" ON employees;

-- class_schedules (4 policies)
DROP POLICY IF EXISTS "class_schedules_admin_all" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_bm_all_own_branch" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_accountant_select" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_employee_select" ON class_schedules;

-- attendance (4 policies)
DROP POLICY IF EXISTS "attendance_admin_all" ON attendance;
DROP POLICY IF EXISTS "attendance_bm_all_own_branch" ON attendance;
DROP POLICY IF EXISTS "attendance_accountant_select" ON attendance;
DROP POLICY IF EXISTS "attendance_employee_select_own" ON attendance;

-- office_attendance (4 policies)
DROP POLICY IF EXISTS "office_attendance_admin_all" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_bm_all_own_branch" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_accountant_select" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_employee_select_own" ON office_attendance;

-- attendance_locks (4 policies)
DROP POLICY IF EXISTS "attendance_locks_admin_all" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_bm_all_own_branch" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_accountant_select" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_employee_select" ON attendance_locks;

-- employee_weekly_notes (5 policies)
DROP POLICY IF EXISTS "employee_weekly_notes_admin_all" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_bm_all_own_branch" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_accountant_select" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_accountant_update_processed" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_employee_select_own" ON employee_weekly_notes;

-- kpi_evaluations (4 policies)
DROP POLICY IF EXISTS "kpi_evaluations_admin_all" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_bm_all_own_branch" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_accountant_select" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_employee_select_own" ON kpi_evaluations;

-- payroll_periods (3 policies)
DROP POLICY IF EXISTS "payroll_periods_admin_all" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_bm_select_own_branch" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_accountant_all" ON payroll_periods;

-- payslips (4 policies)
DROP POLICY IF EXISTS "payslips_admin_all" ON payslips;
DROP POLICY IF EXISTS "payslips_bm_select_own_branch" ON payslips;
DROP POLICY IF EXISTS "payslips_accountant_all" ON payslips;
DROP POLICY IF EXISTS "payslips_employee_select_own" ON payslips;

-- salary_components (4 policies)
DROP POLICY IF EXISTS "salary_components_admin_all" ON salary_components;
DROP POLICY IF EXISTS "salary_components_bm_all_own_branch" ON salary_components;
DROP POLICY IF EXISTS "salary_components_accountant_select" ON salary_components;
DROP POLICY IF EXISTS "salary_components_employee_select_own" ON salary_components;

-- evaluation_templates (3 policies)
DROP POLICY IF EXISTS "evaluation_templates_admin_all" ON evaluation_templates;
DROP POLICY IF EXISTS "evaluation_templates_bm_select" ON evaluation_templates;
DROP POLICY IF EXISTS "evaluation_templates_accountant_select" ON evaluation_templates;

-- evaluation_criteria (3 policies)
DROP POLICY IF EXISTS "evaluation_criteria_admin_all" ON evaluation_criteria;
DROP POLICY IF EXISTS "evaluation_criteria_bm_select" ON evaluation_criteria;
DROP POLICY IF EXISTS "evaluation_criteria_accountant_select" ON evaluation_criteria;

-- evaluation_periods (3 policies)
DROP POLICY IF EXISTS "evaluation_periods_admin_all" ON evaluation_periods;
DROP POLICY IF EXISTS "evaluation_periods_bm_select" ON evaluation_periods;
DROP POLICY IF EXISTS "evaluation_periods_accountant_select" ON evaluation_periods;

-- employee_evaluations (4 policies)
DROP POLICY IF EXISTS "employee_evaluations_admin_all" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_bm_all_own_branch" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_accountant_select" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_employee_select_own" ON employee_evaluations;

-- evaluation_scores (4 policies)
DROP POLICY IF EXISTS "evaluation_scores_admin_all" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_bm_all_own_branch" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_accountant_select" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_employee_select_own" ON evaluation_scores;

-- employee_notes (3 policies)
DROP POLICY IF EXISTS "employee_notes_admin_all" ON employee_notes;
DROP POLICY IF EXISTS "employee_notes_bm_all_own_branch" ON employee_notes;
DROP POLICY IF EXISTS "employee_notes_accountant_select" ON employee_notes;

-- audit_logs (1 policy)
DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;

-- ============================================================
-- STEP 4: Re-create all policies with user_has_role() pattern
-- ============================================================

-- ────────────── TABLE: branches ──────────────
-- Admin: full CRUD all branches
-- BM: SELECT/UPDATE own branch
-- Accountant: SELECT all (global) or own branch (if also BM)
-- Employee: SELECT own branch

CREATE POLICY "branches_admin_all" ON branches
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "branches_bm_select_own" ON branches
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager') AND id = get_user_branch_id());

CREATE POLICY "branches_bm_update_own" ON branches
  FOR UPDATE TO authenticated
  USING (user_has_role('branch_manager') AND id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND id = get_user_branch_id());

CREATE POLICY "branches_accountant_select" ON branches
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "branches_employee_select_own" ON branches
  FOR SELECT TO authenticated
  USING (
    user_has_role('employee')
    AND id = (SELECT branch_id FROM employees WHERE id = (SELECT auth.uid()))
  );

-- ────────────── TABLE: employees ──────────────
-- Admin: full CRUD all
-- BM: SELECT/INSERT/UPDATE own branch (can only create employees with role='employee')
-- Accountant: SELECT all (global)
-- Employee: SELECT/UPDATE own record (anti-escalation on roles)

CREATE POLICY "employees_admin_all" ON employees
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "employees_bm_select_own_branch" ON employees
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

-- STEP 5 (BM insert restriction): BM can only create employees with roles=['employee']
CREATE POLICY "employees_bm_insert_own_branch" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_role('branch_manager')
    AND branch_id = get_user_branch_id()
    AND roles = ARRAY['employee']::TEXT[]
  );

CREATE POLICY "employees_bm_update_own_branch" ON employees
  FOR UPDATE TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "employees_accountant_select" ON employees
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "employees_self_select" ON employees
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND id = (SELECT auth.uid()));

-- STEP 4 (Anti-escalation): employee cannot modify roles, branch_id, is_active
-- NOTE: We cannot do `roles = (SELECT roles FROM employees ...)` here — that would trigger
--       42P17 infinite recursion (same table RLS re-entry, bug fixed in migration 011).
--       Use get_current_user_roles() SECURITY DEFINER helper to bypass RLS safely.
CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE TO authenticated
  USING (user_has_role('employee') AND id = (SELECT auth.uid()))
  WITH CHECK (
    user_has_role('employee')
    AND id = (SELECT auth.uid())
    -- Use SECURITY DEFINER helper to read roles[] without recursion (migration 011 pattern)
    AND roles IS NOT DISTINCT FROM get_current_user_roles()
    AND branch_id IS NOT DISTINCT FROM get_user_branch_id()
    AND is_active = get_current_user_is_active()
  );

-- ────────────── TABLE: class_schedules ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all (global)
-- Employee: SELECT classes they teach/assist

CREATE POLICY "class_schedules_admin_all" ON class_schedules
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "class_schedules_bm_all_own_branch" ON class_schedules
  FOR ALL TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "class_schedules_accountant_select" ON class_schedules
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "class_schedules_employee_select" ON class_schedules
  FOR SELECT TO authenticated
  USING (
    user_has_role('employee')
    AND (teacher_id = (SELECT auth.uid()) OR assistant_id = (SELECT auth.uid()))
  );

-- ────────────── TABLE: attendance ──────────────
-- No direct branch_id — RLS uses JOIN via class_schedules.branch_id
-- Admin: full CRUD all
-- BM: full CRUD where class is in own branch
-- Accountant: SELECT all (global)
-- Employee: SELECT own records

CREATE POLICY "attendance_admin_all" ON attendance
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "attendance_bm_all_own_branch" ON attendance
  FOR ALL TO authenticated
  USING (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM class_schedules cs
      WHERE cs.id = attendance.schedule_id
        AND cs.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM class_schedules cs
      WHERE cs.id = attendance.schedule_id
        AND cs.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "attendance_accountant_select" ON attendance
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "attendance_employee_select_own" ON attendance
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: office_attendance ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all (global)
-- Employee: SELECT own records

CREATE POLICY "office_attendance_admin_all" ON office_attendance
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "office_attendance_bm_all_own_branch" ON office_attendance
  FOR ALL TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "office_attendance_accountant_select" ON office_attendance
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "office_attendance_employee_select_own" ON office_attendance
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: attendance_locks ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all (global)
-- Employee: SELECT own branch

CREATE POLICY "attendance_locks_admin_all" ON attendance_locks
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "attendance_locks_bm_all_own_branch" ON attendance_locks
  FOR ALL TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "attendance_locks_accountant_select" ON attendance_locks
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "attendance_locks_employee_select" ON attendance_locks
  FOR SELECT TO authenticated
  USING (
    user_has_role('employee')
    AND branch_id = (SELECT branch_id FROM employees WHERE id = (SELECT auth.uid()))
  );

-- ────────────── TABLE: employee_weekly_notes ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all (global), UPDATE (mark processed)
-- Employee: SELECT own notes

CREATE POLICY "employee_weekly_notes_admin_all" ON employee_weekly_notes
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "employee_weekly_notes_bm_all_own_branch" ON employee_weekly_notes
  FOR ALL TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "employee_weekly_notes_accountant_select" ON employee_weekly_notes
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "employee_weekly_notes_accountant_update_processed" ON employee_weekly_notes
  FOR UPDATE TO authenticated
  USING (user_has_role('accountant') AND is_global_access())
  WITH CHECK (user_has_role('accountant') AND is_global_access());

CREATE POLICY "employee_weekly_notes_employee_select_own" ON employee_weekly_notes
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: kpi_evaluations ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch
-- Accountant: SELECT all (global)
-- Employee: SELECT own records

CREATE POLICY "kpi_evaluations_admin_all" ON kpi_evaluations
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "kpi_evaluations_bm_all_own_branch" ON kpi_evaluations
  FOR ALL TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id())
  WITH CHECK (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

CREATE POLICY "kpi_evaluations_accountant_select" ON kpi_evaluations
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "kpi_evaluations_employee_select_own" ON kpi_evaluations
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: payroll_periods ──────────────
-- Admin: full CRUD
-- BM: SELECT own branch (view only, no payroll management)
-- Accountant: full CRUD — branch-scoped if also BM, else global
-- Employee: no access

CREATE POLICY "payroll_periods_admin_all" ON payroll_periods
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "payroll_periods_bm_select_own_branch" ON payroll_periods
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

-- Accountant: global if pure accountant, own branch if also BM
CREATE POLICY "payroll_periods_accountant_all" ON payroll_periods
  FOR ALL TO authenticated
  USING (
    user_has_role('accountant')
    AND (is_global_access() OR branch_id = get_user_branch_id())
  )
  WITH CHECK (
    user_has_role('accountant')
    AND (is_global_access() OR branch_id = get_user_branch_id())
  );

-- ────────────── TABLE: payslips ──────────────
-- Admin: full CRUD
-- BM: SELECT own branch
-- Accountant: full CRUD — branch-scoped if also BM, else global
-- Employee: SELECT own payslips

CREATE POLICY "payslips_admin_all" ON payslips
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "payslips_bm_select_own_branch" ON payslips
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager') AND branch_id = get_user_branch_id());

-- Accountant: global if pure accountant, own branch if also BM
CREATE POLICY "payslips_accountant_all" ON payslips
  FOR ALL TO authenticated
  USING (
    user_has_role('accountant')
    AND (is_global_access() OR branch_id = get_user_branch_id())
  )
  WITH CHECK (
    user_has_role('accountant')
    AND (is_global_access() OR branch_id = get_user_branch_id())
  );

CREATE POLICY "payslips_employee_select_own" ON payslips
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: salary_components ──────────────
-- Admin: full CRUD
-- BM: full CRUD own branch employees
-- Accountant: SELECT all (global)
-- Employee: SELECT own components

CREATE POLICY "salary_components_admin_all" ON salary_components
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "salary_components_bm_all_own_branch" ON salary_components
  FOR ALL TO authenticated
  USING (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = salary_components.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = salary_components.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "salary_components_accountant_select" ON salary_components
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "salary_components_employee_select_own" ON salary_components
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: evaluation_templates ──────────────
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only (global)

CREATE POLICY "evaluation_templates_admin_all" ON evaluation_templates
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "evaluation_templates_bm_select" ON evaluation_templates
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager'));

CREATE POLICY "evaluation_templates_accountant_select" ON evaluation_templates
  FOR SELECT TO authenticated
  USING (user_has_role('accountant'));

-- ────────────── TABLE: evaluation_criteria ──────────────
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only

CREATE POLICY "evaluation_criteria_admin_all" ON evaluation_criteria
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "evaluation_criteria_bm_select" ON evaluation_criteria
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager'));

CREATE POLICY "evaluation_criteria_accountant_select" ON evaluation_criteria
  FOR SELECT TO authenticated
  USING (user_has_role('accountant'));

-- ────────────── TABLE: evaluation_periods ──────────────
-- Admin: full CRUD
-- BM: SELECT only
-- Accountant: SELECT only

CREATE POLICY "evaluation_periods_admin_all" ON evaluation_periods
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "evaluation_periods_bm_select" ON evaluation_periods
  FOR SELECT TO authenticated
  USING (user_has_role('branch_manager'));

CREATE POLICY "evaluation_periods_accountant_select" ON evaluation_periods
  FOR SELECT TO authenticated
  USING (user_has_role('accountant'));

-- ────────────── TABLE: employee_evaluations ──────────────
-- Admin: full CRUD all
-- BM: full CRUD own branch employees
-- Accountant: SELECT all (global)
-- Employee: SELECT own evaluations

CREATE POLICY "employee_evaluations_admin_all" ON employee_evaluations
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "employee_evaluations_bm_all_own_branch" ON employee_evaluations
  FOR ALL TO authenticated
  USING (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_evaluations.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_evaluations.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "employee_evaluations_accountant_select" ON employee_evaluations
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "employee_evaluations_employee_select_own" ON employee_evaluations
  FOR SELECT TO authenticated
  USING (user_has_role('employee') AND employee_id = (SELECT auth.uid()));

-- ────────────── TABLE: evaluation_scores ──────────────
-- Admin: full CRUD all
-- BM: full CRUD scores for own branch employee evaluations
-- Accountant: SELECT all (global)
-- Employee: SELECT own evaluation scores

CREATE POLICY "evaluation_scores_admin_all" ON evaluation_scores
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "evaluation_scores_bm_all_own_branch" ON evaluation_scores
  FOR ALL TO authenticated
  USING (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      JOIN employees e ON e.id = ee.employee_id
      WHERE ee.id = evaluation_scores.evaluation_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      JOIN employees e ON e.id = ee.employee_id
      WHERE ee.id = evaluation_scores.evaluation_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "evaluation_scores_accountant_select" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

CREATE POLICY "evaluation_scores_employee_select_own" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (
    user_has_role('employee')
    AND EXISTS (
      SELECT 1 FROM employee_evaluations ee
      WHERE ee.id = evaluation_scores.evaluation_id
        AND ee.employee_id = (SELECT auth.uid())
    )
  );

-- ────────────── TABLE: employee_notes ──────────────
-- Admin: full CRUD all
-- BM: full CRUD own branch employees
-- Accountant: SELECT all (global)
-- Employee: no access (internal notes)

CREATE POLICY "employee_notes_admin_all" ON employee_notes
  FOR ALL TO authenticated
  USING (user_has_role('admin'))
  WITH CHECK (user_has_role('admin'));

CREATE POLICY "employee_notes_bm_all_own_branch" ON employee_notes
  FOR ALL TO authenticated
  USING (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_notes.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  )
  WITH CHECK (
    user_has_role('branch_manager')
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_notes.employee_id
        AND e.branch_id = get_user_branch_id()
    )
  );

CREATE POLICY "employee_notes_accountant_select" ON employee_notes
  FOR SELECT TO authenticated
  USING (user_has_role('accountant') AND is_global_access());

-- ────────────── TABLE: audit_logs ──────────────
-- STEP 6: Update audit_logs policy

DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;
CREATE POLICY "admin_select_audit" ON audit_logs
  FOR SELECT USING (user_has_role('admin'));
