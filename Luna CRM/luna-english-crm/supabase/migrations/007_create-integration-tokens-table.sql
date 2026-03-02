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
