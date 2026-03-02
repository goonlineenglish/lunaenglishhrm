-- ============================================================================
-- Migration 028: Update stage trigger + checklist for renamed stages
-- da_tu_van label → "Đã tư vấn / Đang nurture" (UI only)
-- dang_nurture label → "Kiểm tra đầu vào" (UI only)
-- DB enum values unchanged — only trigger timing + checklist defaults updated
-- ============================================================================

-- Update trigger: change dang_nurture reminder from 7 days to 48 hours
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
        -- Was 7 days for nurture, now 48h for "Kiểm tra đầu vào"
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (
          NEW.id,
          NOW() + INTERVAL '48 hours',
          'follow_up',
          NEW.assigned_to,
          'Nhắc kiểm tra đầu vào cho học viên'
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

-- Update checklist defaults for dang_nurture (now "Kiểm tra đầu vào")
UPDATE public.stage_next_step_configs
SET steps = '[
  {"id": "7", "label": "Liên hệ lên lịch kiểm tra đầu vào", "order": 1},
  {"id": "8", "label": "Gửi bài test đầu vào", "order": 2},
  {"id": "9", "label": "Đánh giá kết quả và tư vấn lộ trình", "order": 3}
]'
WHERE stage = 'dang_nurture';

-- Update checklist for da_tu_van (now "Đã tư vấn / Đang nurture")
UPDATE public.stage_next_step_configs
SET steps = '[
  {"id": "4", "label": "Gọi điện tư vấn chi tiết", "order": 1},
  {"id": "5", "label": "Gửi tài liệu tư vấn & content mẫu", "order": 2},
  {"id": "6", "label": "Follow up & nurture định kỳ", "order": 3}
]'
WHERE stage = 'da_tu_van';
