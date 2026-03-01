-- ============================================================================
-- Migration 026: Fix student enrollment trigger ON CONFLICT on partial index
-- PostgreSQL does not support ON CONFLICT with partial unique indexes.
-- Replace with NOT EXISTS check instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_student_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stage = 'da_dang_ky'
    AND OLD.current_stage IS DISTINCT FROM 'da_dang_ky' THEN

    -- Only insert if no student record exists for this lead
    IF NOT EXISTS (
      SELECT 1 FROM public.students WHERE lead_id = NEW.id
    ) THEN
      INSERT INTO public.students (lead_id, enrollment_date, status, renewal_status)
      VALUES (
        NEW.id,
        CURRENT_DATE,
        'active',
        'pending'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
