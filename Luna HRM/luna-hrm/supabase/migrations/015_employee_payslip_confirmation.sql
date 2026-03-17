-- Migration 015: Employee payslip email confirmation workflow
-- Adds employee_status, confirmation_token, dispute tracking to payslips
-- Adds confirmation_deadline to payroll_periods + updates status constraint

-- ─── 1. payslips: add 6 new columns ─────────────────────────────────────────

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS employee_status       TEXT    NOT NULL DEFAULT 'pending_send'
                                                          CHECK (employee_status IN ('pending_send','sent','confirmed','disputed')),
  ADD COLUMN IF NOT EXISTS employee_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employee_feedback     TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_token    TEXT    UNIQUE,
  ADD COLUMN IF NOT EXISTS dispute_count         INTEGER NOT NULL DEFAULT 0
                                                          CHECK (dispute_count >= 0 AND dispute_count <= 2),
  ADD COLUMN IF NOT EXISTS reminder_sent_at      TIMESTAMPTZ;

-- ─── 2. payroll_periods: add confirmation_deadline ───────────────────────────

ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ;

-- ─── 3. payroll_periods: extend status constraint to allow 'finalized' ───────
-- Drop old constraint (created in 001_create_all_tables.sql)

ALTER TABLE payroll_periods
  DROP CONSTRAINT IF EXISTS payroll_periods_status_check;

ALTER TABLE payroll_periods
  ADD CONSTRAINT payroll_periods_status_check
    CHECK (status IN ('draft','confirmed','sent','finalized'));

-- ─── 4. Index for token lookups (employee confirms via email link) ────────────

CREATE INDEX IF NOT EXISTS idx_payslips_confirmation_token
  ON payslips (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- ─── 5. Index for cron: find payslips due for auto-confirm ───────────────────

CREATE INDEX IF NOT EXISTS idx_payslips_employee_status
  ON payslips (employee_status, employee_confirmed_at)
  WHERE employee_status = 'sent';
