# Luna English CRM - CLAUDE.md

## Project Overview
Internal CRM for Luna English (Tân Mai branch) to manage student enrollment pipeline.
Vietnamese UI throughout. Built for admin, advisor, marketing roles.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack, TypeScript strict)
- **Styling**: Tailwind CSS v4 (CSS-first config in `app/globals.css`)
- **Database**: Supabase (auth, PostgreSQL, realtime subscriptions, RLS)
- **UI Library**: shadcn/ui components
- **Drag-drop**: @dnd-kit (Kanban board)
- **Charts**: Recharts (dashboard)
- **Toasts**: Sonner (not shadcn toast)
- **Package manager**: npm

## Project Location
- Local: `F:\APP Antigravity\Tool\Luna CRM\luna-english-crm`
- GitHub: `goonlineenglish/luna-english-crm` (branch: main)

## Supabase Cloud
- Project URL: `https://vgxpucmwivhlgvlzzkju.supabase.co`
- Region: Southeast Asia (Singapore)
- Database: All 15 migrations + seed data deployed via SQL Editor
- Admin user created via Supabase Dashboard → Authentication → Users
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Key Architecture Patterns
- `await cookies()` required (Next.js 16 async APIs)
- `supabase.auth.getUser()` on server, NEVER `getSession()`
- Path alias: `@/` maps to project root
- Route groups: `(auth)` for login, `(dashboard)` for protected pages
- Navigation uses string-based `iconName` (not Lucide components) to avoid Server→Client serialization errors
- Icon resolution happens in `SidebarNavItems` client component via `ICON_MAP`

## Project Structure
```
app/
  (auth)/login/          # Login page
  (dashboard)/           # Protected layout (sidebar, header, auth check)
    pipeline/            # Kanban board + list view
    leads/               # Redirects to /pipeline
    reminders/           # Follow-up reminders
    students/            # Student management
    reports/             # Dashboard reports (not yet tested)
    settings/            # Admin settings (not yet tested)
  layout.tsx             # Root layout (fonts, metadata)

components/
  layout/                # Sidebar, Header, SidebarNavItems, SidebarMobile, UserMenu, NotificationBell
  pipeline/              # KanbanBoard, LeadDetailSheet, QuickAddLeadSheet, FilterBar, CommandSearch, LeadListView
  reminders/             # Reminder components
  students/              # Student data table, CSV import
  dashboard/             # KPI cards, charts
  settings/              # Settings components
  auth/                  # Login form
  ui/                    # shadcn/ui base components

lib/
  actions/               # 9 server actions (leads, reminders, students, auth, etc.)
  constants/             # navigation.ts (string iconNames), pipeline-stages.ts, roles.ts
  hooks/                 # use-realtime-leads.ts, use-realtime-reminders.ts, use-notifications.ts
  integrations/          # Zalo OA, Facebook webhooks, message queue
  supabase/              # client.ts, server.ts
  types/                 # leads.ts, users.ts
  utils.ts               # cn() helper

supabase/
  migrations/            # 15 SQL migration files (001-015)
  combined-migrations.sql # All migrations combined (for SQL Editor deployment)
  seed.sql               # 10 sample leads
```

## Database Schema (15 migrations)
1. `users` - synced with auth.users, roles: admin/advisor/marketing
2. `leads` - pipeline entity with enums: lead_source, lead_stage, program_type
3. `lead_activities` - activity log per lead (call, message, meeting, note, stage_change)
4. `follow_up_reminders` - scheduled tasks for advisors
5. `students` - enrolled students converted from leads
6. `notifications` - in-app notifications
7. `integration_tokens` - OAuth tokens for Zalo/Facebook
8. `webhook_events` - incoming webhook log
9. RLS policies for all tables (admin=full, advisor=scoped, marketing=read-only)
10. Auto-create reminders on lead stage change (trigger)
11. Auto-create student when lead reaches `da_dang_ky` (trigger)
12. Dashboard views: lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend
13. `reports` - periodic report storage
14. `message_queue` - outbound message retry queue
15. `zalo_followers` - Zalo OA follower mapping

## Pipeline Stages (Vietnamese)
1. `moi_tiep_nhan` - Mới tiếp nhận
2. `da_tu_van` - Đã tư vấn
3. `dang_nurture` - Đang nurture
4. `dat_lich_hoc_thu` - Đặt lịch học thử
5. `dang_hoc_thu` - Đang học thử
6. `cho_chot` - Chờ chốt
7. `da_dang_ky` - Đã đăng ký
8. `mat_lead` - Mất lead

## Phases Completed
1. ✅ Project Setup & Database (migrations 001-009)
2. ✅ Auth & Layout Shell (login, sidebar, header, role-based nav)
3. ✅ Lead Pipeline Kanban (drag-drop, filters, detail sheet, list view)
4. ✅ Follow-up Automation (reminders, notifications, cron)
5. ✅ Retention & Students (data table, CSV import, status tracking)
6. ✅ Dashboard & Reports (KPI cards, charts, advisor performance)
7. ✅ Integrations (Zalo OA + Facebook webhooks, message queue)
8. ✅ Supabase Cloud deployment (database only)
9. ✅ Local demo working (login + pipeline verified)

## Bug Fixes Applied
- **Nav icon serialization**: Lucide components → string `iconName` + `ICON_MAP` in client component
- **Missing /leads route**: Added redirect to /pipeline
- **Windows NUL file crash**: Turbopack crash on Windows reserved device name, deleted via Python Win32 API
- **Port conflicts**: Always `rm -rf .next` + `taskkill /f /im node.exe` before restart

## Known Issues
- Middleware deprecation warning: Next.js 16 recommends "proxy" instead of "middleware"
- Port 3000 ghost process on Windows (kill with `taskkill /f /im node.exe`)
- `/reminders`, `/students`, `/reports`, `/settings` routes not yet tested in browser

## Next Steps (Priority Order)
1. **Test remaining routes**: `/reminders`, `/students`, `/reports`, `/settings` - fix any errors
2. **Deploy to Vercel**: Connect GitHub repo, set env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
3. **Fix middleware→proxy migration** (Next.js 16 deprecation)
4. **Production hardening**: Error boundaries, loading states, SEO meta

## Dev Commands
```bash
# Start dev server
cd "F:/APP Antigravity/Tool/Luna CRM/luna-english-crm"
npm run dev

# Clean restart (Windows)
taskkill /f /im node.exe
rm -rf .next
npm run dev

# Build for production
npm run build
```

## Luna Brand Colors
- Primary: `#3E1A51` (deep purple) → oklch(0.28 0.12 310)
- Secondary: `#3FA5DC` (blue) → oklch(0.65 0.14 230)
- Sidebar: Dark purple background with blue accents
