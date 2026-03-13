# Luna HRM — Codebase Summary

---

## Project Status

**Current Phase:** Phase 5 Complete ✅ (Payroll, KPI, Employee Portal)

**Phase 1 Deliverables:**
- 17-table PostgreSQL schema in Supabase
- 68 Row-Level Security policies (role-based access)
- Auth scaffold (login/logout, user context, role-based navigation)
- Employee + Branch CRUD pages
- Next.js 16 app scaffolded with App Router

**Phase 2 Deliverables:**
- Class schedule CRUD (class-schedule-actions.ts, class-schedule-form.tsx, class-schedule-table.tsx, employee-code-lookup.tsx)
- Weekly attendance grid UI (attendance-cell.tsx, attendance-week-selector.tsx, attendance-grid.tsx, attendance-diff-dialog.tsx, attendance-summary.tsx, attendance-legend.tsx)
- Office daily attendance grid (office-attendance-actions.ts, office-attendance-grid.tsx)
- Employee weekly notes (weekly-notes-actions.ts, attendance-notes-panel.tsx)
- Weekend reminder cron (app/api/cron/weekly-reminder/route.ts)
- 13 routes total
- parseIsoDateLocal utility (lib/utils/date-helpers.ts) — safe YYYY-MM-DD parsing

**Phase 3 Deliverables:**
- Payroll calculation service (payroll-calculation-service.ts, payroll-session-counter.ts, payroll-data-fetcher.ts)
- Tax calculator with 7 brackets (tax-calculator.ts)
- Payroll period CRUD + auto-calculate
- 3-tab payroll view (Teaching Assistants | Teachers | Office)
- Payslip detail panel, >20% alert, double-confirm, 24h undo
- Payroll page + [period] detail page
- 5 payroll UI components
- Email dispatch (Resend integration)

**Phase 4 Deliverables:**
- KPI evaluation types (lib/types/kpi.ts)
- KPI calculation service (kpi-calculation-service.ts)
- KPI query/save actions (kpi-query-actions.ts, kpi-save-actions.ts)
- KPI evaluation form page (Part A: 4 pass/fail + Part B: 5 criteria /10)
- Pre-fill from previous month logic
- 6-month history CSS chart
- 25th-day reminder cron (app/api/cron/kpi-reminder/route.ts)
- 5 KPI UI components

**Phase 5 Deliverables:**
- PWA manifest (public/manifest.json)
- Service worker (public/sw.js) — static assets only
- Employee portal actions (employee-portal-actions.ts)
- Bottom navigation component (bottom-nav.tsx)
- Month-year picker component (month-year-picker.tsx)
- Attendance calendar (employee-attendance-calendar.tsx)
- 4 employee portal pages (/my-attendance, /my-payslips, /my-profile, /dashboard for PWA)
- CSS-responsive layout (md:hidden / hidden md:flex)

**Codex Review (Phase 2):** 7 issues raised, APPROVED after 6 rebuttal rounds.

**What doesn't exist yet:**
- Phase 6: Extended profile, template evaluations, ad-hoc notes
- Phase 7: i18n, Excel import/export, audit logs

---

## Database Schema Reference

Luna HRM uses **16 PostgreSQL tables** in Supabase Cloud.

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `branches` | Organization locations | id, name, address, manager_id |
| `employees` | Staff directory (extended profile) | id, branch_id, employee_code, position, role, rate_per_session, date_of_birth, id_number, bank_account_number, qualifications, characteristics |
| `class_schedules` | Fixed weekly class times (1 record = 1 class) | id, branch_id, class_code, class_name, shift_time, days_of_week (INT[]), teacher_id, assistant_id |
| `attendance` | Weekly marking per class/employee (GV + TG) | id, schedule_id, employee_id, date, status (1\|0\|KP\|0.5) |
| `office_attendance` | Daily attendance for VP staff (not class-based) | id, branch_id, employee_id, date, status (1\|0\|KP\|0.5) |
| `employee_weekly_notes` | Per-employee structured notes | id, branch_id, week_start, employee_id, note_type, description, amount, amount_unit, is_processed |
| `kpi_evaluations` | Monthly KPI scores (assistants only) | id, employee_id, month, year, tsi_score, funtime_score, parent_score, student_score, demeanor_score, total_score, bonus_amount |
| `payroll_periods` | Monthly payroll cycles | id, branch_id, month, year, status (draft\|confirmed\|sent), total_gross, total_net |
| `payslips` | Individual salary calculations | id, payroll_period_id, employee_id, sessions_worked, rate_per_session, gross_pay, bhxh, bhyt, bhtn, tncn, net_pay |
| `salary_components` | Allowances/deductions | id, employee_id, component_type, name, amount, is_recurring |
| `evaluation_templates` | Admin-created criteria sets | id, name, applies_to, max_total_score, is_active |
| `evaluation_criteria` | Individual criteria in templates | id, template_id, name, max_score, weight, sort_order |
| `evaluation_periods` | Custom evaluation periods | id, name, start_date, end_date, status |
| `employee_evaluations` | Structured evaluations (periodic/ad-hoc) | id, employee_id, template_id, period_id, eval_type, total_score, bonus_impact, status |
| `evaluation_scores` | Per-criterion scores | id, evaluation_id, criterion_id, score, comment |
| `employee_notes` | Quick ad-hoc notes by BM | id, employee_id, note_type, content |

**Row-Level Security:** All tables have RLS policies enforcing role-based access (admin, branch_manager, accountant, employee).

---

## File Structure (Phase 5 Complete)

```
plans/
├── reports/
│   ├── brainstorm-260305-hrm-lightweight-rebuild.md       [V1: Architecture]
│   ├── brainstorm-260305-v2-attendance-redesign.md        [V2: Attendance + Class Schedules]
│   ├── brainstorm-260305-v3-payroll-formulas-ui.md        [V3: Payroll + KPI (FINAL)]
│   ├── brainstorm-260306-employee-profile-evaluation-system.md  [V4: Profile + Evaluation]
│   ├── phase2-codex-review-260307.md                      [Phase 2 Codex Review — APPROVED]
│   └── brainstorm-optimizations.md                        [18 MVP Optimizations]
├── visuals/
│   └── (ASCII mockups of 8+ screens)
└── Bảng lương + đánh giá trợ giảng.xlsx                   [Real Excel template]

docs/
├── project-overview-pdr.md                                 [Product Requirements]
├── system-architecture.md                                  [Database + RLS + Data Flow]
├── code-standards.md                                       [File Structure + Patterns]
├── codebase-summary.md                                     [This file]
├── project-roadmap.md                                      [7 Implementation Phases (Phase 5 ✅)]
├── deployment-guide.md                                     [Server Setup]
└── design-guidelines.md                                    [UI/UX Patterns]

app/
├── (dashboard)/
│   ├── class-schedules/                                   [Phase 2]
│   ├── attendance/                                         [Phase 2]
│   ├── office-attendance/                                 [Phase 2]
│   ├── payroll/                                            [Phase 3]
│   └── kpi/                                                [Phase 4]
├── (employee-portal)/
│   ├── my-attendance/                                      [Phase 5]
│   ├── my-payslips/                                        [Phase 5]
│   ├── my-profile/                                         [Phase 5]
│   └── dashboard/                                          [Phase 5 PWA]
├── api/
│   ├── cron/weekly-reminder/                              [Phase 2]
│   ├── cron/kpi-reminder/                                 [Phase 4]
│   └── ...
└── ...

components/
├── class-schedules/
│   ├── class-schedule-form.tsx                            [Phase 2]
│   ├── class-schedule-table.tsx                           [Phase 2]
│   ├── employee-code-lookup.tsx                           [Phase 2]
│   └── ...
├── attendance/
│   ├── attendance-cell.tsx                                [Phase 2]
│   ├── attendance-grid.tsx                                [Phase 2]
│   ├── attendance-week-selector.tsx                       [Phase 2]
│   ├── attendance-diff-dialog.tsx                         [Phase 2]
│   ├── attendance-summary.tsx                             [Phase 2]
│   ├── attendance-legend.tsx                              [Phase 2]
│   ├── attendance-notes-panel.tsx                         [Phase 2]
│   └── ...
├── office-attendance/
│   ├── office-attendance-grid.tsx                         [Phase 2]
│   └── ...
├── payroll/
│   ├── payroll-period-selector.tsx                        [Phase 3]
│   ├── payroll-data-table.tsx                             [Phase 3]
│   ├── payslip-detail-panel.tsx                           [Phase 3]
│   ├── payroll-comparison-view.tsx                        [Phase 3]
│   ├── payroll-confirm-dialog.tsx                         [Phase 3]
│   └── ...
├── kpi/
│   ├── kpi-evaluation-form.tsx                            [Phase 4]
│   ├── kpi-part-a-section.tsx                             [Phase 4]
│   ├── kpi-part-b-section.tsx                             [Phase 4]
│   ├── kpi-history-chart.tsx                              [Phase 4]
│   ├── kpi-score-display.tsx                              [Phase 4]
│   └── ...
├── employee-portal/
│   ├── employee-attendance-calendar.tsx                   [Phase 5]
│   ├── month-year-picker.tsx                              [Phase 5]
│   └── ...
├── layout/
│   ├── bottom-nav.tsx                                     [Phase 5]
│   └── ...
└── ...

lib/
├── actions/
│   ├── class-schedule-actions.ts                          [Phase 2]
│   ├── attendance-actions.ts                              [Phase 2]
│   ├── office-attendance-actions.ts                       [Phase 2]
│   ├── weekly-notes-actions.ts                            [Phase 2]
│   ├── payroll-period-actions.ts                          [Phase 3]
│   ├── payroll-calculate-actions.ts                       [Phase 3]
│   ├── payroll-payslip-actions.ts                         [Phase 3]
│   ├── kpi-query-actions.ts                               [Phase 4]
│   ├── kpi-save-actions.ts                                [Phase 4]
│   ├── employee-portal-actions.ts                         [Phase 5]
│   └── ...
├── services/
│   ├── attendance-service.ts                              [Phase 2 — lock/unlock logic]
│   ├── payroll-calculation-service.ts                     [Phase 3]
│   ├── payroll-session-counter.ts                         [Phase 3]
│   ├── payroll-data-fetcher.ts                            [Phase 3]
│   ├── kpi-calculation-service.ts                         [Phase 4]
│   └── ...
├── utils/
│   ├── date-helpers.ts                                    [Phase 2 — parseIsoDateLocal, getWeekStart]
│   ├── tax-calculator.ts                                  [Phase 3 — TNCN 7-bracket]
│   └── ...
├── types/
│   ├── attendance.ts                                      [Phase 2]
│   ├── payroll.ts                                         [Phase 3]
│   ├── kpi.ts                                             [Phase 4]
│   └── ...
└── ...

public/
├── manifest.json                                          [Phase 5 PWA]
└── sw.js                                                  [Phase 5 Service Worker]

(To be created in future phases):
- Phase 6: Profile & evaluation system
- Phase 7: Audit logs, Excel import/export
```

---

## Key Concepts

### **Salary Model: Session-Based (Not Monthly Fixed)**

Unlike traditional HR, Luna HRM calculates salary from **actual sessions taught**:

```
Salary = Sessions Worked × Rate/Session
       + KPI Bonus (if assistant)
       + Substitute Sessions
       + Allowances/Deductions
```

Examples:
- Teaching Assistant: 16 sessions × 75,000 = 1.2M base (+ KPI up to 500k)
- Teacher: 20 sessions × 500,000 = 10M base
- Office: 24 sessions × 150,000 = 3.6M base

---

### **Attendance Model: Two Tracks**

#### Track 1: Class-Based Weekly Grid (Teachers + Teaching Assistants)

**Why different:** English centers teach in fixed classes with assigned staff.

| Traditional HR | Luna HRM |
|---|---|
| Employee × Date | Class × Day of Week |
| 50 rows per day | ~10 rows per week |
| 15-20 min/day marking | 2 min/week marking |

Branch Manager marks attendance once per week in a grid:

```
Lớp             T2   T3   T4   T5   T6
IELTS A1 (GV)   [1]  ░░░  [1]  ░░░  [1]
IELTS A1 (TG)   [1]  ░░░  [1]  ░░░  [1]
Kids 1 (GV)     [1]  [1]  ░░░  [1]  [1]
Kids 1 (TG)     [1]  [KP] ░░░  [1]  [1]
```

Auto-fill: `1` = present (default). BM edits only exceptions (0, KP, 0.5).

#### Track 2: Daily Attendance (Office Staff)

VP staff (receptionist, security, admin) don't have class schedules. They use a simpler daily attendance grid:

```
Nhân viên       T2   T3   T4   T5   T6   T7   CN
Nguyễn Thị Mai  [1]  [1]  [1]  [1]  [1]  [0.5] ░░░
Đỗ Văn Giang    [1]  [1]  [1]  [1]  [1]  [1]   [1]
```

Stored in `office_attendance` table (separate from class-based `attendance`).

---

### **KPI System: 5 Criteria → Bonus**

Only **Teaching Assistants** get KPI bonus.

**5 Criteria (Total /100, condensed to /10 for payroll):**
1. TSI: 0-1 (discipline support)
2. Funtime: 0-3 (activity planning)
3. Parents: 0-2 (engagement)
4. Students: 0-3 (safety + English)
5. Demeanor: 0-1 (punctuality + dress)

**Bonus calculation:**
```
KPI Score /10 × 50,000 = Bonus VND (0-500k max)
```

**Example:**
- KPI 9/10 → 9 × 50,000 = 450,000 VND bonus

---

### **3 Payroll Formulas**

| Position | Formula |
|---|---|
| **Office/Teacher** | (Sessions × Rate) + Substitute + Other - Insurance - Tax |
| **Teaching Assistant** | (Sessions × 75k) + Substitute + Other + **KPI Bonus** - Insurance - Tax |

**Insurance (BHXH/BHYT/BHTN)** conditional on labor contract.
**Tax (TNCN)** progressive, 7 brackets.

---

### **Date Handling: parseIsoDateLocal Utility**

**Why:** JavaScript Date constructor treats YYYY-MM-DD as UTC (off by timezone), breaking lock lifecycle and attendance grids. Solution: parse ISO date as local midnight.

**Pattern:**
```typescript
// lib/utils/date-helpers.ts
export function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day); // Local midnight
}

// Usage in attendance-grid.tsx, attendance-actions.ts, etc.
const weekStart = parseIsoDateLocal(weekStartStr); // Safe
const iso = toISODate(new Date()); // YYYY-MM-DD as local date
```

**Key insight:** Always use `parseIsoDateLocal + getWeekStart` normalization across all 7 lock-lifecycle paths (save, lock, unlock, read) for consistency.

---

**Attendance (5):**
- Auto-fill "1" for scheduled slots
- Weekend reminder notification
- Auto-lock after 3 days
- Schedule conflict highlighting
- Diff preview before save

**Payroll (6):**
- Month-over-month comparison
- Salary change alert (>20%)
- Notes-to-checklist conversion
- Rate snapshot locking
- Double-confirm dialog
- 24-hour undo window

**KPI (3):**
- Pre-fill from previous month
- 25th-day reminder notification
- 6-month history chart

**System (4):**
- Audit log (who/what/when)
- Excel keyboard shortcuts
- Class schedule import
- Payroll Excel export

---

## Reference Links

**Brainstorm Reports:**
- V1 (Architecture): `plans/reports/brainstorm-260305-hrm-lightweight-rebuild.md`
- V2 (Attendance): `plans/reports/brainstorm-260305-v2-attendance-redesign.md`
- V3 (Payroll): `plans/reports/brainstorm-260305-v3-payroll-formulas-ui.md`
- V4 (Evaluation): `plans/reports/brainstorm-260306-employee-profile-evaluation-system.md`
- V5 (Class Schedule + VP Attendance): `plans/reports/brainstorm-260306-class-schedule-attendance-separation.md`
- Optimizations: `plans/reports/brainstorm-optimizations.md`

**Implementation Details:**
- **PDR:** `docs/project-overview-pdr.md` — Business requirements
- **Architecture:** `docs/system-architecture.md` — Database schema + RLS
- **Code Standards:** `docs/code-standards.md` — File structure + patterns
- **Roadmap:** `docs/project-roadmap.md` — 7 phases + timeline

**Real Data:**
- Excel Template: `plans/Bảng lương + đánh giá trợ giảng.xlsx`
- Contains: Real KPI scoring, payroll example, salary formulas

---

## Key Business Rules (Summary)

1. **Salary = Sessions × Rate** (not monthly fixed)
2. **Each class = 1 teacher + 1 assistant** (fixed per schedule)
3. **Attendance statuses:** 1|0|KP|0.5 (present, absent w/ permission, without permission, half-day)
4. **Insurance (BHXH/BHYT/BHTN)** = conditional on `has_labor_contract` flag
5. **KPI** = Teaching Assistants only, 5 criteria, bonus 0-500k/month
6. **Tax (TNCN)** = Progressive, 7 brackets per Vietnamese law
7. **Substitute teaching** = per-employee structured notes in employee_weekly_notes, accountant reviews as checklist
8. **Evaluation** = template-based: admin tạo tiêu chí, BM chấm điểm, ad-hoc notes bất kì lúc nào
9. **Employee profile** = extended with CCCD, DOB, bank account, qualifications, characteristics

---

## Tech Stack (Confirmed)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16 + App Router | Same as Luna CRM, SSR |
| UI | shadcn/ui + Tailwind v4 | Consistent with Luna CRM |
| Auth | Supabase Auth + RLS | Cloud, role-based, no self-hosting |
| Database | Supabase Cloud PostgreSQL | Free 500MB, no server overhead |
| Mobile | PWA (manifest.json + SW) | Zero cost, works on old phones |
| Email | Resend or Supabase Edge Functions | Payslip distribution |
| Hosting | Dell Ubuntu, port 3001 | Alongside Luna CRM (:3000) |

---

## Resource Comparison

| Metric | Frappe HRMS | Luna HRM |
|---|---|---|
| RAM | ~3 GB | ~300 MB |
| Docker containers | 4 | 1 |
| Database tables | 161 | 16 |
| Disk space | ~2 GB | ~200 MB |
| Supports both apps? | No (5.5GB total) | Yes (600MB total) |

---

## Implementation Phases (Preview)

| Phase | Duration | Deliverable |
|---|---|---|
| 1: DB + Auth | 2-3 days | Schema, RLS, login |
| 2: Class Schedules + Attendance | 2-3 days | Class schedule CRUD, weekly grid, VP attendance |
| 3: Payroll | 3-4 days | 3 formulas, payslips, email, undo |
| 4: KPI | 1-2 days | Evaluation form, bonus, chart |
| 5: Employee Portal | 1-2 days | PWA, self-view, mobile |
| 6: Profile & Evaluation | 2-3 days | Extended profiles, template evaluations, ad-hoc notes |
| 7: Polish | 1 day | i18n, shortcuts, Excel |
| **Total** | **~15 days** | **MVP ready** |

See `docs/project-roadmap.md` for full details.

---

## Next Steps

1. **Set up Supabase project** — Create free account, configure PostgreSQL ✅
2. **Create database schema** — Run migration scripts for 16 tables + RLS ✅
3. **Scaffold Next.js 16** — Initialize App Router, install dependencies ✅
4. **Implement Phase 1:** Auth + Branch/Employee CRUD ✅
5. **Implement Phase 2:** Attendance grid + auto-fill ✅
6. **Implement Phase 3:** Payroll calculation + email ✅
7. **Implement Phase 4:** KPI evaluation + bonus ✅
8. **Implement Phase 5:** Employee PWA portal ✅
9. **Implement Phase 6:** Profile & evaluation system (IN PROGRESS)
10. **Implement Phase 7:** Polish, i18n, Excel import/export
11. **Testing & deployment** — Unit tests, E2E, Dell server setup

---

*Codebase Summary v1.3 | 2026-03-07 | Phases 3-5 complete: Payroll, KPI, Employee Portal*
