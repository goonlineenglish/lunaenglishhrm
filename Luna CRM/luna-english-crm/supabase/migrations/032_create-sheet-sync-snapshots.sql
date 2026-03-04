-- ============================================================================
-- Migration 032: Snapshot store for Google Sheet 2-way sync conflict detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sheet_sync_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data JSONB NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sheet_sync_snapshots_row_count_non_negative_check CHECK (row_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sheet_sync_snapshots_synced_at_desc
  ON public.sheet_sync_snapshots (synced_at DESC);
