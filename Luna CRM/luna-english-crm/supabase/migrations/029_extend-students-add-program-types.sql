-- ============================================================================
-- Migration 029: Extend students for Student Hub + add new program_type values
-- ============================================================================

-- Add new program variants for Student Hub reporting/filtering.
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'primary_basic';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'secondary_basic';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'secondary_advanced';

-- Extend students with profile + tuition/sheet-sync fields.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS teacher_name TEXT,
  ADD COLUMN IF NOT EXISTS tuition_amount NUMERIC(12, 0),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS program_type public.program_type,
  ADD COLUMN IF NOT EXISTS sheet_row_index INTEGER;

-- Query performance indexes for table/list filters.
CREATE INDEX IF NOT EXISTS idx_students_program_type ON public.students (program_type);
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON public.students (payment_status);
CREATE INDEX IF NOT EXISTS idx_students_teacher_name ON public.students (teacher_name);

-- Add constraints only once (safe for partially-applied environments).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_payment_status_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_payment_status_check
      CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'overdue'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_gender_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_gender_check
      CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_tuition_amount_non_negative_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_tuition_amount_non_negative_check
      CHECK (tuition_amount IS NULL OR tuition_amount >= 0);
  END IF;
END $$;

-- Backfill from linked lead when possible to reduce manual data entry.
UPDATE public.students AS s
SET
  date_of_birth = COALESCE(s.date_of_birth, l.student_dob),
  program_type = COALESCE(s.program_type, l.program_interest)
FROM public.leads AS l
WHERE s.lead_id = l.id
  AND (s.date_of_birth IS NULL OR s.program_type IS NULL);
