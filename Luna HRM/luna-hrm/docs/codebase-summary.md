# Luna HRM Codebase Summary

**Status:** All 7 phases complete. Production-ready MVP with 24 routes, ~100+ files.

## Project Structure

```
luna-hrm/
├── app/                                  # Next.js 16 App Router
│   ├── (auth)/                           # Auth routes (login, signup, verify)
│   ├── (dashboard)/                      # Protected dashboard routes
│   │   ├── class-schedules/             # Class schedule CRUD (admin/BM)
│   │   ├── attendance/                  # Weekly attendance grid + locking
│   │   ├── office-attendance/           # VP staff daily attendance
│   │   ├── employees/                   # Employee CRUD + detail view
│   │   │   ├── [id]/                   # Employee profile, evaluations, notes
│   │   │   └── [id]/evaluate/          # Create/view evaluations
│   │   ├── evaluation-templates/        # Admin: template + criteria CRUD
│   │   ├── evaluation-periods/          # Admin: period CRUD
│   │   ├── payroll/                    # Payroll periods, slips, preview, export
│   │   ├── kpi/                        # KPI grid, preview, submission
│   │   ├── my-attendance/              # Employee: own weekly attendance
│   │   ├── my-payslips/                # Employee: own payslip history
│   │   ├── my-profile/                 # Employee: profile read-only
│   │   └── layout.tsx                  # Dashboard layout + sidebar nav
│   ├── api/                             # Server actions, API routes
│   │   ├── auth/                       # Login, signup, logout, verify
│   │   ├── class-schedules/            # CRUD endpoints
│   │   ├── attendance/                 # Grid save, lock/unlock
│   │   ├── office-attendance/          # Daily grid save, lock/unlock
│   │   ├── employees/                  # CRUD endpoints
│   │   ├── payroll/                    # Calculation, recalc, undo
│   │   ├── kpi/                        # Submit, view
│   │   ├── evaluation/                 # Save evaluation, query history
│   │   ├── employee-notes/             # CRUD notes
│   │   ├── audit/                      # Audit log endpoints
│   │   └── cron/                       # Scheduled tasks (auto-fill, lock, reminders)
│   ├── globals.css                      # Tailwind base styles
│   └── layout.tsx                       # Root layout
├── components/
│   ├── layout/                          # Sidebar, nav, footer
│   ├── class-schedules/                 # Class schedule form, table, import dialog
│   ├── attendance/                      # Grid, notes panel, diff viewer, summary cards, calendar dates, lock override
│   ├── office-attendance/               # Daily grid, helpers
│   ├── employees/                       # Form, profile-info, profile-tabs, notes
│   ├── payroll/                         # Period form, slip preview, export button, attendance summary
│   │   ├── payroll-period-form.tsx
│   │   ├── payroll-spreadsheet.tsx      # Semi-manual payslip entry (Feature: Semi-Manual Payroll)
│   │   ├── payslip-preview.tsx
│   │   ├── payslip-excel-export.tsx
│   │   └── payroll-attendance-summary.tsx
│   ├── kpi/                             # Grid, submission form, history chart
│   ├── evaluations/                     # Template, period, score input, form, history
│   └── shared/                          # Common UI (dialogs, alerts, loaders)
├── lib/
│   ├── actions/                         # Server actions (CRUD, calculations)
│   │   ├── class-schedule-actions.ts   # CRUD + import class schedules
│   │   ├── attendance-actions.ts       # Query + save attendance
│   │   ├── attendance-summary-actions.ts # Attendance summary (Feature: Summary by Class)
│   │   ├── attendance-lock-actions.ts   # Lock override actions (Feature: Calendar + Lock Override)
│   │   ├── office-attendance-actions.ts # Query + save office attendance
│   │   ├── employee-actions.ts         # CRUD employees
│   │   ├── payroll-period-actions.ts   # Payroll calculations
│   │   ├── payroll-payslip-actions.ts  # Semi-manual payslip save + review (Feature: Semi-Manual Payroll)
│   │   ├── payroll-calculate-actions.ts # Prefill logic (Feature: Semi-Manual Payroll)
│   │   ├── kpi-save-actions.ts         # KPI submission
│   │   ├── evaluation-actions.ts       # Query evaluations
│   │   ├── evaluation-save-actions.ts  # Save evaluations
│   │   ├── evaluation-template-actions.ts # Admin CRUD templates
│   │   ├── evaluation-period-actions.ts  # Admin CRUD periods
│   │   ├── employee-notes-actions.ts    # CRUD notes
│   │   ├── employee-profile-actions.ts  # Profile updates
│   │   ├── employee-portal-actions.ts   # Employee own data queries
│   │   └── auth-actions.ts              # Auth operations
│   ├── types/
│   │   ├── employee.ts                 # Employee types
│   │   ├── attendance.ts               # Attendance types
│   │   ├── attendance-summary-types.ts # Attendance summary types (Feature: Summary by Class)
│   │   ├── payroll.ts                  # Payroll types
│   │   ├── kpi.ts                      # KPI types
│   │   ├── evaluation.ts               # Evaluation UI view types
│   │   └── index.ts                    # Barrel export
│   ├── services/
│   │   ├── auth-service.ts             # Supabase auth wrapper
│   │   ├── attendance-grid-service.ts  # Grid state management
│   │   ├── payroll-calculation-service.ts # 3 payroll formulas
│   │   ├── payroll-audit-service.ts    # Audit logs for manual payslip edits (Feature: Semi-Manual Payroll)
│   │   ├── payroll-prefill-service.ts  # Pre-fill suggestions from KPI/notes (Feature: Semi-Manual Payroll)
│   │   ├── audit-log-service.ts        # Fire-and-forget logging
│   │   └── file-service.ts             # Image/file upload
│   ├── hooks/
│   │   ├── use-auth.ts                 # Auth context hook
│   │   ├── use-permissions.ts          # Role/branch checks
│   │   ├── use-attendance-keyboard.ts  # Keyboard shortcuts
│   │   └── use-mobile.ts               # Mobile detection (SSR-safe)
│   ├── utils/
│   │   ├── excel-schedule-parser.ts    # .xlsx class schedule import
│   │   ├── excel-payroll-export.ts     # Export payroll to .xlsx
│   │   ├── date-helpers.ts             # parseIsoDateLocal, getWeekStart, getMonthBounds, isWeekLocked, getWeekDates
│   │   ├── format-helpers.ts           # Format numbers, dates
│   │   └── validation.ts               # Input validation
│   ├── constants/
│   │   ├── messages.ts                 # Vietnamese labels + UI strings
│   │   ├── navigation.ts               # Route definitions + sidebar menu
│   │   └── business-rules.ts           # KPI scale, tax brackets, etc.
│   ├── db/
│   │   └── supabase.ts                 # Supabase client initialization
│   └── middleware.ts                   # Request auth check (Next.js 16)
├── supabase/
│   ├── migrations/
│   │   ├── 000_reset_database.sql      # Full reset (dev only)
│   │   ├── 001_create_all_tables.sql   # 17 tables + RLS helpers
│   │   ├── 002_rls_policies.sql        # 68 RLS policies
│   │   ├── 003_indexes.sql             # Performance indexes
│   │   ├── 004_add_payslip_deductions_column.sql  # Payslip deductions
│   │   ├── 005_audit_logs.sql          # Audit log table + RLS
│   │   ├── 006_payslip_audit_logs.sql  # Audit logs for manual payslip edits (Feature: Semi-Manual Payroll, 2026-03-11)
│   │   └── 008_attendance_lock_override.sql  # Lock override + multi-row lock query (Feature: Calendar + Lock Override, 2026-03-14)
│   └── seed.sql                        # 21 employees, 10 classes, sample data
├── public/
│   ├── manifest.json                   # PWA manifest
│   └── sw.js                           # Service worker (static assets only)
├── tests/
│   ├── attendance-lock.test.ts         # Unit tests
│   ├── payroll-calculation.test.ts
│   ├── kpi-bonus.test.ts
│   └── attendance-summary.test.ts      # Attendance summary tests (Feature: 2026-03-11)
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── tailwind.config.ts                  # Tailwind v4 config (CSS-first)
├── next.config.js                      # Next.js config
└── README.md                           # Development guide
```

## Key Modules Breakdown

### 1. Class Schedules (Ca Làm Việc)
- **Routes:** `/class-schedules`
- **Components:** ClassScheduleForm, ClassScheduleTable, ExcelImportDialog
- **Actions:** class-schedule-actions.ts (create, update, delete, list, import .xlsx)
- **Database:** `class_schedules` table (branch_id, class_code, class_name, shift_time, days_of_week[], teacher_id, assistant_id)
- **Features:** CRUD, Excel import, auto-fill weekly attendance grid

### 2. Attendance (Chấm Công)
- **Routes:** `/attendance`, `/my-attendance`
- **Components:** AttendanceGrid, AttendanceNotesPanel, AttendanceDiffViewer, AttendanceSummaryCards
- **Actions:** attendance-actions.ts (query grid, save grid, lock/unlock), attendance-summary-actions.ts, attendance-lock-actions.ts
- **Database:** `attendance`, `attendance_locks` tables
- **Features:**
  - Weekly grid (1/0/KP/0.5 statuses)
  - Auto-fill from class schedules
  - Click-to-cycle status changes
  - Batch save with diff preview
  - Week locking (admin/BM only)
  - Employee weekly notes integration
  - Attendance summary by class (tabbed view) — Feature: 2026-03-11
  - Calendar dates in grid header (DD/MM) — Feature: 2026-03-14
  - Lock override for auto-locked weeks (admin/BM) — Feature: 2026-03-14

### 3. Office Attendance (VP Staff)
- **Routes:** `/office-attendance`
- **Components:** OfficeAttendanceGrid, OfficeAttendanceHelpers
- **Actions:** office-attendance-actions.ts
- **Database:** `office_attendance` table
- **Features:** Daily attendance for VP staff (Mon-Sat, not class-based)

### 4. Employees (Nhân Viên)
- **Routes:** `/employees`, `/employees/[id]`
- **Components:** EmployeeForm, EmployeeProfileInfo, EmployeeProfileTabs, EmployeeNotesList
- **Actions:** employee-actions.ts, employee-profile-actions.ts, employee-notes-actions.ts
- **Database:** `employees` table (extended fields: cccd, dob, bank_account, qualifications, characteristics)
- **Features:**
  - CRUD employees
  - Extended profile (CCCD, DOB, bank, qualifications)
  - Ad-hoc notes (typed: substitute/bonus/penalty/extra_job/general)
  - Evaluation history

### 5. Payroll (Tính Lương)
- **Routes:** `/payroll`
- **Components:** PayrollPeriodForm, PayslipPreview, PayslipExcelExport, PayrollSpreadsheet, PayrollAttendanceSummary
- **Actions:** payroll-period-actions.ts, payroll-payslip-actions.ts, payroll-calculate-actions.ts
- **Services:** payroll-calculation-service.ts, payroll-audit-service.ts, payroll-prefill-service.ts
- **Database:** `payroll_periods`, `payslips`, `salary_components` tables
- **Features:**
  - Semi-manual mode: auto-fill attendance + rates, manual entry for deductions (Feature: 2026-03-11)
  - Spreadsheet-like UI with column classification (read-only / pre-filled / manual entry)
  - Field types: auto-calculated (sessions, rates), pre-filled (KPI bonus, allowances), manual (BHXH, BHYT, BHTN, TNCN, gross, net)
  - 3 formulas: Office / Teacher / Teaching Assistant (with KPI bonus)
  - NUMERIC sessions (supports 0.5)
  - BHXH (8%), BHYT (1.5%), BHTN (1%) conditional on labor contract
  - TNCN progressive tax (7 brackets after 11M deduction)
  - Payslip preview with comparison
  - >20% salary change alert
  - Double-confirm before lock
  - 24h undo capability
  - Excel export
  - Audit logs for manual payslip edits (fire-and-forget)
  - Attendance summary by class (collapsible panel)

### 6. KPI Trợ Giảng
- **Routes:** `/kpi`
- **Components:** KpiGrid, KpiSubmissionForm, KpiHistoryChart
- **Actions:** kpi-save-actions.ts
- **Database:** `kpi_evaluations` table (Part A: 4 pass/fail + Part B: 5 criteria /10 points)
- **Features:**
  - 5 criteria, /10 scale
  - Bonus = score × 50,000 VND
  - base_pass rule: if false → bonus=0 only
  - Pre-fill from last month
  - Reminder cron on 25th
  - 6-month history chart
  - Teaching assistants only

### 7. Evaluation System (Đánh Giá NV)
- **Routes:** `/evaluation-templates`, `/evaluation-periods`, `/employees/[id]/evaluate`
- **Components:** EvaluationTemplateForm, EvaluationTemplateTable, EvaluationPeriodForm, EvaluationScoreInput, EvaluationForm, EvaluationHistoryList, EvaluationDetailView
- **Actions:** evaluation-template-actions.ts, evaluation-period-actions.ts, evaluation-actions.ts, evaluation-save-actions.ts
- **Database:** `evaluation_templates`, `evaluation_criteria`, `evaluation_periods`, `employee_evaluations`, `evaluation_scores` tables
- **Features:**
  - Template-based: admin creates criteria templates
  - Period-based: admin creates evaluation periods
  - BM scores each employee per criterion
  - Scoring: numeric /10 with comment field
  - History view: all evaluations per employee
  - Ad-hoc notes: timestamped notes at any time

### 8. Employee Portal (PWA)
- **Routes:** `/my-attendance`, `/my-payslips`, `/my-profile`
- **Components:** Mobile-responsive bottom nav
- **Features:**
  - Own attendance grid (read-only)
  - Own payslip history (read-only)
  - Own profile (read-only)
  - CSS-responsive layout (Tailwind hidden md:flex)
  - PWA manifest + service worker (static assets only)

## Database Schema (17 Tables)

| Table | Purpose | Key Columns |
|-------|---------|-----------|
| `branches` | Organization structure | id, name, manager_id (FK employees) |
| `employees` | Staff profiles | id (= auth.users.id), full_name, position, branch_id, rate_per_session, employee_code, cccd, dob, bank_account, qualifications, characteristics, has_labor_contract, is_active |
| `class_schedules` | Class definitions | id, branch_id, class_code, class_name, shift_time, days_of_week[], teacher_id, assistant_id, is_active |
| `attendance` | Weekly class attendance | id, class_schedule_id, week_start, status (1/0/KP/0.5), is_locked |
| `office_attendance` | Daily VP staff attendance | id, employee_id, attendance_date, status, is_locked |
| `attendance_locks` | Lock tracking | branch_id, week_start, locked_by, locked_at, UNIQUE(branch_id, week_start) |
| `employee_weekly_notes` | Adjustments for payroll | id, employee_id, week_start, note_type, amount, description |
| `kpi_evaluations` | KPI scores | id, employee_id, evaluation_period, part_a_pass, part_b_score, created_at |
| `payroll_periods` | Payroll cycles | id, branch_id, period_start, period_end, is_locked, is_recalculated |
| `payslips` | Monthly salary | id, employee_id, payroll_period_id, gross_salary, deductions, net_salary, created_at |
| `salary_components` | Deduction types | id, name, percentage_of_gross, is_conditional, condition_field |
| `evaluation_templates` | Evaluation criteria | id, branch_id, name, description, is_active |
| `evaluation_criteria` | Scoring criteria | id, template_id, criterion_name, description, order |
| `evaluation_periods` | Evaluation windows | id, branch_id, period_name, start_date, end_date, template_id, is_active |
| `employee_evaluations` | Evaluation submissions | id, employee_id, period_id, created_by, created_at |
| `evaluation_scores` | Criterion scores | id, evaluation_id, criterion_id, score, comment |
| `employee_notes` | Ad-hoc notes | id, employee_id, note_type, content, created_by, created_at |

## Authentication & Authorization

- **Auth:** Supabase Auth (email/password)
- **Identity:** `employees.id = auth.users.id` (canonical link via trigger)
- **Roles:** admin, branch_manager, accountant, employee (in `app_metadata`)
- **Branch:** stored in `app_metadata` as `branch_id`
- **RLS:** 68 policies via JWT → `get_user_role()`, `get_user_branch_id()`

## Key Architectural Patterns

1. **parseIsoDateLocal(iso: string): Date** — Safe YYYY-MM-DD parsing to local midnight (not UTC)
2. **getWeekStart()** — Normalized week start across all 7 lock-lifecycle paths
3. **Upsert Pattern** — Single upsert replaces insert+loop in attendance/office_attendance
4. **Fire-and-Forget Logging** — `logAudit()` in background (no await)
5. **CSS-Responsive Layout** — Tailwind `hidden md:flex` (no useMediaQuery, SSR-safe)
6. **Service Worker Static-Only** — Explicitly excludes `/api/*` routes

## Optimization Features (18 MVP)

**Attendance (5):** Auto-fill, weekend reminder, auto-lock, conflict highlight, diff view
**Payroll (6):** Preview comparison, >20% alert, checklist from notes, snapshot rate, double confirm, undo 24h
**KPI (3):** Pre-fill from last month, reminder on 25th, 6-month history chart
**System (4):** Audit log, keyboard shortcuts, Excel import, Excel export

## Deployment

- **Hosting:** Dell Ubuntu, port 3001
- **Database:** Supabase Cloud PostgreSQL (free 500MB)
- **Frontend:** Next.js 16 with App Router
- **PWA:** Service worker, manifest.json (static assets)
- **Email:** Resend or Supabase Edge Functions

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Build Status

- **Routes:** 24 total
- **Components:** ~39-45 custom components (69 .tsx files including variants)
- **Files:** ~115+ (code, types, actions, services, hooks, utils)
- **Tests:** 130 unit tests (5 suites: tax-calculator, payroll-calc, kpi-calc, date-helpers, attendance-summary) — all passing
- **Build:** Clean, 0 errors

## Dev/Test Setup

### Test Accounts (from seed.sql)
Auth users created via Supabase Dashboard, password: `Luna@2026`

| Role | Email | Branch |
|------|-------|--------|
| admin | `admin@luna-hrm.local` | CS Tân Mai |
| branch_manager | `bm.tanmai@luna-hrm.local` | CS Tân Mai |
| branch_manager | `bm.quan1@luna-hrm.local` | CS Quận 1 |
| accountant | `accountant@luna-hrm.local` | CS Tân Mai |
| teacher | `john.smith@luna-hrm.local` | CS Tân Mai |
| assistant | `tran.linh@luna-hrm.local` | CS Tân Mai |

### Supabase Cloud
- Project: `btwwqeemwedtbnskjcem`
- URL: `https://btwwqeemwedtbnskjcem.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem`

---

**Last Updated:** 2026-03-14 | All 7 phases complete + Semi-Manual Payroll + Attendance Summary by Class + Calendar Dates + Lock Override features
