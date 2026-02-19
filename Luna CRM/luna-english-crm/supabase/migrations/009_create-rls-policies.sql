-- ============================================================================
-- Migration 009: Enable RLS and create access policies for all tables
-- ============================================================================

-- ============================================================================
-- Helper function: get the role of the currently authenticated user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Enable Row Level Security on all tables
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all user records
CREATE POLICY admin_users_all ON public.users
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read all users (for assignment dropdowns etc.)
CREATE POLICY advisor_users_select ON public.users
  FOR SELECT
  USING (public.get_user_role() = 'advisor');

-- Advisor: can update own profile only
CREATE POLICY advisor_users_update_own ON public.users
  FOR UPDATE
  USING (id = auth.uid() AND public.get_user_role() = 'advisor')
  WITH CHECK (id = auth.uid() AND public.get_user_role() = 'advisor');

-- Marketing: can read all users
CREATE POLICY marketing_users_select ON public.users
  FOR SELECT
  USING (public.get_user_role() = 'marketing');

-- ============================================================================
-- LEADS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all leads
CREATE POLICY admin_leads_all ON public.leads
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read all leads (for Kanban board visibility)
CREATE POLICY advisor_leads_select ON public.leads
  FOR SELECT
  USING (public.get_user_role() = 'advisor');

-- Advisor: can insert leads (new leads are typically unassigned or self-assigned)
CREATE POLICY advisor_leads_insert ON public.leads
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

-- Advisor: can update leads assigned to them or unassigned leads
CREATE POLICY advisor_leads_update ON public.leads
  FOR UPDATE
  USING (
    public.get_user_role() = 'advisor'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

-- Marketing: read-only access to all leads
CREATE POLICY marketing_leads_select ON public.leads
  FOR SELECT
  USING (public.get_user_role() = 'marketing');

-- ============================================================================
-- LEAD ACTIVITIES TABLE POLICIES
-- ============================================================================

-- Admin: full access to all activities
CREATE POLICY admin_activities_all ON public.lead_activities
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read all activities (for lead timeline context)
CREATE POLICY advisor_activities_select ON public.lead_activities
  FOR SELECT
  USING (public.get_user_role() = 'advisor');

-- Advisor: can insert activities they create
CREATE POLICY advisor_activities_insert ON public.lead_activities
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  );

-- Advisor: can update own activities
CREATE POLICY advisor_activities_update ON public.lead_activities
  FOR UPDATE
  USING (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  );

-- Advisor: can delete own activities
CREATE POLICY advisor_activities_delete ON public.lead_activities
  FOR DELETE
  USING (
    public.get_user_role() = 'advisor'
    AND created_by = auth.uid()
  );

-- Marketing: read-only access to all activities
CREATE POLICY marketing_activities_select ON public.lead_activities
  FOR SELECT
  USING (public.get_user_role() = 'marketing');

-- ============================================================================
-- FOLLOW-UP REMINDERS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all reminders
CREATE POLICY admin_reminders_all ON public.follow_up_reminders
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read own reminders
CREATE POLICY advisor_reminders_select ON public.follow_up_reminders
  FOR SELECT
  USING (
    public.get_user_role() = 'advisor'
    AND assigned_to = auth.uid()
  );

-- Advisor: can insert reminders assigned to themselves
CREATE POLICY advisor_reminders_insert ON public.follow_up_reminders
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND assigned_to = auth.uid()
  );

-- Advisor: can update own reminders (mark done/skipped)
CREATE POLICY advisor_reminders_update ON public.follow_up_reminders
  FOR UPDATE
  USING (
    public.get_user_role() = 'advisor'
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND assigned_to = auth.uid()
  );

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all students
CREATE POLICY admin_students_all ON public.students
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read all students
CREATE POLICY advisor_students_select ON public.students
  FOR SELECT
  USING (public.get_user_role() = 'advisor');

-- Marketing: can read all students
CREATE POLICY marketing_students_select ON public.students
  FOR SELECT
  USING (public.get_user_role() = 'marketing');

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all notifications
CREATE POLICY admin_notifications_all ON public.notifications
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: can read own notifications
CREATE POLICY advisor_notifications_select ON public.notifications
  FOR SELECT
  USING (
    public.get_user_role() = 'advisor'
    AND user_id = auth.uid()
  );

-- Advisor: can update own notifications (mark as read)
CREATE POLICY advisor_notifications_update ON public.notifications
  FOR UPDATE
  USING (
    public.get_user_role() = 'advisor'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'advisor'
    AND user_id = auth.uid()
  );

-- Marketing: can read own notifications
CREATE POLICY marketing_notifications_select ON public.notifications
  FOR SELECT
  USING (
    public.get_user_role() = 'marketing'
    AND user_id = auth.uid()
  );

-- Marketing: can update own notifications (mark as read)
CREATE POLICY marketing_notifications_update ON public.notifications
  FOR UPDATE
  USING (
    public.get_user_role() = 'marketing'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'marketing'
    AND user_id = auth.uid()
  );

-- ============================================================================
-- INTEGRATION TOKENS TABLE POLICIES
-- ============================================================================

-- Admin: full access to integration tokens
CREATE POLICY admin_integration_tokens_all ON public.integration_tokens
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================================
-- WEBHOOK EVENTS TABLE POLICIES
-- ============================================================================

-- Admin: full access to webhook events
CREATE POLICY admin_webhook_events_all ON public.webhook_events
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');
