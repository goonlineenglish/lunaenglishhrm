-- ============================================================================
-- Migration 017: Alter lead_activities — add scheduling & recurrence columns
-- All new columns are nullable or have defaults for backward compatibility
-- ============================================================================

-- Extend the lead_activity_type enum (correct name from migration 003)
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'scheduled_call';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'trial_class';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'consultation';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'checklist';

-- Add scheduling columns
ALTER TABLE public.lead_activities
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS schedule_from      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_to        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS participant_ids    UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'once'
    CHECK (recurrence_pattern IN ('once', 'weekly')),
  ADD COLUMN IF NOT EXISTS recurrence_day_of_week SMALLINT
    CHECK (recurrence_day_of_week BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES public.lead_activities(id) ON DELETE CASCADE;

-- Index for cron: find upcoming/overdue scheduled activities
CREATE INDEX idx_lead_activities_schedule_to_status
  ON public.lead_activities (schedule_to, status)
  WHERE schedule_to IS NOT NULL;

-- Index for recurring activities: find by parent
CREATE INDEX idx_lead_activities_parent_id
  ON public.lead_activities (parent_activity_id)
  WHERE parent_activity_id IS NOT NULL;
