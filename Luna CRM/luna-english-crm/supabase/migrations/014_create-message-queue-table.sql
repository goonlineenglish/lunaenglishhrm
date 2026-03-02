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
