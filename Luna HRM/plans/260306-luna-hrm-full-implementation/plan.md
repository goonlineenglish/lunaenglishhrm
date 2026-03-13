---
title: "Luna HRM Full Implementation"
description: "7-phase implementation plan for lightweight HRM app for English Language Centers"
status: pending
priority: P1
effort: 15d
branch: main
tags: [hrm, next.js-16, supabase, payroll, attendance, kpi, pwa]
created: 2026-03-06
---

# Luna HRM — Implementation Plan

## Overview

Lightweight HRM replacing Frappe HRMS for English Language Centers. 17 PostgreSQL tables (16 data + 1 attendance_locks), 4 roles, session-based salary, two-track attendance (class-based + daily), 3 payroll formulas, KPI system, template-based evaluation, PWA employee portal.

**Tech:** Next.js 16 + Supabase Cloud + shadcn/ui + Tailwind v4 + PWA
**Target:** ~15 implementation days

## Codex Review Status

**Round 1 (Phase 1 — Plan):** 10 issues raised, all addressed. APPROVED.

**Round 2 (Phase 2 — Implementation):** 7 issues raised, 6 rounds of rebuttal, APPROVED.
- ISSUE-1: Server-side lock enforcement + weekStartStr normalized via `parseIsoDateLocal` + `getWeekStart` across all 7 lock-lifecycle paths ✅
- ISSUE-2: Auto-fill "1" now persisted before lockWeek() in attendance-grid.tsx ✅
- ISSUE-3: schedule_id ownership + employeeId assigned to schedule + teacher/assistant position validation ✅
- ISSUE-4: Admin branch selector gated before data load ✅
- ISSUE-5: `toISODate` uses local year/month/day (not UTC ISO string) ✅
- ISSUE-6: Staff reassignment blocked when attendance records exist ✅
- ISSUE-7: Upsert replaces insert+loop in both attendance and office_attendance ✅

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Database + Auth + Scaffold | ✅ Done | 2-3d | [phase-01](./phase-01-database-auth-scaffold.md) |
| 2 | Class Schedules + Attendance | ✅ Done | 2-3d | [phase-02](./phase-02-class-schedules-attendance.md) |
| 3 | Payroll Calculation Engine | ✅ Done | 3-4d | [phase-03](./phase-03-payroll-calculation-engine.md) |
| 4 | KPI Evaluation System | ✅ Done | 1-2d | [phase-04](./phase-04-kpi-evaluation-system.md) |
| 5 | Employee Self-Service Portal | ✅ Done | 1-2d | [phase-05](./phase-05-employee-self-service-portal.md) |
| 6 | Employee Profile + Evaluation | ✅ Done | 2-3d | [phase-06](./phase-06-employee-profile-evaluation.md) |
| 7 | Polish + Localization | ✅ Done | 1d | [phase-07](./phase-07-polish-localization.md) |

## Key Dependencies

- Phase 1 blocks all other phases (DB + Auth foundation)
- Phase 2 blocks Phase 3 (attendance data feeds payroll)
- Phase 4 integrates into Phase 3 (KPI bonus in payslip)
- Phase 5 depends on Phases 2-4 (read-only views of attendance/payslip/KPI)
- Phase 6 independent of Phases 2-5 (only needs DB + Auth)
- Phase 7 runs after all features complete

## Reference Docs

- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)
- [Design Guidelines](../../docs/design-guidelines.md)
- [Project Roadmap](../../docs/project-roadmap.md)
- [Brainstorm V2 — Attendance](../reports/brainstorm-260305-v2-attendance-redesign.md)
- [Brainstorm V3 — Payroll](../reports/brainstorm-260305-v3-payroll-formulas-ui.md)
- [Brainstorm V4 — Evaluation](../reports/brainstorm-260306-employee-profile-evaluation-system.md)
- [Brainstorm V5 — Class Schedules](../reports/brainstorm-260306-class-schedule-attendance-separation.md)
- [18 Optimizations](../reports/brainstorm-optimizations.md)
- [UI Mockups (13 screens)](../visuals/hrm-ui-mockups-attendance-payroll.md)
- [Role Workflow Guide](../visuals/hrm-role-workflow-guide.md)
