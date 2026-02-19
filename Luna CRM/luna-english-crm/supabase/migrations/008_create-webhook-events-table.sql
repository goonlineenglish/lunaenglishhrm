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
