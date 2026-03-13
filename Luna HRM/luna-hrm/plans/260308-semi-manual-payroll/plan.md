---
title: "Semi-Manual Payroll Mode"
description: "Convert payroll from full auto-calc to semi-manual: auto-fill attendance + rates, manual entry for deductions/totals"
status: completed
priority: P1
effort: 10h
branch: feat/semi-manual-payroll
tags: [payroll, refactor, semi-manual, spreadsheet-ui]
created: 2026-03-08
completed: 2026-03-11
reviewed: codex-impl-review 3 rounds APPROVE, code-reviewer 15 issues → 12 fixed
---

# Semi-Manual Payroll Mode

## Problem
Current payroll auto-calculates ALL fields. Accountants need manual control over deductions (BHXH, BHYT, BHTN, TNCN), gross/net pay, and adjustment fields to handle real-world agreements and ad-hoc situations.

## Solution
Convert to semi-manual mode: system auto-fills attendance data + salary rates, pre-fills suggestions from existing data, accountant manually enters/adjusts remaining fields on a spreadsheet-like UI.

## Phases

| # | Phase | Est. | Status |
|---|-------|------|--------|
| 1 | [Database Migration](./phase-01-database-migration.md) | 1h | ✅ completed |
| 2 | [Backend Services Refactor](./phase-02-backend-services-refactor.md) | 3h | ✅ completed |
| 3 | [Backend Actions Refactor](./phase-03-backend-actions-refactor.md) | 2h | ✅ completed |
| 4 | [Spreadsheet UI](./phase-04-spreadsheet-ui.md) | 3h | ✅ completed |
| 5 | [Testing & Cleanup](./phase-05-testing-and-cleanup.md) | 1h | ✅ completed |

## Key Dependencies
- Phase 2 depends on Phase 1 (audit log table must exist)
- Phase 3 depends on Phase 2 (new service functions must exist)
- Phase 4 depends on Phase 3 (new actions must exist)
- Phase 5 depends on all prior phases

## Field Classification
- **Auto-calculated (read-only):** sessions_worked, rate_per_session, teaching_pay, substitute_sessions, substitute_rate, substitute_pay
- **Pre-filled suggestions (editable):** kpi_bonus, allowances, deductions, penalties, other_pay
- **Manual entry (starts at 0):** bhxh, bhyt, bhtn, tncn, gross_pay, net_pay
- **System-managed:** is_reviewed (boolean, set true on batch save, used as confirm gate)

## Critical Invariants
- After any payslip save (initialize, reinitialize, batch update), `payroll_periods.total_gross` and `total_net` MUST be recomputed from SUM of payslips
- Audit log writes MUST use `createAdminClient()` (service_role), matching existing `audit-log-service.ts` pattern
- Migration `000_reset_database.sql` must be updated to DROP `payslip_audit_logs` table

## What NOT to change
- `payslips` table schema (keep all existing columns)
- `payroll_periods` table schema
- Source tables: salary_components, kpi_evaluations, employee_weekly_notes
- Tax/insurance calculators (keep as reference utilities)
- Existing RLS policies on payslips
