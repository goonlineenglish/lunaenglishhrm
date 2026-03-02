-- Add claimed_at column to message_queue for stale processing detection.
-- When a worker claims a message (status → processing), it sets claimed_at = NOW().
-- Reclaim logic resets messages where claimed_at is older than 5 minutes.
ALTER TABLE public.message_queue ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
