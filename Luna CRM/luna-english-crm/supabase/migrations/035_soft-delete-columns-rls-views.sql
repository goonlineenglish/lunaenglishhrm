-- ============================================================================
-- Migration 035: Soft Delete — columns, indexes, RLS updates, views, cascade trigger
-- ============================================================================

-- 1. Add deleted_at column to 4 tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.lead_stage_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Partial indexes for fast active-record queries
CREATE INDEX IF NOT EXISTS idx_leads_active ON public.leads (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_active ON public.lead_activities (id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. Update RLS policies — DROP + RECREATE with deleted_at IS NULL
-- ============================================================================

-- LEADS: advisor_leads_select
DROP POLICY IF EXISTS advisor_leads_select ON public.leads;
CREATE POLICY advisor_leads_select ON public.leads
  FOR SELECT
  USING (public.get_user_role() = 'advisor' AND deleted_at IS NULL);

-- LEADS: marketing_leads_select
DROP POLICY IF EXISTS marketing_leads_select ON public.leads;
CREATE POLICY marketing_leads_select ON public.leads
  FOR SELECT
  USING (public.get_user_role() = 'marketing' AND deleted_at IS NULL);

-- STUDENTS: advisor_students_select
DROP POLICY IF EXISTS advisor_students_select ON public.students;
CREATE POLICY advisor_students_select ON public.students
  FOR SELECT
  USING (public.get_user_role() = 'advisor' AND deleted_at IS NULL);

-- STUDENTS: marketing_students_select
DROP POLICY IF EXISTS marketing_students_select ON public.students;
CREATE POLICY marketing_students_select ON public.students
  FOR SELECT
  USING (public.get_user_role() = 'marketing' AND deleted_at IS NULL);

-- LEAD_ACTIVITIES: advisor_activities_select
DROP POLICY IF EXISTS advisor_activities_select ON public.lead_activities;
CREATE POLICY advisor_activities_select ON public.lead_activities
  FOR SELECT
  USING (public.get_user_role() = 'advisor' AND deleted_at IS NULL);

-- LEAD_ACTIVITIES: marketing_activities_select
DROP POLICY IF EXISTS marketing_activities_select ON public.lead_activities;
CREATE POLICY marketing_activities_select ON public.lead_activities
  FOR SELECT
  USING (public.get_user_role() = 'marketing' AND deleted_at IS NULL);

-- LEAD_STAGE_NOTES: advisor_stage_notes_select
DROP POLICY IF EXISTS advisor_stage_notes_select ON public.lead_stage_notes;
CREATE POLICY advisor_stage_notes_select ON public.lead_stage_notes
  FOR SELECT
  USING (
    public.get_user_role() = 'advisor'
    AND deleted_at IS NULL
    AND lead_id IN (SELECT id FROM public.leads WHERE assigned_to = auth.uid())
  );

-- LEAD_STAGE_NOTES: marketing_stage_notes_select
DROP POLICY IF EXISTS marketing_stage_notes_select ON public.lead_stage_notes;
CREATE POLICY marketing_stage_notes_select ON public.lead_stage_notes
  FOR SELECT
  USING (public.get_user_role() = 'marketing' AND deleted_at IS NULL);

-- ============================================================================
-- 4. Recreate 4 dashboard views with deleted_at IS NULL filter
-- ============================================================================

CREATE OR REPLACE VIEW public.lead_funnel AS
SELECT
  current_stage,
  COUNT(*) AS lead_count,
  CASE current_stage
    WHEN 'moi_tiep_nhan'    THEN 1
    WHEN 'da_tu_van'        THEN 2
    WHEN 'dang_nurture'     THEN 3
    WHEN 'dat_lich_hoc_thu' THEN 4
    WHEN 'dang_hoc_thu'     THEN 5
    WHEN 'cho_chot'         THEN 6
    WHEN 'da_dang_ky'       THEN 7
    WHEN 'mat_lead'         THEN 8
  END AS stage_order
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY current_stage
ORDER BY stage_order;

CREATE OR REPLACE VIEW public.lead_source_breakdown AS
SELECT
  source,
  COUNT(*) AS lead_count
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY source
ORDER BY lead_count DESC;

CREATE OR REPLACE VIEW public.advisor_performance AS
SELECT
  u.id AS advisor_id,
  u.full_name AS advisor_name,
  COUNT(l.id) AS total_leads,
  COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky') AS converted,
  CASE
    WHEN COUNT(l.id) > 0
    THEN ROUND(
      (COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky'))::NUMERIC
      / COUNT(l.id) * 100, 2
    )
    ELSE 0
  END AS conversion_rate
FROM public.users u
LEFT JOIN public.leads l ON l.assigned_to = u.id AND l.deleted_at IS NULL
WHERE u.role = 'advisor'
GROUP BY u.id, u.full_name
ORDER BY conversion_rate DESC;

CREATE OR REPLACE VIEW public.monthly_lead_trend AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS lead_count
FROM public.leads
WHERE deleted_at IS NULL
  AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- ============================================================================
-- 5. Update find_stale_leads() RPC to exclude soft-deleted leads
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_stale_leads(days_threshold INT DEFAULT 7)
RETURNS TABLE(
  id UUID,
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
  WHERE l.deleted_at IS NULL
    AND l.current_stage NOT IN ('da_dang_ky', 'mat_lead')
    AND l.assigned_to IS NOT NULL
    AND l.updated_at < NOW() - (days_threshold || ' days')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_activities a
      WHERE a.lead_id = l.id
        AND a.deleted_at IS NULL
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

-- ============================================================================
-- 6. Cascade trigger: soft-delete/restore lead → cascade to activities + stage notes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_soft_delete_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Cascade soft-delete: lead deleted → cascade to children
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.lead_activities SET deleted_at = NEW.deleted_at
      WHERE lead_id = NEW.id AND deleted_at IS NULL;
    UPDATE public.lead_stage_notes SET deleted_at = NEW.deleted_at
      WHERE lead_id = NEW.id AND deleted_at IS NULL;
  END IF;
  -- Cascade restore: lead restored → restore cascade-deleted children
  -- Uses deleted_at = OLD.deleted_at to only restore items cascade-deleted at same time
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE public.lead_activities SET deleted_at = NULL
      WHERE lead_id = NEW.id AND deleted_at = OLD.deleted_at;
    UPDATE public.lead_stage_notes SET deleted_at = NULL
      WHERE lead_id = NEW.id AND deleted_at = OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_soft_delete_lead ON public.leads;
CREATE TRIGGER trg_cascade_soft_delete_lead
  AFTER UPDATE OF deleted_at ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.cascade_soft_delete_lead();
