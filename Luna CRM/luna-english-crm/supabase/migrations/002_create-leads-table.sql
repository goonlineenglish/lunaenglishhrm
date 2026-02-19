-- ============================================================================
-- Migration 002: Create leads table with enums
-- ============================================================================

-- Enum: source channel where the lead originated
CREATE TYPE public.lead_source AS ENUM (
  'facebook',
  'zalo',
  'walk_in',
  'website',
  'phone',
  'referral'
);

-- Enum: pipeline stage for lead tracking (Vietnamese pipeline names)
CREATE TYPE public.lead_stage AS ENUM (
  'moi_tiep_nhan',     -- Mới tiếp nhận
  'da_tu_van',         -- Đã tư vấn
  'dang_nurture',      -- Đang nurture
  'dat_lich_hoc_thu',  -- Đặt lịch học thử
  'dang_hoc_thu',      -- Đang học thử
  'cho_chot',          -- Chờ chốt
  'da_dang_ky',        -- Đã đăng ký
  'mat_lead'           -- Mất lead
);

-- Enum: program types offered at Luna English
CREATE TYPE public.program_type AS ENUM (
  'buttercup',
  'primary_success',
  'secondary',
  'ielts'
);

-- Leads table: core CRM entity for tracking prospective students
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Student (child) information
  student_name TEXT,
  student_dob DATE,

  -- Parent (contact person) information
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  parent_address TEXT,

  -- Lead classification
  source public.lead_source NOT NULL DEFAULT 'walk_in',
  referral_code TEXT,
  program_interest public.program_type,
  current_stage public.lead_stage NOT NULL DEFAULT 'moi_tiep_nhan',

  -- Assignment and ownership
  assigned_to UUID REFERENCES public.users (id) ON DELETE SET NULL,
  expected_class TEXT,

  -- Additional context
  notes TEXT,
  lost_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: filter/sort by pipeline stage (Kanban board queries)
CREATE INDEX idx_leads_stage ON public.leads (current_stage);

-- Index: filter leads by assigned advisor
CREATE INDEX idx_leads_assigned ON public.leads (assigned_to);

-- Index: filter leads by source channel
CREATE INDEX idx_leads_source ON public.leads (source);

-- Index: sort leads by newest first
CREATE INDEX idx_leads_created ON public.leads (created_at DESC);

-- Index: composite for Kanban board queries (stage + assignment)
CREATE INDEX idx_leads_stage_assigned ON public.leads (current_stage, assigned_to);

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_leads_updated
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
