# Project Overview - Luna English CRM

## Purpose
Internal CRM for Luna English (Tan Mai branch) managing student enrollment pipeline, lead tracking, follow-up automation, and reporting.

## Target Users
- **Admin**: Full system access, user management, settings
- **Advisor**: Lead management, follow-ups, student enrollment
- **Marketing**: Read-only pipeline view, lead source analytics

## Core Features
1. **Lead Pipeline (Kanban)** - 8-stage Vietnamese pipeline with drag-drop
2. **Follow-up Automation** - Reminder scheduling, overdue detection, notifications
3. **Student Management** - Enrollment tracking, CSV import, status transitions
4. **Dashboard & Reports** - KPI cards, funnel chart, source breakdown, advisor performance
5. **Integrations** - Zalo OA + Facebook webhooks, message queue
6. **Auth & RBAC** - Supabase Auth, role-based navigation and RLS policies

## Business Context
- Vietnamese UI throughout (labels, stages, messages)
- Pipeline stages: moi_tiep_nhan → da_tu_van → dang_nurture → dat_lich_hoc_thu → dang_hoc_thu → cho_chot → da_dang_ky → mat_lead
- Auto-creates student record when lead reaches `da_dang_ky`
- Auto-creates follow-up reminders on stage change

## Key Metrics
- Lead conversion rate per stage
- Advisor performance (leads assigned, converted)
- Lead source effectiveness
- Monthly enrollment trend
