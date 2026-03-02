# Luna English CRM - CLAUDE.md

## Project Overview
Internal CRM for Luna English (Tân Mai branch) to manage student enrollment pipeline.
Vietnamese UI throughout. Built for admin, advisor, marketing roles.
All 10 development phases complete. Production-ready.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack, TypeScript strict)
- **Styling**: Tailwind CSS v4 (CSS-first config in `app/globals.css`)
- **Database**: Supabase (auth, PostgreSQL, realtime subscriptions, RLS)
- **UI Library**: shadcn/ui components (19 base components)
- **Drag-drop**: @dnd-kit (Kanban board)
- **Charts**: Recharts (dashboard)
- **Toasts**: Sonner (not shadcn toast)
- **Email**: Resend SDK (lazy-initialized)
- **Package manager**: npm

## Project Location
- Local: `F:\APP Antigravity\Tool\Luna CRM\luna-english-crm`
- GitHub: `goonlineenglish/luna-english-crm` (branch: main)

## Supabase Cloud
- Project URL: `https://vgxpucmwivhlgvlzzkju.supabase.co`
- Region: Southeast Asia (Singapore)
- Database: All 24 migrations (001-024) + seed data deployed
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deployment
- **Docker + Caddy**: Primary deployment path (multi-stage Alpine, standalone output, 512MB limit)
- **Vercel**: Alternative (vercel.json configured with 4 cron schedules)
- **Homeserver target**: Dell Inspiron 3442, i3-4005U, 8GB RAM, Ubuntu
- **Cron**: 4 jobs (overdue-reminders/15min, message-queue/5min, refresh-tokens/6h, weekly-report/Mon)

## Key Architecture Patterns
- `await cookies()` required (Next.js 16 async APIs)
- `supabase.auth.getUser()` on server, NEVER `getSession()`
- `ensureUserProfile()` on first login (creates missing user profile via admin client)
- `getAdminClient()` centralized in `lib/supabase/admin.ts` (never duplicate)
- Path alias: `@/` maps to project root
- Route groups: `(auth)` for login, `(dashboard)` for protected pages
- Navigation uses string-based `iconName` (not Lucide components) to avoid Server→Client serialization errors

## Project Structure
```
app/
  (auth)/login/          # Login page
  (dashboard)/           # Protected layout (sidebar, header, auth check)
    pipeline/            # Kanban board + list view
    leads/               # Redirects to /pipeline
    reminders/           # Follow-up reminders
    students/            # Student management
    activities/          # Scheduled activities view
    reports/             # Dashboard reports
    settings/            # Admin settings (integration config, stage checklists)
  api/webhooks/          # Zalo + Facebook inbound
  api/cron/              # 4 scheduled tasks
  layout.tsx             # Root layout (fonts, metadata)
  globals.css            # Tailwind v4 theme
  middleware.ts          # Auth session refresh

components/              # 80 files total
  ui/                    # 19 shadcn/ui base components
  pipeline/              # 23 Kanban + lead + activity + communication
  students/              # 11 enrollment components
  dashboard/             # 7 KPI + chart components
  reminders/             # 4 reminder components
  settings/              # 6 integration + stage config
  layout/                # 8 sidebar/header components
  auth/                  # 1 login form

lib/
  actions/               # 15 server actions
  hooks/                 # 3 (realtime-leads, optimistic-kanban, realtime-notifications)
  integrations/          # 7 files (Zalo, Facebook, queue, backoff, idempotency)
  supabase/              # client.ts, server.ts, admin.ts
  constants/             # navigation, pipeline-stages, roles, reminder-types
  types/                 # leads, users, database, email-templates, zalo-templates
  utils/                 # cn(), format, csv-parser, referral-code, template-renderer

supabase/
  migrations/            # 24 SQL files (001-024)
  seed.sql               # Sample data
```

## Database Schema (24 migrations)

### Core Tables (001-015)
1. `users` — synced with auth.users, roles: admin/advisor/marketing
2. `leads` — pipeline entity with enums: lead_source, lead_stage, program_type
3. `lead_activities` — activity log per lead (10 activity types)
4. `follow_up_reminders` — scheduled tasks for advisors
5. `students` — enrolled students converted from leads
6. `notifications` — in-app notifications (with dedup index)
7. `integration_tokens` — OAuth tokens for Zalo/Facebook
8. `webhook_events` — incoming webhook log
9. RLS policies, triggers (stage→reminder, stage→student enrollment)
10. Dashboard views: lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend
11. `reports`, `message_queue`, `zalo_followers`

### Phase 10 Tables (016-024)
- `lead_stage_notes` — per-stage notes/results/next-steps
- `stage_next_step_configs` — configurable checklists per stage
- `email_templates` — email templates with {{var}} placeholders
- `zalo_message_templates` — Zalo message templates
- Scheduling columns on `lead_activities` (scheduled_at, recurrence, participants)
- `find_stale_leads()` RPC function
- Notification dedup index, message queue claimed_at
- Migration 024: backfill missing user profiles

## Pipeline Stages (Vietnamese)
1. `moi_tiep_nhan` — Mới tiếp nhận
2. `da_tu_van` — Đã tư vấn / Đang nurture
3. `dang_nurture` — Kiểm tra đầu vào
4. `dat_lich_hoc_thu` — Đặt lịch học thử
5. `dang_hoc_thu` — Đang học thử
6. `cho_chot` — Chờ chốt
7. `da_dang_ky` — Đã đăng ký
8. `mat_lead` — Mất lead

## Lead Pipeline State Machine

```
                          ┌─────────────────────────────────────────────────────────────────┐
                          │                      LEAD PIPELINE                              │
                          └─────────────────────────────────────────────────────────────────┘

  [NEW LEAD / WEBHOOK]
         │
         ▼
  ┌─────────────┐   tư vấn    ┌─────────────┐  không quan tâm  ┌─────────────┐
  │  moi_tiep   │────────────▶│  da_tu_van  │─────────────────▶│  mat_lead   │
  │   _nhan     │             │ (TV/Nurture)│                   │  (terminal) │
  └─────────────┘             └─────────────┘                   └─────────────┘
         │                          │                                  ▲
         │ bỏ qua /                 │ sẵn sàng test                    │
         │ không liên lạc           ▼                                  │
         └─────────────────▶ ┌─────────────┐  từ chối vĩnh viễn       │
                             │ dang_nurture│─────────────────────────▶│
                             │(KT đầu vào)│                           │
                             └─────────────┘                           │
                                    │                                  │
                                    │ đạt test / quan tâm              │
                                    ▼                                  │
                             ┌─────────────┐  hủy lịch / vắng mặt    │
                             │  dat_lich_  │─────────────────────────▶│
                             │   hoc_thu   │                           │
                             └─────────────┘                           │
                                    │                                  │
                                    │ tham dự                          │
                                    ▼                                  │
                             ┌─────────────┐  không hài lòng          │
                             │   dang_hoc_ │─────────────────────────▶│
                             │     thu     │                           │
                             └─────────────┘                           │
                                    │                                  │
                                    │ học thử xong / quan tâm          │
                                    ▼                                  │
                             ┌─────────────┐  từ chối đăng ký         │
                             │  cho_chot   │─────────────────────────▶│
                             └─────────────┘                           │
                                    │                                  │
                                    │ xác nhận đăng ký                 │
                                    ▼                                  │
                             ┌─────────────┐                          │
                             │  da_dang_ky │  ──── (SUCCESS) ────     │
                             │  (terminal) │                          │
                             └─────────────┘                          │
                                                                       │
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
  * Mọi stage (trừ terminal) đều có thể chuyển sang mat_lead
  * Drag-drop trên Kanban cho phép chuyển stage tự do (không enforce tuyến tính)
  * DB trigger: stage → da_dang_ky tự tạo bản ghi student
  * DB trigger: thay đổi stage tự tạo follow_up_reminder cho advisor

State Transitions (Allowed):
  moi_tiep_nhan  →  da_tu_van | mat_lead
  da_tu_van      →  dang_nurture | dat_lich_hoc_thu | mat_lead  (TV/Nurture → KT đầu vào)
  dang_nurture   →  dat_lich_hoc_thu | mat_lead                 (KT đầu vào → Đặt lịch)
  dat_lich_hoc_thu → dang_hoc_thu | dang_nurture | mat_lead
  dang_hoc_thu   →  cho_chot | dang_nurture | mat_lead
  cho_chot       →  da_dang_ky | mat_lead
  da_dang_ky     →  (terminal — student record auto-created)
  mat_lead       →  (terminal — can be reopened via manual stage change)
```

## All 10 Phases — COMPLETE
1. Project Setup & Database (migrations 001-009)
2. Auth & Layout Shell (login, sidebar, header, role-based nav)
3. Lead Pipeline Kanban (drag-drop, filters, detail sheet, list view)
4. Follow-up Automation (reminders, notifications, cron)
5. Retention & Students (data table, CSV import, status tracking)
6. Dashboard & Reports (KPI cards, charts, advisor performance)
7. Integrations (Zalo OA + Facebook webhooks, message queue)
8. Deployment & Security Hardening (Supabase Cloud, vercel.json, fail-closed cron)
9. Testing & Hardening (error boundaries, 404, loading states, code review)
10. Enhanced Activities & Communication (stage notes, scheduling, email/Zalo templates, checklists)

## Security Applied
- UUID validation on all ID parameters
- HMAC-SHA256 webhook signature verification (Zalo + Facebook)
- Cron auth fail-closed (deny without CRON_SECRET)
- Facebook token in Authorization header (not URL query)
- Webhook idempotency (dedup duplicate events)
- Generic error messages (no sensitive info leak)
- Centralized getAdminClient() (no duplication)
- Default role: advisor (not admin) for new users

## Known Issues
- Middleware deprecation warning (Next.js 16 → proxy convention)
- No rate limiting on webhook endpoints
- No role-based auth in server actions (relies on RLS only)
- No unit/integration tests (0% coverage)

## Dev Commands
```bash
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # ESLint
npm test                       # Node test runner (tests/ dir)

# Clean restart (Windows)
taskkill /f /im node.exe && rm -rf .next && npm run dev

# Docker (homeserver)
docker compose build && docker compose up -d
```

## Documentation
All engineering docs in `docs/`:
- `project-overview-pdr.md` — Business context, features
- `system-architecture.md` — Stack, DB schema, data flow
- `codebase-summary.md` — File index, counts
- `code-standards.md` — TypeScript, component, styling conventions
- `development-roadmap.md` — 10 phases (all complete)
- `deployment-guide.md` — Docker/Caddy + Vercel + local dev
- `design-guidelines.md` — Brand colors, typography
- `project-changelog.md` — Version history (v0.1.0 → v0.4.0)

Vietnamese user/deploy guides:
- `huong-dan-su-dung-app.md` — Staff user manual
- `huong-dan-deploy-homeserver.md` — Homeserver deployment
- `huong-dan-deploy-security-fixes.md` — Security fix deployment

## Luna Brand Colors
- Primary: `#3E1A51` (deep purple) → oklch(0.28 0.12 310)
- Secondary: `#3FA5DC` (blue) → oklch(0.65 0.14 230)
- Sidebar: Dark purple background with blue accents
