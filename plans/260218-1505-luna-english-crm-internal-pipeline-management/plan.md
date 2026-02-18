---
title: "Luna English CRM"
description: "Internal CRM for managing student leads pipeline, follow-up automation, retention tracking & reporting"
status: pending
priority: P1
effort: "40h"
branch: "main"
tags: [crm, next.js, supabase, vietnamese, education]
created: 2026-02-18
---

# Luna English CRM -- Implementation Plan

## Context

Custom CRM for Luna English Tan Mai campus (~95 students, 9 classes, 20-50 leads/month). Replaces Google Sheets-based workflow with Kanban pipeline, automated follow-ups, retention tracking, and Zalo/Facebook integrations.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Auth + Realtime), shadcn/ui, Tailwind CSS, Vercel, @dnd-kit

**Users:** 3-5 (Admin, Advisor, Marketing) | **UI Language:** 100% Vietnamese

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Project Setup & Database | 5h | pending | [phase-01](./phase-01-project-setup-and-database.md) |
| 2 | Auth & Layout Shell | 5h | pending | [phase-02](./phase-02-auth-and-layout-shell.md) |
| 3 | Lead Pipeline Kanban (MVP Core) | 10h | pending | [phase-03](./phase-03-lead-pipeline-kanban.md) |
| 4 | Follow-up Automation | 5h | pending | [phase-04](./phase-04-follow-up-automation.md) |
| 5 | Retention & Students | 5h | pending | [phase-05](./phase-05-retention-and-students.md) |
| 6 | Dashboard & Reports | 5h | pending | [phase-06](./phase-06-dashboard-and-reports.md) |
| 7 | Integrations (Zalo OA + Facebook) | 5h | pending | [phase-07](./phase-07-integrations-zalo-facebook.md) |

## Key Dependencies

- Phase 1 blocks all others (DB schema, project scaffold)
- Phase 2 blocks 3-7 (auth middleware, layout shell)
- Phase 3 can proceed independently after Phase 2
- Phases 4, 5, 6 can run in parallel after Phase 3
- Phase 7 can start after Phase 2 (webhook routes independent of UI)

## Research Reports

- [Tech Stack Research](./research/researcher-01-nextjs-supabase-stack.md)
- [Zalo & Facebook Integration](./research/researcher-02-zalo-facebook-integration.md)
- [Brainstorm Report](../260218-luna-crm-brainstorm-report.md)

## Success Criteria

- Leads missed rate drops from ~35% to < 5%
- New lead contact time tracked and < 2h SLA enforced
- Conversion rate visible and targeting >= 30%
- Weekly reports auto-generated
- Full Vietnamese UI, mobile responsive

## Risks

| Risk | Mitigation |
|------|------------|
| Zalo OA API requires verified account | Register early; fallback to in-app notifications only |
| Facebook API changes | Keep manual CSV import as fallback |
| Staff adoption | Simple UI, Vietnamese, 1-session training |
| Supabase free tier limits | Monitor; upgrade to Pro ($25/mo) if needed |

## Running Costs

- **Free tier target:** Vercel free + Supabase free = $0/month
- **If upgraded:** ~$25/month (Supabase Pro) + Zalo Premium 399k VND (~$16)
