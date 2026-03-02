-- ============================================================================
-- Migration 010: Auto-create reminders on lead stage change
-- ============================================================================

-- Function: create a follow-up reminder when a lead's stage changes
CREATE OR REPLACE FUNCTION public.create_stage_reminder()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when the stage actually changed
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
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after leads are updated
CREATE TRIGGER on_lead_stage_changed
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_stage_reminder();
