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
