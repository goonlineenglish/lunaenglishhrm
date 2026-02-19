-- ============================================================================
-- Migration 003: Create lead_activities table
-- ============================================================================

-- Enum: types of activities that can be logged against a lead
CREATE TYPE public.lead_activity_type AS ENUM (
  'call',
  'message',
  'meeting',
  'note',
  'stage_change',
  'trial_booked'
);

-- Lead activities table: activity log / timeline for each lead
CREATE TABLE public.lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  type public.lead_activity_type NOT NULL,
  content TEXT,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: fetch activity timeline for a lead sorted by newest first
CREATE INDEX idx_lead_activities_lead_id_created_at
  ON public.lead_activities (lead_id, created_at DESC);

-- Index: filter activities by type
CREATE INDEX idx_lead_activities_type
  ON public.lead_activities (type);

-- Index: filter activities by creator
CREATE INDEX idx_lead_activities_created_by
  ON public.lead_activities (created_by);
