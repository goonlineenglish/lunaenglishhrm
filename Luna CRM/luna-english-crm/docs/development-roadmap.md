# Development Roadmap

## Phase 1: Project Setup & Database — COMPLETE
- [x] Next.js 16 project initialization
- [x] Tailwind CSS v4 + shadcn/ui setup
- [x] Supabase project creation
- [x] Database migrations 001-009 (core tables)
- [x] Seed data (10 sample leads)

## Phase 2: Auth & Layout Shell — COMPLETE
- [x] Supabase Auth integration
- [x] Login page with email/password
- [x] Dashboard layout (sidebar, header)
- [x] Role-based navigation
- [x] User menu + logout

## Phase 3: Lead Pipeline (Kanban) — COMPLETE
- [x] Kanban board with @dnd-kit drag-drop
- [x] 8-stage Vietnamese pipeline
- [x] Lead cards with SLA timer
- [x] Quick-add lead sheet
- [x] Lead detail sheet (info, activities, reminders)
- [x] Filter bar (stage, source, advisor, date)
- [x] Command search (Cmd+K)
- [x] List view toggle
- [x] Assign advisor select
- [x] Zalo messaging from lead detail

## Phase 4: Follow-up Automation — COMPLETE
- [x] Reminder dashboard (today/upcoming/overdue)
- [x] Create reminder dialog
- [x] Auto-reminder on stage change (DB trigger)
- [x] Overdue detection cron
- [x] In-app notifications (bell + dropdown)
- [x] Realtime notification updates

## Phase 5: Student Management — COMPLETE
- [x] Student data table (@tanstack/react-table)
- [x] Student detail sheet
- [x] Status transitions (active/inactive/graduated)
- [x] CSV import (column mapping, preview, validation)
- [x] Auto-enrollment trigger at `da_dang_ky`
- [x] Create student dialog
- [x] Renewal countdown badge

## Phase 6: Dashboard & Reports — COMPLETE
- [x] KPI cards (total leads, conversion rate, etc.)
- [x] Pipeline funnel chart
- [x] Leads by source chart
- [x] Monthly trend chart
- [x] Advisor performance table
- [x] Date range filter
- [x] Dashboard views in database

## Phase 7: Integrations — COMPLETE
- [x] Zalo OA client + webhook handler
- [x] Facebook Graph API client + webhook handler
- [x] Message queue with retry processor
- [x] Integration settings page
- [x] Zalo/Facebook connection cards
- [x] Webhook events table
- [x] OAuth token refresh cron

## Phase 8: Deployment & Security Hardening — IN PROGRESS
**Owner:** Dev team | **ETA:** Pending Vercel account setup

### Completed
- [x] Supabase Cloud deployment (Singapore)
- [x] Database migrations deployed
- [x] GitHub repository setup
- [x] vercel.json with all 4 cron schedules configured
- [x] .env.local.example with all required env vars
- [x] Cron route auth: fail-closed when CRON_SECRET missing (all 4 routes)
- [x] Zalo webhook: event update by ID (race condition fix)
- [x] Message queue: correct retry status (pending vs failed)
- [x] searchLeads: escape special characters in ilike filter
- [x] Vietnamese encoding: proper diacritics in all user-facing strings
- [x] Webhook comments: accurate description of sync/async behavior

### Pending
- [ ] Vercel deployment (connect GitHub, set env vars)
- [ ] Custom domain configuration
- [ ] Vercel Cron verification (test all 4 endpoints with CRON_SECRET)

### Validation
| Item | Status |
|------|--------|
| Cron routes deny without CRON_SECRET | PASS |
| Zalo webhook updates correct record | PASS |
| Message queue retries with "pending" | PASS |
| Search escapes %, \, _ | PASS |
| All Vietnamese strings have diacritics | PASS |

## Phase 9: Testing & Hardening — IN PROGRESS
**Owner:** Dev team | **ETA:** After Phase 8 Vercel deploy

### Completed
- [x] Error boundaries (global app/error.tsx + dashboard/error.tsx)
- [x] Not-found page (app/not-found.tsx)
- [x] Loading states audit (all 5 dashboard routes have skeleton loading.tsx)
- [x] SEO metadata on all 6 pages (pipeline, reminders, students, reports, settings, login)

### Smoke Tests (manual)
- [ ] Login: email/password → redirect to /pipeline
- [ ] Login: invalid credentials → error toast
- [ ] Pipeline: Kanban loads with leads from DB
- [ ] Pipeline: drag lead between stages → stage updates
- [ ] Pipeline: quick-add lead → appears in first column
- [ ] Pipeline: lead detail sheet opens with info + activities
- [ ] Pipeline: filter by stage, source, advisor
- [ ] Pipeline: Cmd+K search opens command palette
- [ ] Reminders: page loads with today/upcoming/overdue sections
- [ ] Reminders: create reminder → appears in list
- [ ] Reminders: complete reminder → moves to done
- [ ] Students: data table loads with student records
- [ ] Students: CSV import dialog → preview → import
- [ ] Reports: KPI cards show correct numbers
- [ ] Reports: charts render (funnel, source, trend)
- [ ] Reports: advisor performance table loads
- [ ] Settings: integration cards display connection status
- [ ] Settings: webhook events table loads

### Auth & Role Tests
- [ ] Admin: can access all routes and CRUD all data
- [ ] Advisor: can only update assigned/unassigned leads
- [ ] Advisor: can only see own reminders and notifications
- [ ] Marketing: read-only access to pipeline and students
- [ ] Unauthenticated: redirected to /login

### API Endpoint Tests
- [ ] POST /api/webhooks/zalo — valid signature → 200, invalid → 401
- [ ] POST /api/webhooks/facebook — valid signature → 200, invalid → 401
- [ ] GET /api/webhooks/facebook — hub verification → challenge
- [ ] GET /api/cron/* — without CRON_SECRET → 401
- [ ] GET /api/cron/* — with valid CRON_SECRET → 200

### Performance Budget
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size < 300KB (first load JS)
- [ ] Lighthouse performance score > 80

### Remaining
- [ ] Fix middleware → proxy migration (Next.js 16 deprecation)
- [ ] Production build test (`npm run build` passes without errors)
