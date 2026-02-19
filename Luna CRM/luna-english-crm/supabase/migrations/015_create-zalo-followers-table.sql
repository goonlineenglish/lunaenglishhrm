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
