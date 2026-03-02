# Project Overview - Luna English CRM

## Purpose
Internal CRM for Luna English (Tan Mai branch) managing student enrollment pipeline, lead tracking, follow-up automation, scheduled activities, multi-channel communication (email + Zalo), and reporting. All 10 development phases complete.

## Target Users
- **Admin**: Full system access, user management, settings, webhooks
- **Advisor**: Lead management, follow-ups, student enrollment, reminders
- **Marketing**: Read-only pipeline + lead source analytics

## Core Features
1. **Lead Pipeline (Kanban)** - 8-stage Vietnamese pipeline with drag-drop, filters, search
2. **Follow-up Automation** - Reminder scheduling, overdue detection, in-app notifications
3. **Student Management** - Enrollment tracking, CSV import, status transitions, renewal tracking
4. **Dashboard & Reports** - KPI cards, funnel chart, source breakdown, advisor performance
5. **Integrations** - Zalo OA + Facebook webhooks, message queue with retry logic
6. **Auth & RBAC** - Supabase Auth, role-based navigation, row-level security policies
7. **Stage Notes & Checklists** - Per-stage notes/results/next-steps, smart configurable checklists
8. **Scheduled Activities** - Activity scheduling with recurrence, global /activities view, deadline notifications
9. **Email Communication** - Send emails via Resend with template selection and {{var}} substitution
10. **Zalo OA Messaging** - Send Zalo messages from lead detail with template support

## Business Context
- Vietnamese UI throughout (labels, stages, messages, notifications)
- Pipeline stages: moi_tiep_nhan → da_tu_van → dang_nurture → dat_lich_hoc_thu → dang_hoc_thu → cho_chot → da_dang_ky → mat_lead
- Auto-creates student record when lead reaches `da_dang_ky`
- Auto-creates follow-up reminders on stage changes via DB triggers

## Key Metrics
- Lead conversion rate per stage
- Advisor performance (leads assigned, converted, closed)
- Lead source effectiveness (call, referral, ad, etc.)
- Monthly enrollment trend

## Deployment Status
- **Supabase Cloud**: Deployed (Singapore) — `vgxpucmwivhlgvlzzkju.supabase.co`
- **GitHub**: `goonlineenglish/luna-english-crm` (main branch, up to date)
- **Docker + Caddy**: Homeserver deployment ready (see deployment-guide.md)
- **Vercel**: Alternative cloud option (vercel.json with all 4 crons configured)

## Security Features
- RLS policies on all 8 core tables (admin=full, advisor=scoped by lead assignment, marketing=read-only)
- HMAC-SHA256 webhook signature verification (Zalo + Facebook)
- Cron auth fail-closed (all 4 endpoints deny without CRON_SECRET)
- Input validation & sanitization on all server actions
- No sensitive data exposed in error messages (generic responses)
