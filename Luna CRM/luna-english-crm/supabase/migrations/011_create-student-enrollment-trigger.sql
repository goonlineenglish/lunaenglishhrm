-- ============================================================================
-- Migration 011: Auto-create student when lead reaches da_dang_ky
-- ============================================================================

-- Add unique constraint on lead_id to prevent duplicate student records per lead
CREATE UNIQUE INDEX idx_students_lead_id_unique
  ON public.students (lead_id)
  WHERE lead_id IS NOT NULL;

-- Function: insert a student record when a lead is enrolled
CREATE OR REPLACE FUNCTION public.create_student_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when stage changes TO da_dang_ky (and wasn't before)
  IF NEW.current_stage = 'da_dang_ky'
    AND OLD.current_stage IS DISTINCT FROM 'da_dang_ky' THEN
    INSERT INTO public.students (lead_id, enrollment_date, status, renewal_status)
    VALUES (
      NEW.id,
      CURRENT_DATE,
      'active',
      'pending'
    )
    ON CONFLICT (lead_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after leads are updated
CREATE TRIGGER on_lead_enrolled
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_on_enrollment();
