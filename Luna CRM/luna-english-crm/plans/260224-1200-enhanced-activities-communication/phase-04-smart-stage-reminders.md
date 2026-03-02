# Phase 04 — Smart Stage Next-Steps Reminders

## Context Links
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 01 DB](./phase-01-db-schema-stage-notes-activities.md), [Phase 03 Activities](./phase-03-scheduled-activity-management.md)
- Existing: `lib/constants/pipeline-stages.ts` (8 stages)
- Existing trigger: `supabase/migrations/010_create-stage-reminder-trigger.sql`
- Research: `research/researcher-01-activity-reminders.md`

## Overview
- **Priority**: P1
- **Status**: completed
- **Description**: When a lead enters a pipeline stage, automatically show a suggested next-steps checklist sourced from `stage_next_step_configs`. Track completion per lead. Remind advisor if lead stays in stage > X days without activity.

## Key Insights
- Default next steps already seeded in Phase 01 (configurable per stage)
- **IMPORTANT**: Existing trigger `create_stage_reminder()` in migration 010 — EXTEND this function, do NOT create a new trigger (avoid duplicate triggers on same table)
- "Smart" = context-aware suggestions, not hardcoded
- Two reminder types:
  1. **Stage entry**: "You just moved lead to Học thử — here are next steps"
  2. **Stale lead**: "Lead X has been in Học thử for 3 days with no activity"
- Next steps checklist stored as lead activity with `type='checklist'` (new enum value added in Phase 01)
- Config table `stage_next_step_configs` allows admin to edit the defaults (Phase 04 adds Settings UI for this)

## Requirements

### Functional
1. When lead moves to a new stage → show next-steps checklist in lead detail
2. Checklist items loaded from `stage_next_step_configs[stage]`
3. Each item can be checked off (tracked per lead)
4. "Stale lead" reminder: if lead stays in stage > threshold without any activity → notification
5. Admin can edit stage next-step configs in Settings page

### Non-functional
- Checklist state stored in DB (not browser only)
- Thresholds configurable (default: 3 days for most stages, 1 day for moi_tiep_nhan)

## Architecture

### Data Model: Track Checklist Completion
Store per-lead checklist progress in `lead_activities` with `type='checklist'` (new enum value):
```sql
-- When lead enters stage, trigger inserts checklist items as activities
INSERT INTO lead_activities (lead_id, type, content, metadata, created_by)
VALUES (lead_id, 'checklist', 'Gọi điện tiếp cận',
  '{"step_id": "1", "stage": "moi_tiep_nhan", "completed": false}',
  NULL);
-- Checking off = UPDATE lead_activities SET metadata = jsonb_set(metadata, '{completed}', 'true')
```

### PostgreSQL Trigger Enhancement (Migration 021)
**MERGE into existing `create_stage_reminder()` — do NOT create new trigger function.**
The existing trigger in migration 010 fires `AFTER UPDATE ON public.leads` — we extend it to also create checklist activities:
```sql
-- CREATE OR REPLACE the EXISTING function public.create_stage_reminder()
-- Keep existing reminder logic (moi_tiep_nhan 2h, dang_nurture 7d, cho_chot 3d)
-- ADD: after inserting reminder, also insert checklist activities from stage_next_step_configs
CREATE OR REPLACE FUNCTION public.create_stage_reminder()
RETURNS TRIGGER AS $$
DECLARE
  steps JSONB;
  step JSONB;
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    -- === EXISTING LOGIC (from migration 010) ===
    UPDATE public.follow_up_reminders
    SET status = 'skipped'
    WHERE lead_id = NEW.id AND status = 'pending';

    CASE NEW.current_stage
      WHEN 'moi_tiep_nhan' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (NEW.id, NOW() + INTERVAL '2 hours', 'follow_up', NEW.assigned_to,
                'Follow up with newly received lead');
      WHEN 'dang_nurture' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (NEW.id, NOW() + INTERVAL '7 days', 'follow_up', NEW.assigned_to,
                'Follow up with nurturing lead');
      WHEN 'cho_chot' THEN
        INSERT INTO public.follow_up_reminders (lead_id, remind_at, type, assigned_to, note)
        VALUES (NEW.id, NOW() + INTERVAL '3 days', 'close_reminder', NEW.assigned_to,
                'Reminder to close pending lead');
    END CASE;

    -- === NEW: insert checklist activities from config ===
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
          jsonb_build_object('step_id', step->>'id',
                             'stage', NEW.current_stage::text, 'completed', false)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- NOTE: No need to recreate trigger — CREATE OR REPLACE updates the function in-place
```

### Stale Lead Detection (HTTP Cron — NOT pg_cron)
Add to existing `/api/cron/check-overdue-reminders/route.ts` (section 3):
```ts
// Section 3: Stale lead detection
// Find leads with no activity in X days for their current stage
// Exclude da_dang_ky and mat_lead
// Skip if notification already sent today for same lead
// Insert notification for assigned advisor
const { data: staleLeads } = await supabase.rpc('find_stale_leads', { days_threshold: 3 })
// For each stale lead → insert notification
```

Create helper RPC function in migration:
```sql
CREATE OR REPLACE FUNCTION public.find_stale_leads(days_threshold INT DEFAULT 3)
RETURNS TABLE(lead_id UUID, assigned_to UUID, parent_name TEXT, student_name TEXT,
              current_stage TEXT, days_inactive INT) AS $$
  SELECT l.id, l.assigned_to, l.parent_name, l.student_name,
         l.current_stage::text, EXTRACT(day FROM NOW() - l.updated_at)::int
  FROM public.leads l
  WHERE l.current_stage NOT IN ('da_dang_ky', 'mat_lead')
    AND l.assigned_to IS NOT NULL
    AND l.updated_at < NOW() - (days_threshold || ' days')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_activities a
      WHERE a.lead_id = l.id AND a.created_at > NOW() - (days_threshold || ' days')::interval
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = l.assigned_to
        AND n.created_at > NOW() - INTERVAL '1 day'
        AND n.metadata->>'lead_id' = l.id::text
        AND n.type = 'reminder'
    );
$$ LANGUAGE sql SECURITY DEFINER;
```

### UI: Next Steps Checklist Panel
**`stage-next-steps-checklist.tsx`**
```tsx
// Shows in lead detail sheet when activities tab is active
// Lists checklist activities for current stage
// Each item: checkbox + label + "Thêm activity" shortcut button
// Checking off → server action to mark completed
// Shows progress: "2/4 bước hoàn thành"
```

### Settings: Next Steps Config
**`stage-config-settings.tsx`** (add to Settings page)
```tsx
// Admin-only section in /settings
// For each stage: show list of default next steps
// Edit/add/remove steps
// Save → updateStageNextStepsConfig() server action
```

## Related Code Files

### To Create
- `supabase/migrations/021_extend-stage-trigger-with-checklist.sql` — extends existing create_stage_reminder(), adds find_stale_leads()
- `components/pipeline/stage-next-steps-checklist.tsx` (~120 lines)
- `components/settings/stage-config-settings.tsx` (~130 lines)

### To Update
- `lib/actions/activity-actions.ts` — add `toggleChecklistItem`, `getStageChecklist`
- `components/pipeline/lead-detail-activities.tsx` — add checklist section above activity list; add `checklist` to ACTIVITY_ICONS/ACTIVITY_LABELS
- `app/api/cron/check-overdue-reminders/route.ts` — add section 3: stale lead detection
- `components/settings/integration-settings.tsx` (or create separate settings section for stage config)

## Implementation Steps

1. **Migration 021**: Extend `create_stage_reminder()` to also insert checklist activities; add `find_stale_leads()` RPC
2. **Server actions**: `getStageChecklist(leadId)`, `toggleChecklistItem(activityId, completed)`
3. **Checklist component**: `stage-next-steps-checklist.tsx`
   - Load checklist activities filtered by `type='checklist'` AND `metadata->stage = currentStage`
   - Checkbox items with completion state
   - Progress counter
4. **Settings config UI**: `stage-config-settings.tsx`
   - List stages, show current next steps
   - Add/edit/remove items
   - Admin-only visibility
5. **Integrate** checklist into lead detail sheet (above or within Activities tab)
6. **Extend cron**: Add stale lead detection to `check-overdue-reminders` route

## Todo List
- [x] Migration 021: extend trigger + add find_stale_leads RPC
- [x] Add getStageChecklist + toggleChecklistItem server actions
- [x] Create stage-next-steps-checklist.tsx
- [x] Create stage-config-settings.tsx
- [x] Integrate checklist into lead-detail-activities.tsx
- [x] Add stale lead detection to cron route
- [x] Add stage config to settings page

## Success Criteria
- Moving lead to new stage → checklist items appear automatically
- Checking off items → persists in DB
- After 3 days without activity → advisor receives notification
- Admin can edit next steps per stage in Settings
- Progress "X/Y bước" displayed per checklist

## Risk Assessment
- **Medium**: Trigger inserts many activity rows — need to check volume (3-7 rows per stage change is acceptable)
- **Low**: Stale lead check via HTTP cron is read-only + targeted notifications
- **Medium**: Existing activity list may need filtering to separate checklist vs regular activities

## Security Considerations
- `toggleChecklistItem` validates that advisor owns the lead
- Stage config updates admin-only (check role in server action)
- Stale lead notifications use SECURITY DEFINER with targeted query (no data leak)

## Next Steps
- Phase 05: Email Communication
- Phase 06: Zalo OA Messaging
