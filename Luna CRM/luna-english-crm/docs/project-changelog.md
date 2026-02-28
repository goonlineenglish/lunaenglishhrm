# Project Changelog

## [Unreleased]

### Planned
- Vercel deployment (connect GitHub, set env vars, verify cron)
- Custom domain configuration (if applicable)
- (Optional) Middleware → proxy migration (Next.js 16 deprecation warning)
- (Optional) Rate limiting on webhook endpoints
- (Optional) Admin UI for email/Zalo template management

---

## [0.4.0] - 2026-02-28

### Added — Docker/Caddy Deployment + Security Hardening
- **Docker + Caddy**: Production-ready homeserver deployment (multi-stage Alpine build, non-root, 512MB mem limit)
- **docker-compose.yml**: 2-service setup with health checks (30s interval)
- **Caddyfile**: Reverse proxy with auto SSL, gzip/zstd, security headers, access logging
- **Deployment scripts**: cron-setup.sh, cron-health-check.sh, logrotate-luna-crm.conf
- **Next.js standalone**: Configured for edge deployment with NEXT_PUBLIC env vars exposed to Edge runtime

### Fixed
- **NEXT_PUBLIC env vars**: Exposed to Edge runtime in standalone mode (was missing from prelude)
- **Nested Luna CRM dir**: Excluded from Docker build (.dockerignore updated)
- **Resend lazy-init**: Prevent SSR crash when API key is missing (init only on first use)
- **Backend schema**: Migration 024 backfill for missing user profiles (ensure-user-profile pattern)

### Database
- Migration 024: `backfill_missing_user_profiles` - Initialize profiles for auth.users without records

### Infrastructure
- Standalone Next.js output (15MB server.js)
- Alpine Node 20 Docker image
- Health check probes (Caddy + Luna CRM)
- Cron jobs via host crontab (4 schedules: 15min, 5min, 6h, weekly)

---

## [0.3.0] - 2026-02-24

### Added — Enhanced Activities & Communication
- **Stage Notes**: Per-stage notes/results/next-steps fields on lead detail sheet ("Ghi chu stage" tab). History preserved across stage changes.
- **Scheduled Activities**: Full activity scheduling with date range, participants, recurrence support. New `/activities` route with global view + filters.
- **Smart Stage Checklists**: Auto-generated checklists per pipeline stage (configurable via Settings). Tracks completion progress per lead.
- **Stale Lead Detection**: `find_stale_leads()` RPC + cron integration to flag leads idle too long in a stage.
- **Email Communication**: Send emails from lead detail sheet using Resend SDK. Template selection with {{var}} placeholder substitution + live preview.
- **Zalo OA Messaging**: Send Zalo messages from lead detail sheet. Template-based messaging. Removed `source === 'zalo'` gating; now uses `zalo_followers` record check.
- **Trial Class Auto-Reminder**: Cron sends Zalo reminder 24h before scheduled trial class.
- **Quick Activity Button**: "Them Activity" button on lead cards for fast scheduling.

### Database
- 6 new migrations (016-021): `lead_stage_notes`, `stage_next_step_configs`, `email_templates`, `zalo_message_templates` tables + scheduling columns on `lead_activities` + RLS + triggers + `find_stale_leads()` RPC
- 4 new activity_type enum values: `scheduled_call`, `trial_class`, `consultation`, `checklist`
- Seed data: 7 stage configs, sample email/Zalo templates

### New Files (22 created, 8 modified)
- 5 server actions: stage-notes, scheduled-activity, checklist, email, zalo-message
- 7 UI components: lead-stage-notes-panel, add-scheduled-activity-dialog, scheduled-activity-list, activities-page-view, stage-next-steps-checklist, send-email-dialog, send-zalo-dialog
- 1 settings component: stage-config-settings
- 1 route: `/activities`
- 1 utility: template-renderer
- 2 type files: email-templates, zalo-templates

### Dependencies
- `resend` (email provider SDK)
- `date-fns-tz` (timezone conversion: UTC <-> Asia/Ho_Chi_Minh)

---

## [0.2.0] - 2026-02-22

### Security Fixes
- **Cron auth fail-closed**: All 4 cron routes now deny access when `CRON_SECRET` env var is missing (was open when unset in check-overdue-reminders, refresh-tokens, process-message-queue)
- **Search input escaping**: `searchLeads()` now escapes `%`, `\`, `_` in ilike filters to prevent query manipulation
- **Zalo webhook race condition**: Event status update now uses record ID instead of provider+event_name query (prevents updating wrong record when concurrent events arrive)
- **Facebook access token**: Moved from URL query params to Authorization header (was exposed in logs)
- **Webhook idempotency**: Added deduplication for duplicate webhook events (webhook_idempotency.ts)
- **Message queue reclamation**: Added claimed_at tracking for reclamation of failed jobs (migration 023)
- **Centralized getAdminClient()**: Eliminated 4 duplicate implementations in separate modules

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
