# Phase 6: Employee Profile + Evaluation System

## Context Links

- [Brainstorm V4 — Profile + Evaluation](../reports/brainstorm-260306-employee-profile-evaluation-system.md)
- [System Architecture](../../docs/system-architecture.md) — Tables 11-16, RLS evaluation policies
- [Code Standards](../../docs/code-standards.md) — employees/ component structure
- [UI Mockups](../visuals/hrm-ui-mockups-attendance-payroll.md) — Screen 12

## Overview

- **Priority:** P1 (Extended HR capabilities)
- **Status:** Pending
- **Effort:** 2-3 days
- **Description:** Extended employee profile form (CCCD, DOB, bank, qualifications, characteristics), evaluation template management (admin CRUD), evaluation period management (admin creates/closes), BM evaluation form (select template, score each criterion), ad-hoc employee notes (praise/warning/observation/general), employee profile tabs (Info | Evaluations | Notes), employee self-view evaluations (read-only), RLS for 6 evaluation tables.

## Key Insights

- Evaluation system is SEPARATE from KPI system. KPI = monthly assistant bonus. Evaluations = periodic/ad-hoc assessments for any position.
- Templates define criteria sets (admin creates once, reuses). Each template has N criteria with weights and max scores.
- Evaluation periods are admin-defined (e.g., "Ki 1/2026", "Quy 2/2026"). BM evaluates within open periods.
- Ad-hoc notes are lightweight (no template needed) — BM writes quick feedback anytime.
- **[ISSUE-6 fix] bonus_impact is INFORMATIONAL ONLY** — `employee_evaluations.bonus_impact` records the BM's recommended bonus amount but does NOT auto-feed into payroll. If BM wants it reflected, they create an `employee_weekly_note` of type 'bonus' with the amount. This keeps payroll input source = employee_weekly_notes ONLY.
- Employee profile already has extended fields in the `employees` table (Phase 1 created them). This phase builds the UI to edit/view those fields.

## Requirements

### Functional
1. **Extended profile form** — All 30+ employee fields: personal info, employment, bank, qualifications, characteristics
2. **Profile tabs** — Info | Evaluations | Notes (tabbed view on employee detail page)
3. **Evaluation template CRUD** — Admin creates templates: name, applies_to (position filter), criteria list
4. **Evaluation criteria** — Within template: name, description, max_score, weight, sort_order
5. **Evaluation period management** — Admin creates periods with date range, opens/closes them
6. **BM evaluation form** — Select template → score each criterion → total + notes → save
7. **Ad-hoc employee notes** — Quick note form: select type (praise/warning/observation/general), content
8. **Evaluation history** — Chronological list of all evaluations for an employee
9. **Notes history** — Chronological list of all notes for an employee
10. **Employee self-view** — Employee sees own evaluations (read-only, no scores hidden)

### Non-Functional
- Profile form handles 30+ fields without being overwhelming (use sections/accordions)
- Template creation intuitive (add/remove criteria inline)
- Evaluation form validates scores against max_score per criterion

## Architecture

### Evaluation System Flow
```
Admin creates template:
    "Danh gia GV cuoi ki" → 5 criteria (each with max_score, weight)
         │
Admin creates period:
    "Ki 1/2026" (01/01 → 30/06) → status='open'
         │
BM evaluates employee:
    Select template → score each criterion → total calculated → save
    Creates employee_evaluation + N evaluation_scores
         │
Employee views:
    Profile → Evaluations tab → list of evaluations (read-only)
```

### Data Model
```
evaluation_templates (1) ──► evaluation_criteria (N)
         │
         ▼
employee_evaluations (1) ──► evaluation_scores (N, one per criterion)
         │
         ├── employee_id → employees
         ├── template_id → evaluation_templates
         └── period_id → evaluation_periods (nullable for ad-hoc)
```

## Related Code Files

### Files to Create

**Routes:**
- `app/(dashboard)/evaluation-templates/page.tsx` — Template management (admin)
- `app/(dashboard)/evaluation-periods/page.tsx` — Period management (admin)
- `app/(dashboard)/employees/[id]/evaluations/page.tsx` — Create evaluation for employee

**Components — Profile:**
- `components/employees/employee-profile-tabs.tsx` — Tab container (Info | Evaluations | Notes)
- `components/employees/employee-profile-info.tsx` — Extended profile form (edit/view)
- `components/employees/employee-personal-section.tsx` — Personal info fields
- `components/employees/employee-employment-section.tsx` — Employment info fields
- `components/employees/employee-bank-section.tsx` — Bank info fields
- `components/employees/employee-qualifications-section.tsx` — Qualifications + characteristics

**Components — Evaluation Templates:**
- `components/evaluations/evaluation-template-table.tsx` — Template list
- `components/evaluations/evaluation-template-form.tsx` — Create/edit template + criteria
- `components/evaluations/evaluation-criteria-editor.tsx` — Add/remove/reorder criteria inline

**Components — Evaluations:**
- `components/evaluations/evaluation-period-table.tsx` — Period list with status
- `components/evaluations/evaluation-period-form.tsx` — Create period dialog
- `components/evaluations/evaluation-form.tsx` — BM scoring form (select template, score)
- `components/evaluations/evaluation-score-input.tsx` — Individual criterion scoring
- `components/evaluations/evaluation-history-list.tsx` — Chronological evaluation list
- `components/evaluations/evaluation-detail-view.tsx` — Full evaluation result

**Components — Notes:**
- `components/employees/employee-notes-list.tsx` — Chronological notes list
- `components/employees/employee-note-form.tsx` — Quick note creation form

**Server Actions:**
- `lib/actions/evaluation-template-actions.ts` — Template + criteria CRUD
- `lib/actions/evaluation-period-actions.ts` — Period CRUD
- `lib/actions/evaluation-actions.ts` — Employee evaluation CRUD
- `lib/actions/employee-notes-actions.ts` — Ad-hoc notes CRUD

**Types:**
- `lib/types/evaluation.ts` — Template, Criteria, Period, Evaluation, Score interfaces

### Files to Modify
- `app/(dashboard)/employees/[id]/page.tsx` — Add profile tabs
- `lib/actions/employee-actions.ts` — Add update for extended fields

## Implementation Steps

### Step 1: Evaluation Types
1. Create `lib/types/evaluation.ts`:
   ```typescript
   export interface EvaluationTemplate {
     id: string; name: string; applies_to: 'teacher' | 'assistant' | 'office' | 'all';
     max_total_score: number; is_active: boolean; created_by: string;
     criteria?: EvaluationCriterion[];
   }
   export interface EvaluationCriterion {
     id: string; template_id: string; name: string; description: string;
     max_score: number; weight: number; sort_order: number;
   }
   export interface EvaluationPeriod {
     id: string; name: string; start_date: string; end_date: string;
     status: 'open' | 'closed'; created_by: string;
   }
   export interface EmployeeEvaluation {
     id: string; employee_id: string; evaluator_id: string;
     template_id: string; period_id: string | null;
     eval_type: 'periodic' | 'ad_hoc'; total_score: number;
     overall_notes: string; bonus_impact: number | null;
     status: 'draft' | 'confirmed';
     scores?: EvaluationScore[];
   }
   export interface EvaluationScore {
     id: string; evaluation_id: string; criterion_id: string;
     score: number; comment: string;
   }
   ```

### Step 2: Extended Employee Profile UI
1. Split employee detail page into tabs using `components/employees/employee-profile-tabs.tsx`
2. Create `components/employees/employee-personal-section.tsx`:
   - Fields: date_of_birth, id_number, id_issue_date, id_issue_place, address, emergency_contact, nationality
3. Create `components/employees/employee-employment-section.tsx`:
   - Fields: employee_code, position, role, branch, rate_per_session, sub_rate, has_labor_contract, dependent_count, join_date, status
4. Create `components/employees/employee-bank-section.tsx`:
   - Fields: bank_account_number, bank_name
5. Create `components/employees/employee-qualifications-section.tsx`:
   - Fields: qualifications (multi-line), teaching_license, characteristics (multi-line)
6. Create `components/employees/employee-profile-info.tsx`:
   - Combines all 4 sections with accordion/collapsible layout
   - Edit mode for admin/BM, read-only for employee
7. Update `lib/actions/employee-actions.ts` — add `updateEmployeeProfile(id, extendedFields)` action

### Step 3: Evaluation Template CRUD
1. Create `lib/actions/evaluation-template-actions.ts`:
   - `getEvaluationTemplates()` — list active templates
   - `getEvaluationTemplate(id)` — single template with criteria
   - `createEvaluationTemplate(data)` — insert template + criteria in transaction
   - `updateEvaluationTemplate(id, data)` — update template + add/remove criteria
   - `deactivateTemplate(id)` — set is_active=false
2. Create `components/evaluations/evaluation-template-table.tsx` — list with applies_to filter
3. Create `components/evaluations/evaluation-criteria-editor.tsx`:
   - Dynamic list: "Add criterion" button → new row (name, description, max_score, weight)
   - Drag to reorder (sort_order)
   - Delete criterion button
4. Create `components/evaluations/evaluation-template-form.tsx` — name, applies_to selector, criteria editor
5. Create `app/(dashboard)/evaluation-templates/page.tsx` — admin-only page

### Step 4: Evaluation Period Management
1. Create `lib/actions/evaluation-period-actions.ts`:
   - `getEvaluationPeriods()` — list all
   - `createEvaluationPeriod(data)` — insert
   - `closeEvaluationPeriod(id)` — set status='closed'
2. Create `components/evaluations/evaluation-period-table.tsx` — list with open/closed badges
3. Create `components/evaluations/evaluation-period-form.tsx` — name, start_date, end_date
4. Create `app/(dashboard)/evaluation-periods/page.tsx` — admin-only page

### Step 5: BM Evaluation Form
1. Create `lib/actions/evaluation-actions.ts`:
   - `createEvaluation(data)` — insert employee_evaluation + evaluation_scores
   - `updateEvaluation(id, data)` — update scores and notes (if draft)
   - `confirmEvaluation(id)` — set status='confirmed'
   - `getEmployeeEvaluations(employeeId)` — all evaluations for employee
   - `getEvaluationDetail(evaluationId)` — single with scores + template
2. Create `components/evaluations/evaluation-score-input.tsx`:
   - Criterion name + description
   - Score input (0 to max_score range)
   - Comment textarea
   - Validation: score must not exceed max_score
3. Create `components/evaluations/evaluation-form.tsx`:
   - Step 1: Select template (filtered by employee's position)
   - Step 2: Select period (open periods only) OR mark as ad-hoc
   - Step 3: Score each criterion (N score inputs)
   - Auto-calculate total (weighted sum)
   - Overall notes textarea
   - Optional: bonus_impact (VND amount affecting payroll)
   - Save as draft / confirm
4. Create `app/(dashboard)/employees/[id]/evaluations/page.tsx` — evaluation form page

### Step 6: Ad-Hoc Employee Notes
1. Create `lib/actions/employee-notes-actions.ts`:
   - `getEmployeeNotes(employeeId)` — all notes for employee
   - `createEmployeeNote(data)` — insert note
   - `deleteEmployeeNote(id)` — remove note
2. Create `components/employees/employee-note-form.tsx`:
   - Type selector: Khen (praise) | Canh bao (warning) | Nhan xet (observation) | Chung (general)
   - Content textarea
   - Submit button
3. Create `components/employees/employee-notes-list.tsx`:
   - Chronological list with type badge colors
   - Praise = green, Warning = red, Observation = blue, General = gray
   - Show author + date

### Step 7: Profile Tabs Integration
1. Update `app/(dashboard)/employees/[id]/page.tsx`:
   - Add tabbed layout: Thong tin | Danh gia | Ghi chu
   - Tab 1 (Info): employee-profile-info component
   - Tab 2 (Evaluations): evaluation-history-list + "Danh gia moi" button (BM/admin only)
   - Tab 3 (Notes): employee-notes-list + note-form (BM/admin only)
2. Create `components/evaluations/evaluation-history-list.tsx`:
   - Card per evaluation: template name, period, total score, evaluator, date
   - Click → expand to show evaluation-detail-view
3. Create `components/evaluations/evaluation-detail-view.tsx`:
   - Full scores breakdown per criterion
   - Overall notes, bonus_impact if set

### Step 8: Employee Self-View
1. When user role = 'employee', profile tabs show:
   - Info tab: read-only
   - Evaluations tab: list only (can see scores, read-only)
   - Notes tab: hidden (BM/admin notes not visible to employee)
2. RLS enforces: employee SELECT own evaluations only

### Step 9: RLS for Evaluation Tables
1. Verify/add RLS policies for 6 tables:
   - `evaluation_templates`: admin CRUD, BM/accountant SELECT, employee none
   - `evaluation_criteria`: admin CRUD, BM/accountant SELECT, employee none
   - `evaluation_periods`: admin CRUD, BM/accountant SELECT, employee none
   - `employee_evaluations`: admin ALL, BM CRUD (own branch), accountant SELECT, employee SELECT (own)
   - `evaluation_scores`: admin ALL, BM CRUD (own branch), accountant SELECT, employee SELECT (own)
   - `employee_notes`: admin ALL, BM CRUD (own branch), accountant SELECT, employee none

### Step 10: Verify & Build
1. Test: admin creates template with 5 criteria
2. Test: admin creates/closes period
3. Test: BM evaluates employee with scoring
4. Test: BM writes ad-hoc note
5. Test: employee views own evaluations (read-only)
6. Test: employee cannot see notes
7. Run `npm run build`

## Todo List

- [ ] Create evaluation types
- [ ] Build extended employee profile form (4 sections)
- [ ] Build profile tabs (Info | Evaluations | Notes)
- [ ] Build evaluation template CRUD (admin)
- [ ] Build criteria editor (dynamic add/remove/reorder)
- [ ] Build evaluation period management (admin)
- [ ] Build BM evaluation form (select template, score criteria)
- [ ] Build evaluation score input component
- [ ] Build ad-hoc employee notes (CRUD)
- [ ] Build evaluation history list
- [ ] Build evaluation detail view
- [ ] Integrate employee self-view (read-only evaluations)
- [ ] Verify RLS policies for 6 evaluation tables
- [ ] `npm run build` passes

## Success Criteria

- Admin creates template with N criteria successfully
- Admin creates/closes evaluation periods
- BM evaluates employee: selects template, scores each criterion, total auto-calculated
- BM writes ad-hoc notes (4 types)
- Employee profile shows all 30+ fields in organized sections
- Employee sees own evaluations (read-only)
- Employee cannot see notes (hidden tab)
- bonus_impact is informational record only (not auto-payroll)
- RLS enforced: BM sees own branch only
- All 6 evaluation tables have correct RLS policies

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Template changes mid-period | Medium | Snapshot template_id in evaluation — old template preserved |
| Large number of criteria per template | Low | Cap at 20 criteria, paginate if needed |
| Criteria reordering complexity | Low | Use sort_order field, simple up/down buttons instead of drag |

## Security Considerations

- Template CRUD: admin only
- Period CRUD: admin only
- Evaluation CRUD: admin (all) + BM (own branch via RLS)
- Notes CRUD: admin (all) + BM (own branch via RLS)
- Employee: read-only own evaluations, NO access to notes about themselves
- evaluator_id and author_id fields ensure accountability

## Next Steps

- Phase 7: Vietnamese localization for all evaluation labels
- Evaluation bonus_impact integration with payroll (if not already handled in Phase 3)
