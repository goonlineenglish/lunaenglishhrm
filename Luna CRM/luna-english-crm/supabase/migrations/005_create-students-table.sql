-- ============================================================================
-- Migration 005: Create students table
-- ============================================================================

-- Enum: current enrollment status of a student
CREATE TYPE public.student_status AS ENUM (
  'active',
  'paused',
  'graduated',
  'dropped'
);

-- Enum: tracks whether a student has renewed their enrollment
CREATE TYPE public.renewal_status AS ENUM (
  'pending',
  'renewed',
  'lost'
);

-- Students table: enrolled students converted from leads
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  student_code TEXT UNIQUE,
  current_class TEXT,
  current_level TEXT,
  enrollment_date DATE,
  level_end_date DATE,
  status public.student_status NOT NULL DEFAULT 'active',
  renewal_status public.renewal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: filter students by enrollment status
CREATE INDEX idx_students_status ON public.students (status);

-- Index: query students approaching level end date (renewal alerts)
CREATE INDEX idx_students_level_end_date ON public.students (level_end_date);

-- Index: lookup student by lead conversion
CREATE INDEX idx_students_lead_id ON public.students (lead_id);

-- Index: composite for renewal dashboard (active students nearing end date)
CREATE INDEX idx_students_renewal
  ON public.students (status, renewal_status, level_end_date)
  WHERE status = 'active';

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_students_updated
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
