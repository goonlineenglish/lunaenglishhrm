-- ========================================
-- Migration 001: 001_create-users-table.sql
-- ========================================

-- ============================================================================
-- Migration 001: Create users table (synced with auth.users)
-- ============================================================================

-- Users table: mirrors auth.users with CRM-specific fields
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'advisor', 'marketing')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on role for RLS policy lookups
CREATE INDEX idx_users_role ON public.users (role);

-- Index on is_active for filtering active users
CREATE INDEX idx_users_is_active ON public.users (is_active);

-- ============================================================================
-- Trigger: auto-update updated_at on row modification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Trigger: auto-create public.users row when auth.users signs up
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'advisor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- Migration 002: 002_create-leads-table.sql
-- ========================================

-- ============================================================================
-- Migration 002: Create leads table with enums
-- ============================================================================

-- Enum: source channel where the lead originated
CREATE TYPE public.lead_source AS ENUM (
  'facebook',
  'zalo',
  'walk_in',
  'website',
  'phone',
  'referral'
);

-- Enum: pipeline stage for lead tracking (Vietnamese pipeline names)
CREATE TYPE public.lead_stage AS ENUM (
  'moi_tiep_nhan',     -- Mới tiếp nhận
  'da_tu_van',         -- Đã tư vấn
  'dang_nurture',      -- Đang nurture
  'dat_lich_hoc_thu',  -- Đặt lịch học thử
  'dang_hoc_thu',      -- Đang học thử
  'cho_chot',          -- Chờ chốt
  'da_dang_ky',        -- Đã đăng ký
  'mat_lead'           -- Mất lead
);

-- Enum: program types offered at Luna English
CREATE TYPE public.program_type AS ENUM (
  'buttercup',
  'primary_success',
  'secondary',
  'ielts'
);

-- Leads table: core CRM entity for tracking prospective students
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Student (child) information
  student_name TEXT,
  student_dob DATE,

  -- Parent (contact person) information
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  parent_address TEXT,

  -- Lead classification
  source public.lead_source NOT NULL DEFAULT 'walk_in',
  referral_code TEXT,
  program_interest public.program_type,
  current_stage public.lead_stage NOT NULL DEFAULT 'moi_tiep_nhan',

  -- Assignment and ownership
  assigned_to UUID REFERENCES public.users (id) ON DELETE SET NULL,
  expected_class TEXT,

  -- Additional context
  notes TEXT,
  lost_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: filter/sort by pipeline stage (Kanban board queries)
CREATE INDEX idx_leads_stage ON public.leads (current_stage);

-- Index: filter leads by assigned advisor
CREATE INDEX idx_leads_assigned ON public.leads (assigned_to);

-- Index: filter leads by source channel
CREATE INDEX idx_leads_source ON public.leads (source);

-- Index: sort leads by newest first
CREATE INDEX idx_leads_created ON public.leads (created_at DESC);

-- Index: composite for Kanban board queries (stage + assignment)
CREATE INDEX idx_leads_stage_assigned ON public.leads (current_stage, assigned_to);

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_leads_updated
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- Migration 003: 003_create-lead-activities-table.sql
-- ========================================

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

-- ========================================
-- Migration 004: 004_create-follow-up-reminders-table.sql
-- ========================================

-- ============================================================================
-- Migration 004: Create follow_up_reminders table
-- ============================================================================

-- Enum: categorizes the purpose of a reminder
CREATE TYPE public.reminder_type AS ENUM (
  'follow_up',
  'trial_reminder',
  'close_reminder',
  'renewal'
);

-- Enum: tracks whether a reminder has been acted upon
CREATE TYPE public.reminder_status AS ENUM (
  'pending',
  'done',
  'skipped'
);

-- Follow-up reminders table: scheduled tasks for advisors
CREATE TABLE public.follow_up_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  type public.reminder_type NOT NULL DEFAULT 'follow_up',
  status public.reminder_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.users (id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: query upcoming pending reminders efficiently (for cron/dashboard)
CREATE INDEX idx_reminders_pending_remind_at
  ON public.follow_up_reminders (remind_at)
  WHERE status = 'pending';

-- Index: filter reminders by assigned advisor
CREATE INDEX idx_reminders_assigned_to
  ON public.follow_up_reminders (assigned_to);

-- Index: filter reminders by lead
CREATE INDEX idx_reminders_lead_id
  ON public.follow_up_reminders (lead_id);

-- Index: filter by status for dashboard counts
CREATE INDEX idx_reminders_status
  ON public.follow_up_reminders (status);

-- ========================================
-- Migration 005: 005_create-students-table.sql
-- ========================================

-- ============================================================================
-- Migration 005: Create students table
-- ============================================================================

-- Enum: current enrollment status of a student
CREATE TYPE public.student_status AS ENUM (
  'active',
  'paused',
  'graduated',
  'dropped'
);

-- Enum: tracks whether a student has renewed their enrollment
CREATE TYPE public.renewal_status AS ENUM (
  'pending',
  'renewed',
  'lost'
);

-- Students table: enrolled students converted from leads
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  student_code TEXT UNIQUE,
  current_class TEXT,
  current_level TEXT,
  enrollment_date DATE,
  level_end_date DATE,
  status public.student_status NOT NULL DEFAULT 'active',
  renewal_status public.renewal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: filter students by enrollment status
CREATE INDEX idx_students_status ON public.students (status);

-- Index: query students approaching level end date (renewal alerts)
CREATE INDEX idx_students_level_end_date ON public.students (level_end_date);

-- Index: lookup student by lead conversion
CREATE INDEX idx_students_lead_id ON public.students (lead_id);

-- Index: composite for renewal dashboard (active students nearing end date)
CREATE INDEX idx_students_renewal
  ON public.students (status, renewal_status, level_end_date)
  WHERE status = 'active';

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_students_updated
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- Migration 006: 006_create-notifications-table.sql
-- ========================================

-- ============================================================================
-- Migration 006: Create notifications table
-- ============================================================================

-- Notifications table: in-app notifications for CRM users
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: fetch unread notifications for a user (notification bell badge)
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

-- Index: fetch all notifications for a user sorted by newest first
CREATE INDEX idx_notifications_user_created_at
  ON public.notifications (user_id, created_at DESC);

-- Index: filter notifications by type
CREATE INDEX idx_notifications_type
  ON public.notifications (type);

-- ========================================
-- Migration 007: 007_create-integration-tokens-table.sql
-- ========================================

-- ============================================================================
-- Migration 007: Create integration_tokens table
-- ============================================================================

-- Integration tokens table: OAuth tokens for Zalo/Facebook integrations
CREATE TABLE public.integration_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('zalo', 'facebook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: only one token record per provider
CREATE UNIQUE INDEX idx_integration_tokens_provider_unique
  ON public.integration_tokens (provider);

-- Index: quickly find active tokens by provider
CREATE INDEX idx_integration_tokens_active
  ON public.integration_tokens (provider, is_active)
  WHERE is_active = true;

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_integration_tokens_updated
  BEFORE UPDATE ON public.integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- Migration 008: 008_create-webhook-events-table.sql
-- ========================================

-- ============================================================================
-- Migration 008: Create webhook_events table
-- ============================================================================

-- Webhook events table: log of incoming webhooks from Zalo/Facebook
CREATE TABLE public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('zalo', 'facebook')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed')) DEFAULT 'received',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: query unprocessed/failed events by provider for retry logic
CREATE INDEX idx_webhook_events_provider_status
  ON public.webhook_events (provider, status);

-- Index: sort events by newest first for monitoring dashboard
CREATE INDEX idx_webhook_events_created_at_desc
  ON public.webhook_events (created_at DESC);

-- Index: filter by event_type for analytics
CREATE INDEX idx_webhook_events_event_type
  ON public.webhook_events (event_type);

-- Index: find failed events that need retry
CREATE INDEX idx_webhook_events_failed
  ON public.webhook_events (provider, created_at DESC)
  WHERE status = 'failed';

-- ========================================
-- Migration 009: 009_create-rls-policies.sql
-- ========================================

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

-- ========================================
-- Migration 010: 010_create-stage-reminder-trigger.sql
-- ========================================

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

-- ========================================
-- Migration 011: 011_create-student-enrollment-trigger.sql
-- ========================================

-- ============================================================================
-- Migration 011: Auto-create student when lead reaches da_dang_ky
-- ============================================================================

-- Add unique constraint on lead_id to prevent duplicate student records per lead
CREATE UNIQUE INDEX idx_students_lead_id_unique
  ON public.students (lead_id)
  WHERE lead_id IS NOT NULL;

-- Function: insert a student record when a lead is enrolled
CREATE OR REPLACE FUNCTION public.create_student_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when stage changes TO da_dang_ky (and wasn't before)
  IF NEW.current_stage = 'da_dang_ky'
    AND OLD.current_stage IS DISTINCT FROM 'da_dang_ky' THEN
    INSERT INTO public.students (lead_id, enrollment_date, status, renewal_status)
    VALUES (
      NEW.id,
      CURRENT_DATE,
      'active',
      'pending'
    )
    ON CONFLICT (lead_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after leads are updated
CREATE TRIGGER on_lead_enrolled
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_on_enrollment();

-- ========================================
-- Migration 012: 012_create-dashboard-views.sql
-- ========================================

-- ============================================================================
-- Migration 012: SQL views for dashboard analytics
-- ============================================================================

-- View: lead funnel — count of leads by pipeline stage in order
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
GROUP BY current_stage
ORDER BY stage_order;

-- View: lead source breakdown — count of leads by source
CREATE OR REPLACE VIEW public.lead_source_breakdown AS
SELECT
  source,
  COUNT(*) AS lead_count
FROM public.leads
GROUP BY source
ORDER BY lead_count DESC;

-- View: advisor performance — per-advisor conversion stats
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
LEFT JOIN public.leads l ON l.assigned_to = u.id
WHERE u.role = 'advisor'
GROUP BY u.id, u.full_name
ORDER BY conversion_rate DESC;

-- View: monthly lead trend — count of new leads by month for last 12 months
CREATE OR REPLACE VIEW public.monthly_lead_trend AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS lead_count
FROM public.leads
WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- ========================================
-- Migration 013: 013_create-reports-table.sql
-- ========================================

-- ============================================================================
-- Migration 013: Create reports table for weekly report storage
-- ============================================================================

-- Reports table: stores generated periodic reports
CREATE TABLE public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: lookup reports by type and period
CREATE INDEX idx_reports_type_period
  ON public.reports (report_type, period_start, period_end);

-- Index: sort reports by newest first
CREATE INDEX idx_reports_created_at
  ON public.reports (created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Admin: full access to reports
CREATE POLICY admin_reports_all ON public.reports
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ========================================
-- Migration 014: 014_create-message-queue-table.sql
-- ========================================

-- ============================================================================
-- Migration 014: Create message_queue table for message retry queue
-- ============================================================================

-- Message queue table: outbound message retry queue for Zalo/Facebook/etc.
CREATE TABLE public.message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: fetch messages ready for processing (pending/failed with retry time)
CREATE INDEX idx_message_queue_status_retry
  ON public.message_queue (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

-- Index: filter messages by lead
CREATE INDEX idx_message_queue_lead_id
  ON public.message_queue (lead_id);

-- Index: filter messages by provider
CREATE INDEX idx_message_queue_provider
  ON public.message_queue (provider);

-- Enable RLS
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- Admin: full access to message queue
CREATE POLICY admin_message_queue_all ON public.message_queue
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ========================================
-- Migration 015: 015_create-zalo-followers-table.sql
-- ========================================

-- ============================================================================
-- Migration 015: Create zalo_followers table for Zalo follower mapping
-- ============================================================================

-- Zalo followers table: maps Zalo OA followers to CRM leads
CREATE TABLE public.zalo_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zalo_user_id TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  display_name TEXT,
  avatar_url TEXT,
  followed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: lookup follower by lead
CREATE INDEX idx_zalo_followers_lead_id
  ON public.zalo_followers (lead_id);

-- Index: sort followers by follow date
CREATE INDEX idx_zalo_followers_followed_at
  ON public.zalo_followers (followed_at DESC);

-- Enable RLS
ALTER TABLE public.zalo_followers ENABLE ROW LEVEL SECURITY;

-- Admin: full access to zalo followers
CREATE POLICY admin_zalo_followers_all ON public.zalo_followers
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Advisor: read-only access to zalo followers
CREATE POLICY advisor_zalo_followers_select ON public.zalo_followers
  FOR SELECT
  USING (public.get_user_role() = 'advisor');

-- ========================================
-- Seed Data: seed.sql
-- ========================================

-- ============================================================================
-- Seed Data for Luna English CRM
-- ============================================================================
-- NOTE: This seed file is for local development only.
-- User IDs here are placeholders — in production, users are created via
-- Supabase Auth and the handle_new_user() trigger auto-creates public.users rows.
-- ============================================================================

-- Create sample users via auth.users (triggers handle_new_user)
-- In local dev, use Supabase Dashboard or supabase auth to create users.
-- The UUIDs below are for referencing in seed data only.

-- Sample lead data across all pipeline stages
INSERT INTO public.leads (student_name, student_dob, parent_name, parent_phone, parent_email, parent_address, source, program_interest, current_stage, notes) VALUES
  ('Nguyễn Minh Anh', '2018-03-15', 'Nguyễn Văn Hùng', '0912345678', 'hung.nguyen@email.com', '12 Tân Mai, Hoàng Mai, HN', 'facebook', 'buttercup', 'moi_tiep_nhan', 'PH quan tâm lớp Buttercup cho bé 8 tuổi'),
  ('Trần Bảo Ngọc', '2016-07-22', 'Trần Thị Lan', '0923456789', NULL, '45 Giáp Bát, Hoàng Mai, HN', 'zalo', 'primary_success', 'da_tu_van', 'Đã tư vấn qua Zalo, PH muốn biết thêm về lịch học'),
  ('Lê Hoàng Nam', '2017-11-01', 'Lê Thị Hoa', '0934567890', 'hoa.le@email.com', '78 Lĩnh Nam, Hoàng Mai, HN', 'walk_in', 'primary_success', 'dang_nurture', 'PH đến cơ sở hỏi thăm, chưa quyết định'),
  ('Phạm Thu Hà', '2015-05-10', 'Phạm Văn Đức', '0945678901', NULL, '23 Định Công, Hoàng Mai, HN', 'phone', 'secondary', 'dat_lich_hoc_thu', 'Đã book 3 buổi trial từ 25/02'),
  ('Hoàng Gia Bảo', '2019-01-20', 'Hoàng Thị Mai', '0956789012', 'mai.hoang@email.com', '56 Tương Mai, Hai Bà Trưng, HN', 'referral', 'buttercup', 'dang_hoc_thu', 'Được giới thiệu bởi PH Nguyễn Văn An. Bé đang học thử buổi 2/3'),
  ('Vũ Đức Minh', '2014-09-30', 'Vũ Thị Ngọc', '0967890123', NULL, '34 Mai Động, Hoàng Mai, HN', 'website', 'ielts', 'cho_chot', 'Học thử xong, PH đang cân nhắc học phí'),
  ('Đỗ Khánh Linh', '2018-12-05', 'Đỗ Văn Thắng', '0978901234', 'thang.do@email.com', '67 Trương Định, Hai Bà Trưng, HN', 'facebook', 'buttercup', 'da_dang_ky', 'Đã đóng phí khóa Buttercup, bắt đầu từ 01/03'),
  ('Bùi Thanh Tùng', '2016-04-18', 'Bùi Thị Hạnh', '0989012345', NULL, '89 Giải Phóng, Đống Đa, HN', 'zalo', 'primary_success', 'da_dang_ky', 'Đăng ký thành công, lớp Primary Success T4-T7'),
  ('Ngô Quang Huy', '2017-08-25', 'Ngô Văn Phong', '0990123456', 'phong.ngo@email.com', '12 Bạch Mai, Hai Bà Trưng, HN', 'walk_in', 'secondary', 'mat_lead', 'PH chọn trung tâm khác gần nhà hơn'),
  ('Đinh Phương Anh', '2015-02-14', 'Đinh Thị Tuyết', '0901234567', NULL, '45 Kim Ngưu, Hai Bà Trưng, HN', 'phone', 'ielts', 'mat_lead', 'PH thấy học phí cao, sẽ cân nhắc sau');

-- ========================================
-- Migration 022: 022_add-notification-dedup-index.sql
-- ========================================

-- Clean up existing duplicate notifications before adding unique constraints.
DELETE FROM public.notifications a
  USING public.notifications b
  WHERE a.metadata->>'reminder_id' IS NOT NULL
    AND a.metadata->>'reminder_id' = b.metadata->>'reminder_id'
    AND a.created_at > b.created_at;

DELETE FROM public.notifications a
  USING public.notifications b
  WHERE a.metadata->>'activity_id' IS NOT NULL
    AND a.metadata->>'activity_id' = b.metadata->>'activity_id'
    AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_reminder_id
  ON public.notifications ((metadata->>'reminder_id'))
  WHERE metadata->>'reminder_id' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_activity_id
  ON public.notifications ((metadata->>'activity_id'))
  WHERE metadata->>'activity_id' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_fb_idempotency
  ON public.webhook_events (provider, event_type, (payload->>'id'), (payload->>'time'))
  WHERE provider = 'facebook' AND status = 'processed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_zalo_idempotency
  ON public.webhook_events (provider, (payload->'message'->>'msg_id'))
  WHERE provider = 'zalo' AND status = 'processed' AND payload->'message'->>'msg_id' IS NOT NULL;

-- ========================================
-- Migration 023: 023_add-message-queue-claimed-at.sql
-- ========================================

ALTER TABLE public.message_queue ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
