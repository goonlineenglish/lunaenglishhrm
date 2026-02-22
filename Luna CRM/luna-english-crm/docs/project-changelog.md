# Project Changelog

## [Unreleased]

### Planned
- Vercel deployment (connect GitHub, set env vars, verify cron)
- Custom domain configuration
- Middleware → proxy migration (Next.js 16 deprecation)
- Production build verification
- Manual smoke tests (all routes)

---

## [0.2.0] - 2026-02-22

### Security Fixes
- **Cron auth fail-closed**: All 4 cron routes now deny access when `CRON_SECRET` env var is missing (was open when unset in check-overdue-reminders, refresh-tokens, process-message-queue)
- **Search input escaping**: `searchLeads()` now escapes `%`, `\`, `_` in ilike filters to prevent query manipulation
- **Zalo webhook race condition**: Event status update now uses record ID instead of provider+event_name query (prevents updating wrong record when concurrent events arrive)

### Fixed
- **Message queue retry status**: Failed messages now use "pending" status when retries remain, "failed" only after max_attempts exceeded (was always "failed")
- **Vietnamese encoding**: All user-facing strings now use proper Vietnamese diacritics (was ASCII-only in cron notifications, reminder actions, layout metadata)
- **Webhook comments**: Corrected misleading "Return 200 immediately" comments in Zalo/Facebook webhook handlers to reflect actual synchronous processing

### Added
- Global error boundary (`app/error.tsx`) — catches unhandled errors with Vietnamese UI
- Dashboard error boundary (`app/(dashboard)/error.tsx`) — route-level error recovery
- 404 not-found page (`app/not-found.tsx`) — Vietnamese "page not found" with link to /pipeline
- SEO metadata on all 6 pages: pipeline, reminders, students, reports, settings, login
- Complete `vercel.json` with all 4 cron schedules (overdue reminders 15min, message queue 5min, token refresh 6h, weekly report Mon 8am)
- `.env.local.example` expanded with CRON_SECRET, ZALO_OA_SECRET, Facebook env vars

### Documentation
- Engineering docs initialized: project-overview, system-architecture, code-standards, design-guidelines, deployment-guide, codebase-summary, development-roadmap, project-changelog
- Roadmap updated with Phase 8-9 details including owner/ETA, validation table, smoke test checklist, auth/role tests, API endpoint tests, performance budget

---

## [0.1.0] - 2025-02-20

### Added
- Full-stack CRM application with Next.js 16 + Supabase
- 15 database migrations covering all tables, RLS, triggers, views
- Lead pipeline with 8-stage Kanban board (drag-drop via @dnd-kit)
- Follow-up reminder system with auto-scheduling
- Student management with CSV import
- Dashboard with KPI cards and Recharts visualizations
- Zalo OA + Facebook webhook integrations
- Role-based access control (admin, advisor, marketing)
- Realtime updates via Supabase subscriptions
- Vietnamese UI throughout

### Fixed
- Server-to-client component serialization (Lucide icons → string iconName)
- Missing `/leads` route (added redirect to `/pipeline`)
- Windows NUL file crash (Turbopack reserved device name)

### Infrastructure
- Supabase Cloud deployed (Singapore region)
- GitHub repo: `goonlineenglish/luna-english-crm`
- Local development working with `npm run dev`
