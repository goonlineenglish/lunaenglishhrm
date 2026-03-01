-- ============================================================================
-- Migration 025: Fix CASE missing ELSE in create_stage_reminder trigger
-- Without ELSE, PostgreSQL throws "case not found" for stages that don't
-- need a reminder (da_tu_van, dat_lich_hoc_thu, dang_hoc_thu, da_dang_ky, mat_lead)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_stage_reminder()
RETURNS TRIGGER AS $$
DECLARE
  steps JSONB;
  step JSONB;
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    -- Cancel all existing pending reminders for this lead
    UPDATE public.follow_up_reminders
    SET status = 'skipped'
    WHERE lead_id = NEW.id
      AND status = 'pending';

    -- Create a new reminder based on the new stage
    CASE NEW.current_stage
      WHEN 'moi_tiep_nhan' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (
          NEW.id,
          NOW() + INTERVAL '2 hours',
          'follow_up',
          NEW.assigned_to,
          'Follow up with newly received lead'
        );
      WHEN 'dang_nurture' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (
          NEW.id,
          NOW() + INTERVAL '7 days',
          'follow_up',
          NEW.assigned_to,
          'Follow up with nurturing lead'
        );
      WHEN 'cho_chot' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (
          NEW.id,
          NOW() + INTERVAL '3 days',
          'close_reminder',
          NEW.assigned_to,
          'Reminder to close pending lead'
        );
      ELSE
        -- No reminder needed for: da_tu_van, dat_lich_hoc_thu, dang_hoc_thu, da_dang_ky, mat_lead
        NULL;
    END CASE;

    -- Delete old uncompleted checklist items for previous stage
    DELETE FROM public.lead_activities
    WHERE lead_id = NEW.id
      AND type = 'checklist'
      AND (metadata->>'completed')::boolean = false
      AND metadata->>'stage' = OLD.current_stage::text;

    -- Load next steps for the new stage
    SELECT s.steps INTO steps
    FROM public.stage_next_step_configs s
    WHERE s.stage = NEW.current_stage
    LIMIT 1;

    IF steps IS NOT NULL THEN
      FOR step IN SELECT * FROM jsonb_array_elements(steps)
      LOOP
        INSERT INTO public.lead_activities (lead_id, type, content, metadata)
        VALUES (
          NEW.id,
          'checklist',
          step->>'label',
          jsonb_build_object(
            'step_id', step->>'id',
            'stage', NEW.current_stage::text,
            'completed', false
          )
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
