-- ============================================================================
-- Migration 018: Create stage_next_step_configs table + seed default steps
-- Configurable "next step suggestions" per pipeline stage
-- ============================================================================

CREATE TABLE public.stage_next_step_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       public.lead_stage NOT NULL UNIQUE,
  steps       JSONB NOT NULL DEFAULT '[]',
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at on modification
CREATE TRIGGER on_stage_next_step_configs_updated
  BEFORE UPDATE ON public.stage_next_step_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Seed default next steps per stage (upsert to prevent duplicates)
INSERT INTO public.stage_next_step_configs (stage, steps) VALUES
('moi_tiep_nhan', '[
  {"id": "1", "label": "Gọi điện tiếp cận lần đầu", "order": 1},
  {"id": "2", "label": "Gửi thông tin khóa học", "order": 2},
  {"id": "3", "label": "Xác nhận nhu cầu học", "order": 3}
]'),
('da_tu_van', '[
  {"id": "4", "label": "Gọi điện tư vấn chi tiết", "order": 1},
  {"id": "5", "label": "Gửi tài liệu tư vấn", "order": 2},
  {"id": "6", "label": "Đề xuất xếp lịch học thử", "order": 3}
]'),
('dang_nurture', '[
  {"id": "7", "label": "Gửi content/bài tập mẫu", "order": 1},
  {"id": "8", "label": "Check-in sau 3 ngày", "order": 2},
  {"id": "9", "label": "Mời tham gia webinar/sự kiện", "order": 3}
]'),
('dat_lich_hoc_thu', '[
  {"id": "10", "label": "Xác nhận lịch với phụ huynh", "order": 1},
  {"id": "11", "label": "Nhắn lịch học thử qua Zalo", "order": 2},
  {"id": "12", "label": "Chuẩn bị tài liệu học thử", "order": 3}
]'),
('dang_hoc_thu', '[
  {"id": "13", "label": "Theo dõi buổi học thử", "order": 1},
  {"id": "14", "label": "Nhắc remind 1 ngày trước qua Zalo", "order": 2},
  {"id": "15", "label": "Chốt sau khi học thử xong", "order": 3}
]'),
('cho_chot', '[
  {"id": "16", "label": "Gọi điện chốt hợp đồng", "order": 1},
  {"id": "17", "label": "Xử lý objections", "order": 2},
  {"id": "18", "label": "Gửi thông tin đăng ký chính thức", "order": 3}
]'),
('da_dang_ky', '[
  {"id": "19", "label": "Ký hợp đồng/thu học phí", "order": 1},
  {"id": "20", "label": "Bàn giao lớp học", "order": 2},
  {"id": "21", "label": "Gửi thông tin onboarding", "order": 3}
]')
ON CONFLICT (stage) DO UPDATE SET steps = EXCLUDED.steps;
