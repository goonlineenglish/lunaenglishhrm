-- ============================================================
-- Luna HRM — Migration 001: Create All Tables
-- Order respects FK dependencies (staged circular FK for branches/employees)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TRIGGER FUNCTION: auto-update updated_at on any row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE 1: branches
-- Created WITHOUT manager_id FK first (staged circular FK)
-- manager_id FK added later via ALTER TABLE after employees exists
-- ============================================================
CREATE TABLE branches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  address     TEXT,
  phone       TEXT,
  manager_id  UUID,       -- FK added below after employees is created
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 2: employees
-- FK → branches. Includes full extended profile fields.
-- ============================================================
CREATE TABLE employees (
  id                  UUID        PRIMARY KEY,  -- same UUID as auth.users.id
  branch_id           UUID        REFERENCES branches(id) ON DELETE SET NULL,
  employee_code       TEXT        NOT NULL,
  full_name           TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  phone               TEXT,
  position            TEXT        NOT NULL CHECK (position IN ('teacher', 'assistant', 'office', 'admin')),
  role                TEXT        NOT NULL CHECK (role IN ('admin', 'branch_manager', 'accountant', 'employee')),
  rate_per_session    BIGINT      NOT NULL DEFAULT 0,
  sub_rate            BIGINT      NOT NULL DEFAULT 0,
  has_labor_contract  BOOLEAN     NOT NULL DEFAULT false,
  dependent_count     INT         NOT NULL DEFAULT 0 CHECK (dependent_count >= 0),
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  join_date           DATE,
  -- Extended profile fields
  date_of_birth       DATE,
  id_number           TEXT,                    -- CCCD / CMND / Passport
  id_issue_date       DATE,
  id_issue_place      TEXT,
  address             TEXT,
  emergency_contact   TEXT,                    -- "Nguyen Van A — 0901234567"
  bank_account_number TEXT,
  bank_name           TEXT,
  nationality         TEXT,                    -- important for foreign teachers
  qualifications      TEXT,                    -- "IELTS 8.0, CELTA, TESOL"
  teaching_license    TEXT,
  characteristics     TEXT,                    -- BM notes: personality, strengths
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, employee_code)
);

-- Case-insensitive unique email index
CREATE UNIQUE INDEX idx_employees_email_ci ON employees (lower(email));

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STAGED CIRCULAR FK: branches.manager_id → employees(id)
-- Now that employees table exists, add the FK constraint
-- ============================================================
ALTER TABLE branches
  ADD CONSTRAINT fk_branches_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 3: class_schedules
-- FK → branches, employees. CHECK teacher_id <> assistant_id.
-- ============================================================
CREATE TABLE class_schedules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  class_code   TEXT        NOT NULL,
  class_name   TEXT        NOT NULL,
  shift_time   TEXT        NOT NULL,           -- "19:00-20:30"
  days_of_week INT[]       NOT NULL,           -- [2,4,6] = Mon,Wed,Fri
  teacher_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  assistant_id UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, class_code),
  CONSTRAINT chk_teacher_ne_assistant CHECK (teacher_id <> assistant_id),
  CONSTRAINT chk_days_of_week CHECK (
    days_of_week <@ ARRAY[1,2,3,4,5,6,7]::INT[]
  )
);

CREATE TRIGGER trg_class_schedules_updated_at
  BEFORE UPDATE ON class_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 4: attendance
-- FK → class_schedules, employees. No direct branch_id — RLS uses JOIN.
-- ============================================================
CREATE TABLE attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      TEXT        NOT NULL DEFAULT '1' CHECK (status IN ('1', '0', 'KP', '0.5')),
  marked_by   UUID        REFERENCES employees(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, employee_id, date)
);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 5: office_attendance
-- Daily attendance for VP/office staff (not class-based).
-- ============================================================
CREATE TABLE office_attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      TEXT        NOT NULL DEFAULT '1' CHECK (status IN ('1', '0', 'KP', '0.5')),
  marked_by   UUID        REFERENCES employees(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);

CREATE TRIGGER trg_office_attendance_updated_at
  BEFORE UPDATE ON office_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 6: attendance_locks
-- Prevents edits to closed attendance weeks per branch.
-- ============================================================
CREATE TABLE attendance_locks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  week_start  DATE        NOT NULL,            -- Monday of the locked week
  locked_by   UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, week_start)
);

-- ============================================================
-- TABLE 7: employee_weekly_notes
-- Structured notes: substitute, bonus, penalty, extra_job, general.
-- Single source of truth for payroll adjustments.
-- ============================================================
CREATE TABLE employee_weekly_notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  week_start    DATE        NOT NULL,          -- Monday of the week
  employee_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  note_type     TEXT        NOT NULL CHECK (note_type IN ('substitute', 'bonus', 'penalty', 'extra_job', 'general')),
  description   TEXT        NOT NULL,
  amount        NUMERIC,                       -- nullable: sessions count or VND amount
  amount_unit   TEXT        CHECK (amount_unit IN ('sessions', 'vnd')),
  is_processed  BOOLEAN     NOT NULL DEFAULT false,
  processed_by  UUID        REFERENCES employees(id) ON DELETE SET NULL,
  created_by    UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_employee_weekly_notes_updated_at
  BEFORE UPDATE ON employee_weekly_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 8: kpi_evaluations
-- Monthly KPI for teaching assistants (5 criteria, /10 scale).
-- ============================================================
CREATE TABLE kpi_evaluations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  month            INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             INT         NOT NULL CHECK (year >= 2020),
  base_pass        BOOLEAN     NOT NULL DEFAULT false,  -- 4 mandatory criteria met?
  tsi_score        INT         NOT NULL DEFAULT 0 CHECK (tsi_score BETWEEN 0 AND 1),
  tsi_comment      TEXT,
  funtime_score    INT         NOT NULL DEFAULT 0 CHECK (funtime_score BETWEEN 0 AND 3),
  funtime_comment  TEXT,
  parent_score     INT         NOT NULL DEFAULT 0 CHECK (parent_score BETWEEN 0 AND 2),
  parent_comment   TEXT,
  student_score    INT         NOT NULL DEFAULT 0 CHECK (student_score BETWEEN 0 AND 3),
  student_comment  TEXT,
  demeanor_score   INT         NOT NULL DEFAULT 0 CHECK (demeanor_score BETWEEN 0 AND 1),
  demeanor_comment TEXT,
  total_score      INT         NOT NULL DEFAULT 0,     -- computed: sum of all scores (0-10)
  bonus_amount     BIGINT      NOT NULL DEFAULT 0,     -- total_score × 50000 (0 if base_pass=false)
  evaluated_by     UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, month, year)
);

CREATE TRIGGER trg_kpi_evaluations_updated_at
  BEFORE UPDATE ON kpi_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 9: payroll_periods
-- Month-level payroll cycle per branch (draft → confirmed → sent).
-- ============================================================
CREATE TABLE payroll_periods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  month        INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INT         NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  total_gross  BIGINT      NOT NULL DEFAULT 0,
  total_net    BIGINT      NOT NULL DEFAULT 0,
  created_by   UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  confirmed_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, month, year)
);

CREATE TRIGGER trg_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 10: payslips
-- One per employee per payroll period. sessions = NUMERIC (supports 0.5).
-- ============================================================
CREATE TABLE payslips (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id   UUID        NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id         UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  branch_id           UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  position            TEXT        NOT NULL CHECK (position IN ('teacher', 'assistant', 'office')),
  sessions_worked     NUMERIC     NOT NULL DEFAULT 0,   -- NUMERIC supports 0.5
  rate_per_session    BIGINT      NOT NULL DEFAULT 0,   -- snapshot at calc time
  teaching_pay        BIGINT      NOT NULL DEFAULT 0,
  substitute_sessions NUMERIC     NOT NULL DEFAULT 0,   -- NUMERIC supports 0.5
  substitute_rate     BIGINT      NOT NULL DEFAULT 0,   -- snapshot at calc time
  substitute_pay      BIGINT      NOT NULL DEFAULT 0,
  other_pay           BIGINT      NOT NULL DEFAULT 0,   -- phụ đạo, manual
  kpi_bonus           BIGINT      NOT NULL DEFAULT 0,   -- assistants only
  allowances          BIGINT      NOT NULL DEFAULT 0,
  gross_pay           BIGINT      NOT NULL DEFAULT 0,
  bhxh                BIGINT      NOT NULL DEFAULT 0,   -- 8% if has_labor_contract
  bhyt                BIGINT      NOT NULL DEFAULT 0,   -- 1.5% if has_labor_contract
  bhtn                BIGINT      NOT NULL DEFAULT 0,   -- 1% if has_labor_contract
  tncn                BIGINT      NOT NULL DEFAULT 0,   -- progressive tax
  penalties           BIGINT      NOT NULL DEFAULT 0,
  net_pay             BIGINT      NOT NULL DEFAULT 0,
  extra_notes         TEXT,
  email_sent_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payroll_period_id, employee_id)
);

CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 11: salary_components
-- Pre-configured recurring allowances/deductions per employee.
-- ============================================================
CREATE TABLE salary_components (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_type   TEXT        NOT NULL CHECK (component_type IN ('allowance', 'deduction')),
  name             TEXT        NOT NULL,
  amount           BIGINT      NOT NULL DEFAULT 0,
  is_recurring     BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_salary_components_updated_at
  BEFORE UPDATE ON salary_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 12: evaluation_templates
-- Admin-defined criteria sets for structured employee evaluations.
-- ============================================================
CREATE TABLE evaluation_templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  applies_to       TEXT        NOT NULL CHECK (applies_to IN ('teacher', 'assistant', 'office', 'all')),
  max_total_score  INT         NOT NULL DEFAULT 100,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_by       UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_evaluation_templates_updated_at
  BEFORE UPDATE ON evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 13: evaluation_criteria
-- Individual scoring criteria within a template.
-- ============================================================
CREATE TABLE evaluation_criteria (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  max_score    INT         NOT NULL DEFAULT 10,
  weight       NUMERIC     NOT NULL DEFAULT 1.0,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 14: evaluation_periods
-- Time-bounded evaluation periods (Kì 1/2026, Quý 2/2026).
-- ============================================================
CREATE TABLE evaluation_periods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by  UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 15: employee_evaluations
-- Structured evaluations per employee (periodic or ad-hoc).
-- ============================================================
CREATE TABLE employee_evaluations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id  UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  template_id   UUID        NOT NULL REFERENCES evaluation_templates(id) ON DELETE RESTRICT,
  period_id     UUID        REFERENCES evaluation_periods(id) ON DELETE SET NULL,  -- null = ad-hoc
  eval_type     TEXT        NOT NULL CHECK (eval_type IN ('periodic', 'ad_hoc')),
  total_score   NUMERIC     NOT NULL DEFAULT 0,
  overall_notes TEXT,
  bonus_impact  BIGINT,                        -- informational only, not auto-fed to payroll
  status        TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_employee_evaluations_updated_at
  BEFORE UPDATE ON employee_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 16: evaluation_scores
-- Per-criterion scores within a single employee evaluation.
-- ============================================================
CREATE TABLE evaluation_scores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID        NOT NULL REFERENCES employee_evaluations(id) ON DELETE CASCADE,
  criterion_id  UUID        NOT NULL REFERENCES evaluation_criteria(id) ON DELETE RESTRICT,
  score         NUMERIC     NOT NULL DEFAULT 0,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 17: employee_notes
-- Quick ad-hoc notes by BM/admin (not structured evaluations).
-- ============================================================
CREATE TABLE employee_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  note_type   TEXT        NOT NULL CHECK (note_type IN ('praise', 'warning', 'observation', 'general')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
