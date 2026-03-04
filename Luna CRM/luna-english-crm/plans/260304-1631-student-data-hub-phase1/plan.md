---
title: "Phase 1: Student Data Hub"
description: "Database schema, 2-way Google Sheet sync, types/actions refactor, student profile UI"
status: completed
priority: P1
effort: 20h
branch: main
tags: [student-hub, v0.5.0, database, google-sheets, ui]
created: 2026-03-04
completed: 2026-03-04
---

# Phase 1: Student Data Hub — Luna CRM v0.5.0

## Context
- Brainstorm: `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md`
- Operations: `plans/student-hub-operation-principles.md`
- EasyCheck research: `plans/reports/researcher-260304-1330-easycheck-crawling-feasibility.md`

## Overview
First of 4 phases building Student Hub + Parent Reporting. Creates data foundation: new DB tables, 2-way Google Sheet sync, updated types/actions, enhanced student profile UI.

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Database Gap-Fill Migration (034) | Complete | 2h | [phase-01](./phase-01-database-migrations.md) |
| 2 | Types & Constants | Complete | 2h | [phase-02](./phase-02-types-and-constants.md) |
| 3 | Student Actions Refactor | Complete | 3h | [phase-03](./phase-03-student-actions-refactor.md) |
| 4 | Google Sheets 2-Way Sync | Complete | 6h | [phase-04](./phase-04-google-sheets-two-way-sync.md) |
| 5 | Student Profile UI | Complete | 4h | [phase-05](./phase-05-student-profile-ui.md) |
| 6 | Testing & Build Validation | Complete | 1h | [phase-06](./phase-06-testing-and-build.md) |

## Dependencies
```
Phase 1 (DB) → Phase 2 (Types) → Phase 3 (Actions) → Phase 4 (Sync) → Phase 5 (UI)
Phase 6 runs after all phases
```

## Key Decisions
- Google Sheet: 2-way sync, Sheet wins conflict, **15-min cron** (canonical schedule), snapshot comparison
- Student code: cross-system ID (CRM ↔ Sheet ↔ EasyCheck), **enforced NOT NULL** with backfill migration
- Programs: 7 enum values total (4 existing + 3 new). Legacy `secondary` → **migrate to `secondary_basic`** via UPDATE on `leads.program_interest` + `students.program_type` (column added first) + deprecation
- Payment: paid, partial, unpaid, overdue
- student-actions.ts (398 lines) → split into 4 files + barrel
- google-sheets-sync.ts → modularize into 3 files + orchestrator
- Inbound Sheet→CRM: if student has no lead, **auto-create lead** with source='google_sheet' (enum value added in migration 034), stage='da_dang_ky'
- Sync concurrency: **`sync_runs` UNIQUE partial index** `WHERE status='running'` — INSERT fails if another active run exists; stale runs (>10min) auto-timeout. Serverless-compatible (no `pg_try_advisory_lock`). Table created in migration 034.
- Phase 1 scope: **9 new tables** across migrations 029-034 (5 EasyCheck + 2 learning + sheet_sync_snapshots + sync_runs). Remaining 4 tables (parent_reports, parent_portal_tokens, crawler_logs, ai_drafts) → Phases 2-4

## Success Criteria
- [x] Migration 034 runs clean on Supabase (fills gaps from 029-033)
- [x] Legacy `secondary` data migrated to `secondary_basic`
- [x] `lead_source` enum has `google_sheet` value
- [x] `student_code` NOT NULL enforced, all existing rows backfilled
- [x] `sync_runs` table exists with UNIQUE partial index
- [x] `npm run build` passes
- [x] Google Sheet 2-way sync works (inbound + outbound)
- [x] Sync conflict test passes (Sheet wins)
- [x] Sync UNIQUE partial index prevents concurrent runs
- [x] Student profile shows new fields
- [x] Student table shows program, teacher, payment columns
- [x] Automated tests for sync conflict logic pass
