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
