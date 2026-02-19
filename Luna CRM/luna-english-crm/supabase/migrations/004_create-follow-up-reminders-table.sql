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
