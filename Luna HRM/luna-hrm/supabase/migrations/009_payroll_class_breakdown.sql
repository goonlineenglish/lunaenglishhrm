-- Migration 009: Add per-class rate to class_schedules + class breakdown to payslips
-- Part of "Payroll Per-Class Rows" feature

-- Add per-class rate override to class_schedules (NULL = fallback to employees.rate_per_session)
ALTER TABLE class_schedules
  ADD COLUMN IF NOT EXISTS teacher_rate NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assistant_rate NUMERIC DEFAULT NULL;

COMMENT ON COLUMN class_schedules.teacher_rate IS 'Override rate for teacher in this class. NULL = use employees.rate_per_session';
COMMENT ON COLUMN class_schedules.assistant_rate IS 'Override rate for assistant in this class. NULL = use employees.rate_per_session';

-- Add class breakdown snapshot to payslips
ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS class_breakdown JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN payslips.class_breakdown IS 'Per-class session/rate snapshot [{class_code, class_name, sessions, rate, amount, default_sessions, default_rate}]';
