-- Clean up existing duplicate notifications before adding unique constraints.
-- Keep only the oldest notification per reminder_id / activity_id.

-- Remove duplicate reminder notifications (keep oldest)
DELETE FROM public.notifications a
  USING public.notifications b
  WHERE a.metadata->>'reminder_id' IS NOT NULL
    AND a.metadata->>'reminder_id' = b.metadata->>'reminder_id'
    AND a.created_at > b.created_at;

-- Remove duplicate activity notifications (keep oldest)
DELETE FROM public.notifications a
  USING public.notifications b
  WHERE a.metadata->>'activity_id' IS NOT NULL
    AND a.metadata->>'activity_id' = b.metadata->>'activity_id'
    AND a.created_at > b.created_at;

-- Unique partial index to prevent duplicate reminder notifications.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_reminder_id
  ON public.notifications ((metadata->>'reminder_id'))
  WHERE metadata->>'reminder_id' IS NOT NULL;

-- Unique partial index to prevent duplicate activity deadline notifications.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_activity_id
  ON public.notifications ((metadata->>'activity_id'))
  WHERE metadata->>'activity_id' IS NOT NULL;

-- Unique composite index on webhook_events for idempotency.
-- Prevents processing the same Facebook/Zalo event twice.
-- Uses provider + event_type + payload id + payload time for Facebook,
-- and provider + payload message msg_id for Zalo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_fb_idempotency
  ON public.webhook_events (provider, event_type, (payload->>'id'), (payload->>'time'))
  WHERE provider = 'facebook' AND status = 'processed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_zalo_idempotency
  ON public.webhook_events (provider, (payload->'message'->>'msg_id'))
  WHERE provider = 'zalo' AND status = 'processed' AND payload->'message'->>'msg_id' IS NOT NULL;
