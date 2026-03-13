-- Migration: add deductions column to payslips table
-- Tracks recurring deductions from salary_components (separate from penalties).
-- Previously calculated but not persisted, causing GROSS - displayed_deductions != NET.

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS deductions BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN payslips.deductions IS 'Recurring deductions from salary_components table';
