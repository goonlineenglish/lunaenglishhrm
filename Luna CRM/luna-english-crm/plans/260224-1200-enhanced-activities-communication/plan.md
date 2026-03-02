---
title: "Enhanced Activities, Stage Notes & Multi-channel Communication"
description: "Add scheduled activities, per-stage notes/results/next-steps, smart reminders, and Zalo OA + Email messaging to Luna CRM pipeline."
status: completed
priority: P1
effort: 10-14 days
branch: main
tags: [pipeline, activities, reminders, zalo, email, crm]
created: 2026-02-24
---

# Plan: Enhanced Activities & Communication

## Context
- Project: `F:\APP Antigravity\Tool\Luna CRM\luna-english-crm`
- Research: `./research/researcher-01-activity-reminders.md`
- Research: `./research/researcher-02-zalo-email-comms.md`

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [DB Schema — Stage Notes & Scheduled Activities](./phase-01-db-schema-stage-notes-activities.md) | completed | 1-2 days |
| 2 | [Stage Notes UI — Note/Result/NextSteps per card](./phase-02-stage-notes-ui.md) | completed | 1 day |
| 3 | [Scheduled Activity Management](./phase-03-scheduled-activity-management.md) | completed | 2-3 days |
| 4 | [Smart Stage Next-Steps Reminders](./phase-04-smart-stage-reminders.md) | completed | 1-2 days |
| 5 | [Email Communication from Lead Card](./phase-05-email-communication.md) | completed | 1-2 days |
| 6 | [Zalo OA Messaging from Lead Card](./phase-06-zalo-messaging.md) | completed | 2-3 days |

## Key Dependencies
- Phase 1 (DB) must complete before all other phases
- Phase 3 (Activities) before Phase 4 (Smart Reminders)
- Phase 5 (Email) and Phase 6 (Zalo) can run in parallel after Phase 1

## Architecture Summary

```
Lead Card (Kanban)
├── Stage Notes Panel          [Phase 2] — note/result/next_steps per stage
├── Activity Button            [Phase 3] — schedule call/trial/meeting
│   ├── Upcoming Activities    — global calendar view
│   └── Reminder system        — HTTP cron notifies when activity due
├── Smart Next Steps           [Phase 4] — stage-triggered checklist
│   └── Stage transition       — auto-suggest next actions
└── Communication              [Phase 5+6]
    ├── Send Email              — Resend provider, DB templates
    └── Send Zalo OA            — template messages, ZNS
```

## New DB Objects (all phases)
- `lead_stage_notes` table — per-stage notes/result/next_steps with history
- Alter `lead_activities` — add schedule_from/to, participants, location, status
- `stage_next_step_configs` table — configurable next steps per stage
- `email_templates` table — stage-based email templates
- `zalo_message_templates` table — stage-based Zalo templates
- Migration 016–020

## Unresolved Questions
1. ~~Recurring activities?~~ → **Resolved: Weekly recurrence (not full rrule)**
2. ~~Timezone: UTC only or Vietnam +7?~~ → **Resolved: Store UTC, display Asia/Ho_Chi_Minh**
3. ~~ZNS approval timeline~~ → **Skipped for MVP — Zalo OA template only**
4. Email sender domain: need custom domain for Resend deliverability

## Codex Review Fixes Applied
1. **DB enum name**: `lead_activity_type` (not `activity_type`) — use `ALTER TYPE public.lead_activity_type ADD VALUE`
2. **Indexes**: Add `idx_lead_activities_schedule_to` and `idx_lead_activities_status` for cron queries
3. **stage_next_step_configs**: Add `UNIQUE(stage)` constraint, seed uses `ON CONFLICT (stage) DO UPDATE`
4. **Trigger merge**: Extend existing `create_stage_reminder()` in migration 010, not create new trigger
5. **Cron strategy**: Keep HTTP cron route (existing pattern), extend it for activity deadlines — no pg_cron
6. **Zalo gating**: Change from `lead.source === 'zalo'` to `has zalo_followers record` check
7. **Zalo lookup**: Try `zalo_followers.lead_id` first, fallback to phone normalization
8. **Activity type icons**: Add scheduled_call, trial_class, consultation to ACTIVITY_ICONS/ACTIVITY_LABELS maps
9. **Email/Zalo logging**: Reuse `lead_activities` with `type='message'` and `metadata.channel`
10. **date-fns-tz**: Must install before Phase 03 (`npm install date-fns-tz`)
