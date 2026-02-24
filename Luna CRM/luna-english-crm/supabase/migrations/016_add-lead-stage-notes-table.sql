-- ============================================================================
-- Migration 016: Create lead_stage_notes table
-- Stores note/result/next_steps per lead per pipeline stage (with history)
-- ============================================================================

CREATE TABLE public.lead_stage_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage       public.lead_stage NOT NULL,
  note        TEXT,
  result      TEXT,
  next_steps  TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fetch notes for a lead sorted by newest first
CREATE INDEX idx_lead_stage_notes_lead_id
  ON public.lead_stage_notes (lead_id, created_at DESC);

-- Index: filter by stage
CREATE INDEX idx_lead_stage_notes_stage
  ON public.lead_stage_notes (stage);

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_lead_stage_notes_updated
  BEFORE UPDATE ON public.lead_stage_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
