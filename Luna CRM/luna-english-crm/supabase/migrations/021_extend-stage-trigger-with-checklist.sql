-- ============================================================================
-- Migration 021: Extend stage trigger with checklist + stale lead detection
-- Adds checklist activity creation to existing create_stage_reminder()
-- Adds find_stale_leads() RPC for cron-based stale lead notifications
-- ============================================================================

-- Extend create_stage_reminder() to also insert checklist activities
-- from stage_next_step_configs when a lead changes stage
CREATE OR REPLACE FUNCTION public.create_stage_reminder()
RETURNS TRIGGER AS $$
DECLARE
  steps JSONB;
  step JSONB;
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    -- === EXISTING LOGIC (from migration 010) ===
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

    -- === NEW: insert checklist activities from stage config ===
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
-- NOTE: No need to recreate trigger — CREATE OR REPLACE updates the function in-place


-- ============================================================================
-- RPC: find_stale_leads — leads with no activity beyond threshold
-- Used by HTTP cron to generate stale-lead notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_stale_leads(days_threshold INT DEFAULT 3)
RETURNS TABLE(
  lead_id UUID,
  assigned_to UUID,
  parent_name TEXT,
  student_name TEXT,
  current_stage TEXT,
  days_inactive INT
) AS $$
  SELECT
    l.id,
    l.assigned_to,
    l.parent_name,
    l.student_name,
    l.current_stage::text,
    EXTRACT(day FROM NOW() - l.updated_at)::int
  FROM public.leads l
  WHERE l.current_stage NOT IN ('da_dang_ky', 'mat_lead')
    AND l.assigned_to IS NOT NULL
    AND l.updated_at < NOW() - (days_threshold || ' days')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_activities a
      WHERE a.lead_id = l.id
        AND a.created_at > NOW() - (days_threshold || ' days')::interval
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = l.assigned_to
        AND n.created_at > NOW() - INTERVAL '1 day'
        AND n.metadata->>'lead_id' = l.id::text
        AND n.type = 'reminder'
    );
$$ LANGUAGE sql SECURITY DEFINER;
