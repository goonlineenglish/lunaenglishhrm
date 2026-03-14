-- ============================================================
-- Luna HRM — Migration 003: Performance Indexes
-- All indexes support common query patterns and RLS JOIN paths
-- ============================================================

-- ============================================================
-- attendance indexes
-- RLS JOIN path: schedule_id → class_schedules.branch_id
-- ============================================================
CREATE INDEX idx_attendance_schedule_id
  ON attendance (schedule_id);

CREATE INDEX idx_attendance_employee_date
  ON attendance (employee_id, date);

CREATE INDEX idx_attendance_branch_date
  ON attendance (schedule_id, date);  -- best proxy: schedule scoped to branch

-- ============================================================
-- office_attendance indexes
-- ============================================================
CREATE INDEX idx_office_attendance_branch_date
  ON office_attendance (branch_id, date);

CREATE INDEX idx_office_attendance_employee_date
  ON office_attendance (employee_id, date);

-- ============================================================
-- class_schedules indexes
-- ============================================================
CREATE INDEX idx_class_schedules_branch_status
  ON class_schedules (branch_id, status);

-- FK indexes: teacher_id + assistant_id used in RLS policy JOIN and attendance summary queries
CREATE INDEX idx_class_schedules_teacher_id
  ON class_schedules (teacher_id);

CREATE INDEX idx_class_schedules_assistant_id
  ON class_schedules (assistant_id);

-- ============================================================
-- kpi_evaluations indexes
-- ============================================================
CREATE INDEX idx_kpi_evaluations_employee_month_year
  ON kpi_evaluations (employee_id, month, year);

-- ============================================================
-- payslips indexes
-- ============================================================
CREATE INDEX idx_payslips_period_employee
  ON payslips (payroll_period_id, employee_id);

CREATE INDEX idx_payslips_employee_created
  ON payslips (employee_id, created_at DESC);

-- branch_id used heavily in BM queries
CREATE INDEX idx_payslips_branch_id
  ON payslips (branch_id);

-- ============================================================
-- employee_weekly_notes indexes
-- ============================================================
CREATE INDEX idx_employee_weekly_notes_branch_week
  ON employee_weekly_notes (branch_id, week_start);

CREATE INDEX idx_employee_weekly_notes_employee_week
  ON employee_weekly_notes (employee_id, week_start);

-- ============================================================
-- payroll_periods indexes
-- ============================================================
CREATE INDEX idx_payroll_periods_branch_month_year
  ON payroll_periods (branch_id, month, year);

CREATE INDEX idx_payroll_periods_status_sent
  ON payroll_periods (status, sent_at);

-- ============================================================
-- employees indexes
-- ============================================================
CREATE INDEX idx_employees_branch_id
  ON employees (branch_id);

CREATE INDEX idx_employees_position
  ON employees (position);

CREATE INDEX idx_employees_is_active
  ON employees (is_active);

-- ============================================================
-- salary_components indexes (support RLS JOIN check)
-- ============================================================
CREATE INDEX idx_salary_components_employee_id
  ON salary_components (employee_id);

-- ============================================================
-- employee_evaluations indexes (support RLS JOIN check)
-- ============================================================
CREATE INDEX idx_employee_evaluations_employee_id
  ON employee_evaluations (employee_id);

CREATE INDEX idx_employee_evaluations_evaluator_id
  ON employee_evaluations (evaluator_id);

-- ============================================================
-- evaluation_scores indexes (support RLS JOIN chain)
-- ============================================================
CREATE INDEX idx_evaluation_scores_evaluation_id
  ON evaluation_scores (evaluation_id);

-- ============================================================
-- evaluation_criteria indexes
-- ============================================================
CREATE INDEX idx_evaluation_criteria_template_id
  ON evaluation_criteria (template_id);

-- ============================================================
-- employee_notes indexes
-- ============================================================
CREATE INDEX idx_employee_notes_employee_id
  ON employee_notes (employee_id);

-- ============================================================
-- attendance_locks indexes
-- ============================================================
CREATE INDEX idx_attendance_locks_branch_week
  ON attendance_locks (branch_id, week_start);

-- ============================================================
-- attendance: partial index on active records (ISSUE-5 fix)
-- Two-step query in getAttendanceSummary reads status IN ('1','0.5')
-- for date ranges. Partial index dramatically reduces scan size.
-- ============================================================
CREATE INDEX idx_attendance_status_present
  ON attendance (schedule_id, date)
  WHERE status IN ('1', '0.5');

CREATE INDEX idx_office_attendance_status_present
  ON office_attendance (branch_id, date)
  WHERE status IN ('1', '0.5');
