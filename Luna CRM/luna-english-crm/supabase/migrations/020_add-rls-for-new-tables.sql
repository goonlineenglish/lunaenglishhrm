-- ============================================================================
-- Migration 020: RLS policies for new tables (016-019)
-- ============================================================================

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================
ALTER TABLE public.lead_stage_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_next_step_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zalo_message_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LEAD_STAGE_NOTES POLICIES
-- ============================================================================

-- Admin: full access
CREATE POLICY admin_stage_notes_all ON public.lead_stage_notes
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: view notes for leads assigned to them
CREATE POLICY advisor_stage_notes_select ON public.lead_stage_notes
  FOR SELECT
  USING (
    public.get_user_role() = 'advisor'
    AND lead_id IN (
      SELECT id FROM public.leads WHERE assigned_to = auth.uid()
    )
  );

-- Advisor: insert notes for leads assigned to them
CREATE POLICY advisor_stage_notes_insert ON public.lead_stage_notes
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND lead_id IN (
      SELECT id FROM public.leads WHERE assigned_to = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Advisor: update own notes
CREATE POLICY advisor_stage_notes_update ON public.lead_stage_notes
  FOR UPDATE
  USING (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  );

-- Marketing: read-only for leads
CREATE POLICY marketing_stage_notes_select ON public.lead_stage_notes
  FOR SELECT
  USING (public.get_user_role() = 'marketing');

-- ============================================================================
-- STAGE_NEXT_STEP_CONFIGS POLICIES (config data: all read, admin write)
-- ============================================================================

-- Admin: full access
CREATE POLICY admin_next_step_configs_all ON public.stage_next_step_configs
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- All authenticated: read access (config data)
CREATE POLICY authenticated_next_step_configs_select ON public.stage_next_step_configs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- EMAIL_TEMPLATES POLICIES (admin write, all authenticated read)
-- ============================================================================

-- Admin: full access
CREATE POLICY admin_email_templates_all ON public.email_templates
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- All authenticated: read access
CREATE POLICY authenticated_email_templates_select ON public.email_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- ZALO_MESSAGE_TEMPLATES POLICIES (admin write, all authenticated read)
-- ============================================================================

-- Admin: full access
CREATE POLICY admin_zalo_templates_all ON public.zalo_message_templates
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- All authenticated: read access
CREATE POLICY authenticated_zalo_templates_select ON public.zalo_message_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
