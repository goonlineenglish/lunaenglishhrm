-- ============================================================
-- Luna HRM — RESET DATABASE (XÓA SẠCH)
-- Chạy file này TRƯỚC khi re-run migrations 001-005.
-- Copy toàn bộ nội dung → Supabase SQL Editor → Run
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL RLS policies (từ 002 + 005 + 006 + 007)
-- ============================================================

-- payslip_audit_logs (007)
DROP POLICY IF EXISTS "payslip_audit_admin_select" ON payslip_audit_logs;

-- audit_logs (005)
DROP POLICY IF EXISTS "admin_select_audit" ON audit_logs;

-- branches
DROP POLICY IF EXISTS "branches_admin_all" ON branches;
DROP POLICY IF EXISTS "branches_bm_select_own" ON branches;
DROP POLICY IF EXISTS "branches_bm_update_own" ON branches;
DROP POLICY IF EXISTS "branches_accountant_select" ON branches;
DROP POLICY IF EXISTS "branches_employee_select_own" ON branches;

-- employees
DROP POLICY IF EXISTS "employees_admin_all" ON employees;
DROP POLICY IF EXISTS "employees_bm_select_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_bm_insert_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_bm_update_own_branch" ON employees;
DROP POLICY IF EXISTS "employees_accountant_select" ON employees;
DROP POLICY IF EXISTS "employees_self_select" ON employees;
DROP POLICY IF EXISTS "employees_self_update" ON employees;

-- class_schedules
DROP POLICY IF EXISTS "class_schedules_admin_all" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_bm_all_own_branch" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_accountant_select" ON class_schedules;
DROP POLICY IF EXISTS "class_schedules_employee_select" ON class_schedules;

-- attendance
DROP POLICY IF EXISTS "attendance_admin_all" ON attendance;
DROP POLICY IF EXISTS "attendance_bm_all_own_branch" ON attendance;
DROP POLICY IF EXISTS "attendance_accountant_select" ON attendance;
DROP POLICY IF EXISTS "attendance_employee_select_own" ON attendance;

-- office_attendance
DROP POLICY IF EXISTS "office_attendance_admin_all" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_bm_all_own_branch" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_accountant_select" ON office_attendance;
DROP POLICY IF EXISTS "office_attendance_employee_select_own" ON office_attendance;

-- attendance_locks
DROP POLICY IF EXISTS "attendance_locks_admin_all" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_bm_all_own_branch" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_accountant_select" ON attendance_locks;
DROP POLICY IF EXISTS "attendance_locks_employee_select" ON attendance_locks;

-- employee_weekly_notes
DROP POLICY IF EXISTS "employee_weekly_notes_admin_all" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_bm_all_own_branch" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_accountant_select" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_accountant_update_processed" ON employee_weekly_notes;
DROP POLICY IF EXISTS "employee_weekly_notes_employee_select_own" ON employee_weekly_notes;

-- kpi_evaluations
DROP POLICY IF EXISTS "kpi_evaluations_admin_all" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_bm_all_own_branch" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_accountant_select" ON kpi_evaluations;
DROP POLICY IF EXISTS "kpi_evaluations_employee_select_own" ON kpi_evaluations;

-- payroll_periods
DROP POLICY IF EXISTS "payroll_periods_admin_all" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_bm_select_own_branch" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_accountant_all" ON payroll_periods;

-- payslips
DROP POLICY IF EXISTS "payslips_admin_all" ON payslips;
DROP POLICY IF EXISTS "payslips_bm_select_own_branch" ON payslips;
DROP POLICY IF EXISTS "payslips_accountant_all" ON payslips;
DROP POLICY IF EXISTS "payslips_employee_select_own" ON payslips;

-- salary_components
DROP POLICY IF EXISTS "salary_components_admin_all" ON salary_components;
DROP POLICY IF EXISTS "salary_components_bm_all_own_branch" ON salary_components;
DROP POLICY IF EXISTS "salary_components_accountant_select" ON salary_components;
DROP POLICY IF EXISTS "salary_components_employee_select_own" ON salary_components;

-- evaluation_templates
DROP POLICY IF EXISTS "evaluation_templates_admin_all" ON evaluation_templates;
DROP POLICY IF EXISTS "evaluation_templates_bm_select" ON evaluation_templates;
DROP POLICY IF EXISTS "evaluation_templates_accountant_select" ON evaluation_templates;

-- evaluation_criteria
DROP POLICY IF EXISTS "evaluation_criteria_admin_all" ON evaluation_criteria;
DROP POLICY IF EXISTS "evaluation_criteria_bm_select" ON evaluation_criteria;
DROP POLICY IF EXISTS "evaluation_criteria_accountant_select" ON evaluation_criteria;

-- evaluation_periods
DROP POLICY IF EXISTS "evaluation_periods_admin_all" ON evaluation_periods;
DROP POLICY IF EXISTS "evaluation_periods_bm_select" ON evaluation_periods;
DROP POLICY IF EXISTS "evaluation_periods_accountant_select" ON evaluation_periods;

-- employee_evaluations
DROP POLICY IF EXISTS "employee_evaluations_admin_all" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_bm_all_own_branch" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_accountant_select" ON employee_evaluations;
DROP POLICY IF EXISTS "employee_evaluations_employee_select_own" ON employee_evaluations;

-- evaluation_scores
DROP POLICY IF EXISTS "evaluation_scores_admin_all" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_bm_all_own_branch" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_accountant_select" ON evaluation_scores;
DROP POLICY IF EXISTS "evaluation_scores_employee_select_own" ON evaluation_scores;

-- employee_notes
DROP POLICY IF EXISTS "employee_notes_admin_all" ON employee_notes;
DROP POLICY IF EXISTS "employee_notes_bm_all_own_branch" ON employee_notes;
DROP POLICY IF EXISTS "employee_notes_accountant_select" ON employee_notes;

-- ============================================================
-- STEP 2: Drop ALL tables (reverse FK dependency order)
-- CASCADE handles remaining FK references
-- ============================================================

DROP TABLE IF EXISTS payslip_audit_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS evaluation_scores CASCADE;
DROP TABLE IF EXISTS employee_evaluations CASCADE;
DROP TABLE IF EXISTS evaluation_periods CASCADE;
DROP TABLE IF EXISTS evaluation_criteria CASCADE;
DROP TABLE IF EXISTS evaluation_templates CASCADE;
DROP TABLE IF EXISTS employee_notes CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS salary_components CASCADE;
DROP TABLE IF EXISTS kpi_evaluations CASCADE;
DROP TABLE IF EXISTS employee_weekly_notes CASCADE;
DROP TABLE IF EXISTS attendance_locks CASCADE;
DROP TABLE IF EXISTS office_attendance CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS class_schedules CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- ============================================================
-- STEP 3: Drop helper functions
-- ============================================================

DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_branch_id();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================
-- DONE! Bây giờ chạy migrations 001 → 007 theo thứ tự.
-- ============================================================
