---
title: "Payroll Per-Class Rows"
description: "Tính lương theo từng lớp — flat table, rate riêng per class, KPI badge"
status: completed
priority: P1
effort: 6h
branch: main
tags: [backend, frontend, database, payroll]
created: 2026-03-14
completed: 2026-03-14
---

# Plan: Payroll Per-Class Rows

**Brainstorm:** `plans/reports/brainstorm-260314-payroll-per-class-rows.md`

## Overview

Cải tiến payroll spreadsheet: mỗi lớp 1 dòng lương riêng (flat table), rate riêng per class, KPI badge trên dòng tổng assistant. Lương được tính theo từng lớp, không cần quan tâm tổng công tháng.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | Migration + Types | ✅ completed | ~30m | 1 new migration, 1 edit types |
| 2 | Class Schedule Rate UI | ✅ completed | ~45m | 2 edit (form + actions) |
| 3 | Init Logic — Populate class_breakdown | ✅ completed | ~1.5h | 2 edit (calculate + prefill) |
| 4 | Spreadsheet UI Refactor | ✅ completed | ~2h | 2 major edit, 1 new component |
| 5 | Save + Excel Export | ✅ completed | ~1h | 2 edit (payslip actions + excel) |

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | JSONB `class_breakdown` in payslips | Snapshot tại init, no JOIN, simple migration |
| Layout | Flat table — mỗi lớp 1 dòng | User confirmed, dễ verify |
| Rate source | `class_schedules.{position}_rate` ?? `employees.rate_per_session` | Rate riêng per class, fallback to employee default |
| Edit scope | Inline edit sessions + rate per class → auto recalc | Giữ nguyên pattern payslip-level dirty state |
| KPI display | Badge: score/10 + bonus amount | Assistants only, between class rows and summary row |
| Dòng tổng | Giữ nguyên BHXH/NET/all editable columns | Không breaking change |

## Schema Changes

```sql
-- Migration 009
ALTER TABLE class_schedules
  ADD COLUMN teacher_rate NUMERIC DEFAULT NULL,
  ADD COLUMN assistant_rate NUMERIC DEFAULT NULL;

ALTER TABLE payslips
  ADD COLUMN class_breakdown JSONB DEFAULT '[]'::jsonb;
```

### class_breakdown JSONB shape

```typescript
interface ClassBreakdownEntry {
  class_code: string
  class_name: string
  sessions: number          // editable — default from attendance
  rate: number              // editable — default from schedule/employee
  amount: number            // computed: sessions × rate
  default_sessions: number  // original attendance count (for reset)
  default_rate: number      // original rate (for reset)
}
```

## Data Flow

```
Init (payroll-calculate-actions):
  1. For each employee: query attendance per class (month scope)
  2. For each class: resolve rate = schedule.{position}_rate ?? employee.rate_per_session
  3. Build class_breakdown[] → store in payslip JSONB
  4. sessions_worked = sum(entry.sessions)
  5. teaching_pay = sum(entry.amount)

Display (spreadsheet UI):
  1. Group payslips by employee
  2. Per employee: render N class rows + KPI badge + summary row
  3. Class rows: read-only default, ✏ toggles inline edit
  4. Edit sessions/rate → recalc amount → update class_breakdown in dirty state
  5. Summary row: teaching_pay = sum(amounts), BHXH/NET editable as before

Save:
  1. batchUpdatePayslips includes class_breakdown (JSONB) + recalced teaching_pay
  2. Audit log captures class_breakdown diffs

Excel:
  1. Per-class rows with Lớp column
  2. Summary row per employee (bold)
```

## Dependencies

- Phase 2 depends on Phase 1 (migration must run first)
- Phase 3 depends on Phase 1 (types needed)
- Phase 4 depends on Phase 3 (data must be populated to display)
- Phase 5 depends on Phase 4 (save logic needs new UI shape)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Backward compat (old payslips without class_breakdown) | Low | `class_breakdown.length === 0` → fallback single-row display |
| NV dạy nhiều lớp → table dài | Medium | Employee header sticky, consider pagination later |
| Rate NULL in class_schedules | Low | Explicit fallback to employees.rate_per_session |
| KPI total_score not in payslips | Low | Compute from kpi_bonus / 50000 |
| Spreadsheet refactor breaking existing edit flow | Medium | Phase 4 tests dirty state carefully |

## Review Issues Resolved

**Review:** `plans/reports/plan-review-260314-payroll-per-class-rows.md`

| # | Severity | Issue | Fix | Phase |
|---|----------|-------|-----|-------|
| 1 | HIGH | Migration count wrong (6→9) | Updated context to 9 files (000-008) | P1 |
| 2 | HIGH | `.eq('status','active')` drops deactivated classes | Removed filter — attendance records are source of truth | P3 |
| 3 | HIGH | rate_per_session first-class nonsensical | Weighted average rate when multi-class | P3 |
| 4 | HIGH | Employee portal detail not updated | Added my-payslips/[id] per-class render step | P4 |
| 5 | HIGH | default_sessions/rate stored but no reset UI | Added reset button step in P4 | P4 |
| 6 | HIGH | Audit SELECT + AUDITED_FIELDS missing new fields | Explicit update instructions in P5 | P5 |
| 7 | MEDIUM | initializePayslipData bypass → DRY | Documented: teaching uses buildClassBreakdown, office uses existing | P3 |
| 8 | MEDIUM | N+1 queries per employee | Accepted for MVP — optimize with batch later | P3 |
| 9 | MEDIUM | classIndex undeclared in render | flatMap + accumulator in useMemo | P4 |
| 10 | MEDIUM | Hardcoded colSpan values | Dynamic colSpan from SUMMARY_COLUMNS.length | P4 |
| 11 | MEDIUM | onBlur vs onChange inconsistency | Use onChange consistently | P4 |
| 12 | MEDIUM | Substitute sessions not class-attributed | Documented limitation — flat value on summary row only | P3 |
| 13 | MEDIUM | JSONB validation weak — no amount recalc | Server-side recalculation, ≥0 checks, array cap | P5 |
| 14 | MEDIUM | File size > 200 lines | Extract PayrollEmployeeGroup component | P4 |
| 15 | MEDIUM | SPREADSHEET_COLUMNS rename breaks imports | Keep export name, internal alias | P4 |
| 16 | LOW | KPI magic number 50000 | Accepted — extract to constant later |
| 17 | LOW | parseFloat('0') falsy | Use `.trim() !== ''` check | P2 |
| 18 | LOW | Concurrent JSONB edit | Accepted — single-user assumption documented |
| 19 | LOW | Excel empty cells confusing | Accepted — add Type column later |
| 20 | LOW | SELECT * includes class_breakdown | Works via `??` pattern — no fix needed |
