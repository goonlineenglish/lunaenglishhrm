-- ============================================================================
-- Migration 019: Create email_templates and zalo_message_templates tables
-- Used by Phase 05 (Email) and Phase 06 (Zalo OA Messaging)
-- ============================================================================

-- Email templates table
CREATE TABLE public.email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,
  stage        public.lead_stage,
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,
  params       JSONB DEFAULT '[]',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Zalo message templates table
CREATE TABLE public.zalo_message_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  template_key     TEXT UNIQUE NOT NULL,
  stage            public.lead_stage,
  zalo_template_id TEXT,
  body_text        TEXT NOT NULL,
  params           JSONB DEFAULT '[]',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_stage ON public.email_templates (stage);
CREATE INDEX idx_email_templates_key ON public.email_templates (template_key);
CREATE INDEX idx_zalo_templates_stage ON public.zalo_message_templates (stage);
CREATE INDEX idx_zalo_templates_key ON public.zalo_message_templates (template_key);

-- Seed sample email templates
INSERT INTO public.email_templates (name, template_key, stage, subject, body_html, params) VALUES
(
  'Chào mừng lead mới',
  'welcome_new_lead',
  'moi_tiep_nhan',
  'Chào mừng {{parent_name}} đến với Luna English!',
  '<h2>Xin chào {{parent_name}},</h2><p>Cảm ơn bạn đã quan tâm đến chương trình học tại Luna English cho bé {{student_name}}.</p><p>Chúng tôi sẽ liên hệ bạn sớm nhất để tư vấn chi tiết.</p><p>Trân trọng,<br/>Luna English</p>',
  '["parent_name", "student_name"]'
),
(
  'Xác nhận lịch học thử',
  'trial_confirmation',
  'dat_lich_hoc_thu',
  'Xác nhận lịch học thử cho bé {{student_name}}',
  '<h2>Xin chào {{parent_name}},</h2><p>Lịch học thử cho bé {{student_name}} đã được xác nhận:</p><p><strong>Thời gian:</strong> {{trial_date}}</p><p><strong>Địa điểm:</strong> Luna English Center</p><p>Vui lòng đến trước 10 phút để làm thủ tục.</p><p>Trân trọng,<br/>Luna English</p>',
  '["parent_name", "student_name", "trial_date"]'
),
(
  'Cảm ơn sau học thử',
  'post_trial_thanks',
  'dang_hoc_thu',
  'Cảm ơn {{parent_name}} - Kết quả buổi học thử',
  '<h2>Xin chào {{parent_name}},</h2><p>Cảm ơn bạn và bé {{student_name}} đã tham gia buổi học thử tại Luna English.</p><p>Chúng tôi rất vui khi được đồng hành cùng bé. Đội ngũ tư vấn sẽ liên hệ bạn để chia sẻ kết quả chi tiết.</p><p>Trân trọng,<br/>Luna English</p>',
  '["parent_name", "student_name"]'
)
ON CONFLICT (template_key) DO NOTHING;

-- Seed sample Zalo templates
INSERT INTO public.zalo_message_templates (name, template_key, stage, body_text, params) VALUES
(
  'Chào mừng Zalo',
  'zalo_welcome',
  'moi_tiep_nhan',
  'Xin chào {{parent_name}}! Cảm ơn bạn đã quan tâm đến Luna English. Chúng tôi sẽ liên hệ bạn sớm nhất ạ.',
  '["parent_name"]'
),
(
  'Nhắc lịch học thử Zalo',
  'zalo_trial_reminder',
  'dat_lich_hoc_thu',
  'Xin chào {{parent_name}}! Nhắc bạn lịch học thử cho bé {{student_name}} vào {{trial_date}}. Vui lòng đến trước 10 phút ạ.',
  '["parent_name", "student_name", "trial_date"]'
),
(
  'Follow-up Zalo',
  'zalo_followup',
  NULL,
  'Xin chào {{parent_name}}! Luna English muốn hỏi thăm về nhu cầu học tiếng Anh cho bé. Bạn có thể cho mình biết thêm không ạ?',
  '["parent_name"]'
)
ON CONFLICT (template_key) DO NOTHING;
