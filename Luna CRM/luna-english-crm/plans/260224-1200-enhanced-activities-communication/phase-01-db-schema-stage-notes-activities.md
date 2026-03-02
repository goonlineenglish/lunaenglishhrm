# Phase 01 — DB Schema: Stage Notes & Scheduled Activities

## Context Links
- Plan: [plan.md](./plan.md)
- Existing migrations: `supabase/migrations/001-015`
- Existing types: `lib/types/leads.ts`
- Research: `research/researcher-01-activity-reminders.md`

## Overview
- **Priority**: P0 (blocks all other phases)
- **Status**: completed
- **Description**: Add 3 new DB tables + alter existing `lead_activities` to support scheduled activities with date ranges, participants, locations, and per-stage note history.

## Key Insights
- `lead_activities` already exists but is minimal (type + content only)
- **Actual enum name is `public.lead_activity_type`** (NOT `activity_type` — see migration 003)
- Stage-based reminders already fire via trigger on `leads.current_stage` change (migration 010)
- RLS policies in migration 009 must be extended for new tables
- Cron: keep existing HTTP cron pattern (`/api/cron/`), do NOT add pg_cron (avoid double notifications)

## Requirements

### Functional
1. Store note/result/next_steps per lead per stage (with history when stage changes)
2. Scheduled activities with: title, description, type, schedule_from, schedule_to, location, participants, status
3. Configurable "next step suggestions" per pipeline stage
4. Email & Zalo message template tables (used by Phase 5+6)

### Non-functional
- All tables have RLS policies
- Migrations are additive (no breaking changes to existing tables)
- New activity fields are nullable for backward compatibility

## Architecture

### New Table: `lead_stage_notes`
```sql
CREATE TABLE public.lead_stage_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage       lead_stage NOT NULL,
  note        TEXT,
  result      TEXT,
  next_steps  TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One active record per lead+stage; when stage changes, old record is archived (kept)
-- Get latest: SELECT * FROM lead_stage_notes WHERE lead_id=X ORDER BY created_at DESC LIMIT 1
```

### Alter: `lead_activities` (extend, not replace)
```sql
ALTER TABLE public.lead_activities
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS schedule_from      TIMESTAMPTZ,  -- stored as UTC, display as +07
  ADD COLUMN IF NOT EXISTS schedule_to        TIMESTAMPTZ,  -- stored as UTC, display as +07
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS participant_ids    UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'once'
    CHECK (recurrence_pattern IN ('once', 'weekly')),
  ADD COLUMN IF NOT EXISTS recurrence_day_of_week SMALLINT  -- 0=Sun, 1=Mon ... 6=Sat (NULL if once)
    CHECK (recurrence_day_of_week BETWEEN 0 AND 6);

-- Timezone note: all TIMESTAMPTZ stored UTC. App reads/writes in Vietnam TZ (+07:00).
-- Frontend: use date-fns-tz toZonedTime/fromZonedTime with 'Asia/Ho_Chi_Minh'
-- Cron: HTTP cron runs server-side; "24h before schedule_to" comparison is in UTC, correct regardless of TZ

-- Extend type enum — CORRECT NAME: public.lead_activity_type (from migration 003)
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'scheduled_call';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'trial_class';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'consultation';
ALTER TYPE public.lead_activity_type ADD VALUE IF NOT EXISTS 'checklist';
```

### Performance Indexes (in migration 017)
```sql
-- Index for cron: find upcoming/overdue scheduled activities
CREATE INDEX idx_lead_activities_schedule_to_status
  ON public.lead_activities (schedule_to, status)
  WHERE schedule_to IS NOT NULL;

-- Index for recurring activities: find by parent
CREATE INDEX idx_lead_activities_parent_id
  ON public.lead_activities (parent_activity_id)
  WHERE parent_activity_id IS NOT NULL;
```

### Timezone Strategy (Vietnam +7)
- **DB**: All timestamps stored as UTC (`TIMESTAMPTZ`)
- **Display**: Convert to `Asia/Ho_Chi_Minh` before showing to user
- **Input**: User picks local time → convert to UTC before saving
- **Library**: `date-fns-tz` (already in Next.js ecosystem, no extra install needed if available; else add)
- **Cron**: Keep HTTP cron route (existing pattern) — notifications fire based on UTC values, correct regardless of TZ

### Recurrence Pattern (Weekly)
Weekly activities create a "parent" record with `recurrence_pattern='weekly'` and `recurrence_day_of_week=N`.
The cron job (or a DB function) generates upcoming instances — stored as separate `lead_activities` rows linked by a future `parent_activity_id` column (add in migration 017). For MVP: generate next 4 weeks on creation.

```sql
-- Add parent link for recurring instances
ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES public.lead_activities(id) ON DELETE CASCADE;
```

### New Table: `stage_next_step_configs`
```sql
CREATE TABLE public.stage_next_step_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       lead_stage NOT NULL UNIQUE,  -- one config per stage
  steps       JSONB NOT NULL DEFAULT '[]',
  -- steps format: [{"id": "uuid", "label": "Gọi điện tư vấn", "order": 1}]
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed with default next steps per stage
```

### New Table: `email_templates`
```sql
CREATE TABLE public.email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,   -- e.g., 'tu_van_initial'
  stage        lead_stage,             -- NULL = global
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,          -- {{parent_name}}, {{student_name}} etc
  params       JSONB DEFAULT '[]',     -- ["parent_name", "student_name", "date"]
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `zalo_message_templates`
```sql
CREATE TABLE public.zalo_message_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,
  stage        lead_stage,
  zalo_template_id TEXT,              -- ID from Zalo OA registration
  body_text    TEXT NOT NULL,         -- {{param}} placeholders
  params       JSONB DEFAULT '[]',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

## Related Code Files

### To Create
- `supabase/migrations/016_add-stage-notes-table.sql`
- `supabase/migrations/017_alter-lead-activities-add-scheduling.sql`
- `supabase/migrations/018_add-stage-next-step-configs.sql`
- `supabase/migrations/019_add-email-zalo-templates.sql`
- `supabase/migrations/020_add-rls-for-new-tables.sql`

### To Update
- `lib/types/leads.ts` — add new types: `ScheduledActivity`, `StageNote`, `StageNextStepConfig`
- `lib/types/` — add `email-templates.ts`, `zalo-templates.ts`

## Implementation Steps

1. **Create migration 016** — `lead_stage_notes` table with RLS
2. **Create migration 017** — `ALTER TABLE lead_activities` (additive)
3. **Create migration 018** — `stage_next_step_configs` + seed default steps per stage
4. **Create migration 019** — `email_templates` + `zalo_message_templates` + seed samples
5. **Create migration 020** — RLS policies for all new tables
6. **Update TypeScript types** in `lib/types/leads.ts`
7. **Test**: Apply migrations to Supabase Cloud, verify no RLS errors

## Todo List
- [x] Migration 016: lead_stage_notes
- [x] Migration 017: alter lead_activities
- [x] Migration 018: stage_next_step_configs + seed
- [x] Migration 019: email/zalo templates + seed
- [x] Migration 020: RLS policies
- [x] Update lib/types/leads.ts
- [x] Apply to Supabase Cloud and verify

## Default Next Steps Seed Data
```sql
-- Upsert to prevent duplicates (UNIQUE on stage)
INSERT INTO stage_next_step_configs (stage, steps) VALUES
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
```

## RLS Policy Pattern
```sql
-- lead_stage_notes: advisor sees notes for their assigned leads
CREATE POLICY "Advisors view own lead notes" ON public.lead_stage_notes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT assigned_to FROM public.leads WHERE id = lead_id
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Advisors manage own lead notes" ON public.lead_stage_notes
  FOR ALL USING (
    auth.uid() IN (
      SELECT assigned_to FROM public.leads WHERE id = lead_id
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

## Success Criteria
- All 5 migrations apply without errors on Supabase Cloud
- TypeScript types compile without errors
- RLS: advisor can only see/edit notes for their own leads
- `lead_activities` existing data preserved (no data loss)
- Default next steps visible for all 7 active stages

## Risk Assessment
- **Low**: Adding columns to `lead_activities` is safe (nullable/default)
- **Medium**: Enum extension (`ALTER TYPE ADD VALUE`) is not transactional in PostgreSQL — must run outside transaction block
- **Low**: New tables don't affect existing functionality
- **Medium**: Phase 04 must EXTEND existing `create_stage_reminder()` trigger (migration 010), not create a new duplicate trigger

## Security Considerations
- All new tables require `ENABLE ROW LEVEL SECURITY`
- `stage_next_step_configs` is admin-writable, all-readable (config data)
- Email/Zalo templates: admin-only write, all-readable

## Next Steps
- After migrations applied → Phase 02 (Stage Notes UI)
- Migrations 018-019 seed data will be used by Phase 04 (Smart Reminders) and Phase 05-06 (Comms)
