# Phase 4: KPI Evaluation System

## Context Links

- [Brainstorm V3 — Payroll + KPI](../reports/brainstorm-260305-v3-payroll-formulas-ui.md) — KPI scoring from Excel, form mockup
- [Brainstorm — 18 Optimizations](../reports/brainstorm-optimizations.md) — Optimizations M, N, O
- [UI Mockups](../visuals/hrm-ui-mockups-attendance-payroll.md) — Screens 9-10
- [System Architecture](../../docs/system-architecture.md) — kpi_evaluations table schema

## Overview

- **Priority:** P1 (High value — feeds payroll bonus)
- **Status:** Pending
- **Effort:** 1-2 days
- **Description:** KPI evaluation form (Part A: 4 pass/fail + Part B: 5 criteria /10), bonus calculation (score x 50k), pre-fill from previous month, 6-month history chart, 25th-day reminder cron, integration with payslip.

## Key Insights

- KPI is ONLY for teaching assistants (position='assistant')
- Two-part evaluation: Part A (4 mandatory pass/fail) gates bonus; Part B (5 scored criteria) determines bonus amount
- **[ISSUE-5 fix] base_pass rule LOCKED:** `base_pass=false` means KPI bonus = 0 (not eligible for bonus). Base salary (sessions × rate) is STILL paid normally. base_pass does NOT affect base pay — only bonus eligibility. This is final business rule, confirmed before coding.
- Bonus = total_score x 50,000 VND. Range: 0 - 500,000 VND/month
- If base_pass=false (Part A), employee doesn't receive KPI bonus (bonus = 0). Base salary = sessions × rate is still paid. [ISSUE-5 fix]
- Pre-fill copies SCORES from previous month (BM adjusts only changed criteria)
- Monthly evaluation: unique constraint on (employee_id, month, year)

## Requirements

### Functional
1. **KPI evaluation form** — Part A: 4 pass/fail checkboxes; Part B: 5 criteria with score dropdowns + comment fields
2. **KPI list page** — Show all assistants for branch, current month scores, evaluated/pending status
3. **Pre-fill from previous month** — Copy last month's scores into form, BM edits changes only
4. **Bonus calculation** — Real-time total: score x 50,000 displayed as form changes
5. **6-month history chart** — Line/bar chart showing score trend per assistant
6. **25th-day reminder** — Cron endpoint notifies BM to complete KPI before payroll
7. **Payslip integration** — Payroll calculation reads bonus_amount from kpi_evaluations

### Non-Functional
- Form loads < 1s
- Chart renders smoothly (6 data points per employee)

## Architecture

### KPI Form Data Flow
```
BM opens KPI page → selects assistant
    │
    ▼
Pre-fill from previous month (if exists)
    │
    ▼
Part A: 4 pass/fail checkboxes
    ├── All pass → base_pass = true (continue to Part B)
    └── Any fail → base_pass = false (warning shown)
    │
    ▼
Part B: Score 5 criteria
    TSI: [0-1]  Funtime: [0-3]  Parents: [0-2]  Students: [0-3]  Demeanor: [0-1]
    Each has comment field
    │
    ▼
Auto-calculate: total_score (0-10) → bonus = total × 50,000
    │
    ▼
Save → kpi_evaluations table
    │
    ▼
Payroll picks up bonus_amount when calculating payslip
```

### Scoring Schema (from Excel)
```
Part A — Mandatory (Pass/Fail):
  1. Complete all assistant duties per job description
  2. Prepare classroom: furniture, materials, hygiene; protect equipment
  3. On time (arrive 15 min early)
  4. Daily student attendance + report absent students to manager

Part B — Scored (0-10 total):
  1. TSI Support (0-1): Help teacher maintain discipline for 80% students
  2. Funtime (0-3): Follow Funtime plan (1), understand each student (1), meet Funtime goals (1)
  3. Parents (0-2): Friendly/enthusiastic (1), share student progress (1)
  4. Students (0-3): 100% English communication (1), class discipline (1), child safety (1)
  5. Demeanor (0-1): No more than 2 absences, proper dress, no phone use
```

## Related Code Files

### Files to Create

**Routes:**
- `app/(dashboard)/kpi/page.tsx` — KPI list (all assistants, current month)
- `app/(dashboard)/kpi/[employee]/page.tsx` — KPI evaluation form

**Components:**
- `components/kpi/kpi-evaluation-list.tsx` — Table of assistants with status (evaluated/pending)
- `components/kpi/kpi-evaluation-form.tsx` — Full form: Part A + Part B + totals
- `components/kpi/kpi-part-a-checklist.tsx` — 4 pass/fail items
- `components/kpi/kpi-part-b-scores.tsx` — 5 scored criteria with dropdowns
- `components/kpi/kpi-score-display.tsx` — Score summary + bonus amount
- `components/kpi/kpi-history-chart.tsx` — 6-month trend chart

**Server Actions:**
- `lib/actions/kpi-actions.ts` — CRUD KPI evaluations, pre-fill, history

**Services:**
- `lib/services/kpi-calculation-service.ts` — Score validation, bonus calculation

**Types:**
- `lib/types/kpi.ts` — KpiEvaluation, KpiCriterion, KpiScore interfaces

**Cron:**
- `app/api/cron/kpi-reminder/route.ts` — 25th-day reminder

## Implementation Steps

### Step 1: KPI Types
1. Create `lib/types/kpi.ts`:
   ```typescript
   export interface KpiEvaluation {
     id: string; employee_id: string; branch_id: string;
     month: number; year: number; base_pass: boolean;
     tsi_score: number; tsi_comment: string;
     funtime_score: number; funtime_comment: string;
     parent_score: number; parent_comment: string;
     student_score: number; student_comment: string;
     demeanor_score: number; demeanor_comment: string;
     total_score: number; bonus_amount: number;
     evaluated_by: string;
   }
   export const KPI_CRITERIA = [
     { key: 'tsi', label: 'Gio TSI', maxScore: 1, description: 'Ho tro GV duy tri ky luat 80% HS' },
     { key: 'funtime', label: 'Gio Funtime', maxScore: 3, description: '...' },
     { key: 'parent', label: 'Phu huynh', maxScore: 2, description: '...' },
     { key: 'student', label: 'Hoc sinh', maxScore: 3, description: '...' },
     { key: 'demeanor', label: 'Tac phong', maxScore: 1, description: '...' },
   ]
   export const MANDATORY_CRITERIA = [
     'Hoan thanh nhiem vu TG theo mo ta cong viec',
     'Chuan bi phong hoc, bao quan vat tu',
     'Dung gio (truoc 15 phut)',
     'Diem danh HS + bao vang',
   ]
   ```

### Step 2: KPI Service
1. Create `lib/services/kpi-calculation-service.ts`:
   - `calculateKpiBonus(totalScore: number): number` — return totalScore * 50_000
   - `validateScores(scores)` — check each score within max range
   - `calculateTotalScore(scores)` — sum all 5 criteria

### Step 3: KPI Actions
1. Create `lib/actions/kpi-actions.ts`:
   - `getKpiEvaluations(branchId, month, year)` — list all assistant KPIs for period
   - `getKpiEvaluation(employeeId, month, year)` — single evaluation
   - `getPreviousKpi(employeeId, month, year)` — get previous month for pre-fill
   - `saveKpiEvaluation(data)` — upsert kpi_evaluations (unique on employee+month+year)
   - `getKpiHistory(employeeId, months: 6)` — last 6 months of scores
   - `getAssistantsWithKpiStatus(branchId, month, year)` — list assistants with evaluated/pending

### Step 4: KPI List Page
1. Create `app/(dashboard)/kpi/page.tsx`:
   - Month/year selector at top
   - Table: employee code, name, class, total score, bonus, status (evaluated/pending)
   - Click row → navigate to form
   - Badge: green "Da danh gia" / red "Chua danh gia"
2. Create `components/kpi/kpi-evaluation-list.tsx` — table component

### Step 5: KPI Evaluation Form
1. Create `app/(dashboard)/kpi/[employee]/page.tsx`:
   - Load employee info + current KPI (if exists) + previous month (for pre-fill)
   - Two-section form
2. Create `components/kpi/kpi-part-a-checklist.tsx`:
   - 4 items, each with "Dat" / "Khong Dat" toggle
   - All must pass for base_pass=true
   - If any fail: show warning "NV khong dat luong cung"
3. Create `components/kpi/kpi-part-b-scores.tsx`:
   - 5 criteria, each with:
     - Label + description
     - Score dropdown (0 to maxScore)
     - Comment textarea
   - Real-time total at bottom
   - Pre-filled from previous month (if available)
4. Create `components/kpi/kpi-score-display.tsx`:
   - Shows: "Tong KPI: 9/10  Thuong: 9 x 50,000 = 450,000 VND"
   - Updates dynamically as scores change
5. Create `components/kpi/kpi-evaluation-form.tsx` — orchestrates Part A + Part B + submit

### Step 6: Pre-fill Logic
1. In form page: fetch `getPreviousKpi(employeeId, month-1, year)`
2. If exists, populate form with previous scores and comments
3. BM reviews and adjusts as needed
4. Clear visual: "Du lieu sao chep tu thang truoc — vui long xem lai"

### Step 7: 6-Month History Chart
1. Create `components/kpi/kpi-history-chart.tsx`:
   - Use simple bar chart (CSS-based or lightweight lib like recharts)
   - X-axis: 6 months. Y-axis: 0-10 score
   - Bars colored by range: green(8-10), yellow(5-7), red(0-4)
   - Show bonus amount on hover/below each bar

### Step 8: 25th-Day Reminder Cron
1. Create `app/api/cron/kpi-reminder/route.ts`:
   - Triggered on 25th of each month (external cron)
   - Check which branches have un-evaluated assistants
   - Log reminder (or send notification if email available)
   - Secured with CRON_SECRET

### Step 9: Payslip Integration
1. In Phase 3's `payroll-session-counter.ts`, `getKpiBonus()` already queries kpi_evaluations
2. Verify: if no KPI evaluation for the month, bonus = 0
3. If base_pass = false: bonus = 0 (base salary still paid from attendance sessions × rate)

### Step 10: Verify & Build
1. Test: create KPI for assistant, verify bonus appears in payslip
2. Test: pre-fill from previous month
3. Test: 6-month chart renders correctly
4. Run `npm run build`

## Todo List

- [ ] Create KPI types and constants
- [ ] Implement KPI calculation service
- [ ] Implement KPI server actions (CRUD, pre-fill, history)
- [ ] Build KPI evaluation list page
- [ ] Build Part A checklist (4 pass/fail)
- [ ] Build Part B scored criteria (5 dropdowns + comments)
- [ ] Build real-time score display
- [ ] Build pre-fill from previous month
- [ ] Build 6-month history chart
- [ ] Create 25th-day reminder cron endpoint
- [ ] Verify payslip integration (bonus_amount flows into payroll)
- [ ] `npm run build` passes

## Success Criteria

- Form calculates total score /10 correctly
- Bonus = score x 50,000 (0-500k range verified)
- base_pass controls base salary eligibility
- Pre-fill copies previous month scores
- 6-month chart renders trend correctly
- Payslip shows KPI bonus in GROSS calculation
- 25th-day cron fires correctly
- All 5 criteria score ranges validated

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| base_pass=false business handling | Medium | RESOLVED: base_pass=false → bonus=0, base salary still paid |
| KPI not completed before payroll | Medium | Alert in payroll if assistant has no KPI for month |
| Pre-fill month boundary (Jan→Dec) | Low | Handle year rollover in date logic |

## Security Considerations

- KPI CRUD: BM (own branch via RLS) + admin (all)
- KPI view: employee sees own only
- Accountant sees all KPI for payroll reference
- evaluated_by field records who scored

## Next Steps

- Phase 5: Employee portal shows KPI scores (read-only)
- Payroll integration already built in Phase 3
