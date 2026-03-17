# Luna HRM System Architecture

**Project:** Luna HRM (Lightweight HRM for English Language Centers)
**Status:** Complete (All 7 phases + Post-MVP Enhancements + Multi-Role RBAC)
**Last Updated:** 2026-03-17
**Migrations:** 12 files (000-011), Multi-Role RBAC (011), Phase 6 scheduled (012_employee_payslip_confirmation)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (Browser/PWA)             │
│  Next.js 16 App Router + React + Tailwind v4 + shadcn/ui   │
│  (Bottom nav for mobile, CSS-responsive with hidden md:flex)│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 16 Backend                        │
│  ├─ /api/* routes (Server Actions + API routes)             │
│  ├─ /app/* routes (Page components)                         │
│  └─ Middleware (Auth check via JWT)                         │
│  └─ Service Worker (Static assets caching)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ RLS Enforcement
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Cloud (PostgreSQL + Auth)             │
│  ├─ Auth (Email/password, JWT with app_metadata)           │
│  ├─ Database (18 tables: 17 data + 1 audit)                │
│  ├─ RLS Policies (70+ policies for role-based access)      │
│  └─ Edge Functions (Email sending, cron jobs)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization Architecture

### Auth Flow

1. **Login/Signup:** User enters email + password via `/auth/login` or `/auth/signup`
2. **JWT Creation:** Supabase issues JWT with:
   - `sub`: user UUID (= employees.id)
   - `app_metadata`: `{ roles: ["admin"|"branch_manager"|"accountant"|"employee"], branch_id: UUID }`
3. **Session Storage:** JWT stored in Supabase session (httpOnly cookie or localStorage per framework)
4. **Middleware Check:** Every request via `lib/middleware.ts` validates JWT
5. **Helper Functions:**
   - `get_user_roles()` — reads JWT app_metadata.roles[] (array)
   - `get_user_role()` — reads JWT app_metadata.roles[0] (first role, for backward compat)
   - `get_user_branch_id()` — reads JWT app_metadata.branch_id

### Authorization Model

| Role | CRUD Scope | Attendance | Payroll | Evaluation | Audit |
|------|-----------|-----------|---------|-----------|-------|
| **admin** | All tables, all branches | View all | Full (create, recalc, undo, send email) | Create templates/periods, view all | View all |
| **branch_manager** (+ accountant) | Own branch employees, schedules, attendance | Full own branch | View own branch + create (if also accountant) | Score own branch | View own branch |
| **accountant** (standalone) | Payroll only, all branches | View all | Full CRUD + send email, all branches | View all | View all |
| **employee** | Own data only | View own | View own payslips | N/A | View own |

### Multi-Role Patterns (2026-03-17)

**Database-level:**
- `employees.roles TEXT[]` column (e.g., `["admin"]` or `["branch_manager", "accountant"]`)
- JWT `app_metadata.roles[]` synced with DB on role updates
- All 70+ RLS policies use `user_has_role(role)` helper

**Application-level:**
- `SessionUser.roles: UserRole[]` in auth context
- `user.roles.includes('admin')` — check for single role
- `hasAnyRole(user, ['admin', 'accountant'])` — check for any role
- Admin can assign multiple roles to same employee (e.g., branch_manager + accountant)

**Hybrid Access Rules:**
- Accountant + branch_manager = branch-scoped payroll (not global)
- Admin alone = global access (all branches)

### Identity Mapping

```sql
-- Canonical link: employees.id = auth.users.id (both UUID)
-- Enforced by trigger: before insert on auth.users
--   → Create matching employee record with id = user_id

-- Roles stored in both places (sync on updateUserRoles)
-- employees.roles TEXT[] = array of role strings
-- app_metadata.roles[] = array in JWT

-- RLS leverages JWT to enforce policies
-- WHERE user_has_role('admin')
-- WHERE branch_id = get_user_branch_id()
```

---

## Database Architecture (18 Tables)

### Data Relationships

```
branches (root)
  ├─ employees (FK: branch_id, manager_id)
  │   ├─ class_schedules (teacher_id, assistant_id)
  │   │   ├─ attendance (class_schedule_id) → status 1/0/KP/0.5
  │   │   └─ attendance_locks (branch_id, week_start)
  │   ├─ office_attendance (employee_id)
  │   ├─ employee_weekly_notes (employee_id, typed)
  │   ├─ kpi_evaluations (employee_id, period)
  │   ├─ payslips (employee_id, payroll_period_id)
  │   ├─ employee_notes (employee_id, typed)
  │   └─ employee_evaluations (employee_id, period_id)
  │       └─ evaluation_scores (criterion_id)
  │
  ├─ payroll_periods (branch_id)
  │   └─ payslips (FK: employee_id, payroll_period_id)
  │
  ├─ evaluation_templates
  │   ├─ evaluation_criteria
  │   └─ evaluation_periods (template_id)
  │       └─ employee_evaluations
```

### Critical Tables

#### `employees` (Extended Profile, Soft Delete)
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY = auth.users.id,
  branch_id UUID NOT NULL REFERENCES branches(id),
  full_name TEXT NOT NULL,
  employee_code TEXT UNIQUE,
  position TEXT,
  rate_per_session NUMERIC(10,2),

  -- Multi-Role RBAC (2026-03-17)
  roles TEXT[] DEFAULT '{}',              -- e.g. ['admin'], ['branch_manager', 'accountant']

  -- Extended profile (Phase 6)
  cccd TEXT UNIQUE,                  -- ID card
  dob DATE,
  bank_account TEXT,
  qualifications TEXT,               -- JSON array of certs
  characteristics TEXT,              -- Free text skills

  -- Employment flags
  has_labor_contract BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,    -- Soft delete toggle

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `class_schedules`
```sql
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  class_code TEXT NOT NULL,
  class_name TEXT NOT NULL,
  shift_time TEXT,                   -- e.g. "9:00-10:30"
  days_of_week TEXT[] NOT NULL,      -- e.g. ['MON', 'WED', 'FRI']
  teacher_id UUID NOT NULL REFERENCES employees(id),
  assistant_id UUID NOT NULL REFERENCES employees(id),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `attendance`
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  class_schedule_id UUID NOT NULL REFERENCES class_schedules(id),
  week_start DATE NOT NULL,          -- ISO date (YYYY-MM-DD)
  status VARCHAR(3) CHECK (status IN ('1', '0', 'KP', '0.5')),
  is_locked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_schedule_id, week_start)
);
-- No branch_id on this table — RLS via JOIN on class_schedules.branch_id
```

#### `attendance_locks`
```sql
CREATE TABLE attendance_locks (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  week_start DATE NOT NULL,
  locked_by UUID NOT NULL REFERENCES employees(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(branch_id, week_start)
);
```

#### `employee_weekly_notes` (Payroll Adjustments)
```sql
CREATE TABLE employee_weekly_notes (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  week_start DATE NOT NULL,
  note_type VARCHAR(50),             -- 'substitute'|'bonus'|'penalty'|'extra_job'|'general'
  sessions_worked NUMERIC(5,2),      -- Numeric, supports 0.5
  substitute_sessions NUMERIC(5,2),
  other_adjustments NUMERIC(10,2),
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Single source of truth for payroll adjustments
```

#### `kpi_evaluations`
```sql
CREATE TABLE kpi_evaluations (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  evaluation_period TEXT NOT NULL,   -- e.g. '2026-03'

  -- Part A: 4 pass/fail criteria
  part_a_pass BOOLEAN,

  -- Part B: 5 criteria /10 scale
  part_b_score NUMERIC(3,1),         -- 0-10

  -- Derived bonus (bonus = score × 50,000 VND)
  -- Only if part_a_pass = true; else bonus = 0
  bonus_amount NUMERIC(10,2),

  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, evaluation_period)
);
-- Teaching assistants only
```

#### `payroll_periods`
```sql
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  is_recalculated BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `payslips`
```sql
CREATE TABLE payslips (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),

  -- Calculation breakdown
  sessions_worked NUMERIC(5,2),
  base_salary NUMERIC(10,2),
  substitute_salary NUMERIC(10,2),
  other_allowances NUMERIC(10,2),
  kpi_bonus NUMERIC(10,2),

  -- Deductions
  bhxh_amount NUMERIC(10,2),         -- 8% if labor_contract
  bhyt_amount NUMERIC(10,2),         -- 1.5% if labor_contract
  bhtn_amount NUMERIC(10,2),         -- 1% if labor_contract
  tax_amount NUMERIC(10,2),          -- TNCN progressive
  other_deductions NUMERIC(10,2),

  gross_salary NUMERIC(10,2),
  net_salary NUMERIC(10,2),

  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, payroll_period_id)
);
```

#### `evaluation_templates` & `evaluation_criteria` (Phase 6)
```sql
CREATE TABLE evaluation_templates (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluation_criteria (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES evaluation_templates(id),
  criterion_name TEXT NOT NULL,
  description TEXT,
  order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `employee_evaluations` & `evaluation_scores` (Phase 6)
```sql
CREATE TABLE employee_evaluations (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_id UUID NOT NULL REFERENCES evaluation_periods(id),
  evaluated_by UUID NOT NULL REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period_id)
);

CREATE TABLE evaluation_scores (
  id UUID PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES employee_evaluations(id),
  criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id),
  score NUMERIC(3,1),                -- 0-10
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `employee_notes` (Phase 6, Ad-hoc Notes)
```sql
CREATE TABLE employee_notes (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  note_type VARCHAR(50),             -- free text type
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Application Architecture

### Layers

#### 1. Presentation Layer (`/app/*`, `/components/*`)
- **Routing:** Next.js 16 App Router with route groups `(auth)`, `(dashboard)`
- **Pages:** Dashboard, class schedules, attendance, payroll, KPI, employees, evaluations
- **Components:** Modular, prefixed by feature (e.g., `components/attendance/`, `components/payroll/`)
- **State:** React hooks + server-side data via Server Actions
- **Mobile:** CSS-responsive with `hidden md:flex` (no useMediaQuery for SSR safety)

#### 2. API & Actions Layer (`/lib/actions/*`)
- **Server Actions:** Async functions for CRUD, calculations, validation
- **Barrel Exports:** Each feature has `index.ts` for clean imports
- **Error Handling:** try-catch with user-friendly messages
- **Data Validation:** Input validation before DB writes

**Key Action Files:**
- `class-schedule-actions.ts` — Create, update, delete, list, import .xlsx, reactivate
- `attendance-actions.ts` — Query grid, save grid, lock/unlock, normalize week_start
- `attendance-summary-actions.ts` — Per-class aggregation (Feature: 2026-03-11)
- `attendance-lock-actions.ts` — Lock override, multi-row lock (Feature: 2026-03-14)
- `payroll-period-actions.ts` — Calculate payroll, preview, confirm, undo, recalc
- `payroll-payslip-actions.ts` — Semi-manual payslip save + class_breakdown (Feature: 2026-03-11/14)
- `payroll-calculate-actions.ts` — Prefill logic + class breakdown init
- `kpi-save-actions.ts` — Submit KPI scores
- `kpi-query-actions.ts` — Query KPI history incl. /my-kpi (Multi-Role RBAC, 2026-03-17)
- `evaluation-save-actions.ts` — Create evaluations
- `employee-mutation-actions.ts` — Create/update/toggle active + update roles (Multi-Role RBAC)
- `employee-import-actions.ts` — Bulk import from Excel (Feature: 2026-03-15)
- `employee-profile-actions.ts` — Update profile fields
- `employee-notes-actions.ts` — CRUD notes
- `auth-actions.ts` — getCurrentUser() multi-role support, updateUserRoles() (Multi-Role RBAC, 2026-03-17)
- `audit-log-service.ts` — Fire-and-forget logging

#### 3. Service Layer (`/lib/services/*`)
- **Auth Service** — Supabase client, user role/branch extraction
- **Attendance Grid Service** — State normalization, click-to-cycle logic
- **Payroll Calculation Service** — 3 formulas (Office/Teacher/Assistant), tax, insurance
- **Audit Log Service** — Background logging with no await

#### 4. Data & Type Layer (`/lib/types/*`, `/lib/db/*`)
- **Types:** TypeScript interfaces for all entities (Employee, Attendance, Payroll, KPI, Evaluation)
- **Database Client:** Supabase JS client initialization
- **Middleware:** Auth token extraction and JWT validation

#### 5. Utilities (`/lib/utils/*`, `/lib/constants/*`)
- **Date Helpers:** `parseIsoDateLocal()`, `getWeekStart()`, `getMonthBounds()` (date range calculations)
- **Format Helpers:** Currency, percentage, date formatting
- **Excel Parsers:** `excel-schedule-parser.ts` (import), `excel-payroll-export.ts` (export)
- **Validation:** Input validation rules
- **Messages:** Vietnamese labels + UI strings

### Data Flow Patterns

#### Read Pattern (Query)
```
Component
  ↓ (useState + useEffect)
  ↓ calls Server Action
  ↓ queryEmployees(branch_id)
  ↓ Supabase query (RLS enforced)
  ↓ Returns data + error
  ↓ Component renders
```

#### Write Pattern (Mutation)
```
Component
  ↓ (form submission)
  ↓ calls Server Action
  ↓ saveAttendance(data)
  ↓ Validate input
  ↓ Upsert to Supabase
  ↓ Audit log (fire-and-forget)
  ↓ Returns success/error
  ↓ Revalidate cache + refetch
```

---

## Feature Architecture

### Class Schedules Module
```
Routes: /class-schedules
├─ ClassScheduleForm (create/edit)
├─ ClassScheduleTable (list)
└─ ExcelImportDialog
    └─ excel-schedule-parser.ts

Actions: class-schedule-actions.ts
├─ createClassSchedule(data)
├─ updateClassSchedule(id, data)
├─ deleteClassSchedule(id)
├─ listClassSchedulesByBranch(branch_id)
└─ importSchedulesFromExcel(file)

Database: class_schedules + employees (FK)
RLS: branch_id-scoped (BM/Admin only)
```

### Attendance Module
```
Routes: /attendance, /my-attendance
├─ AttendanceGrid (click-to-cycle)
├─ AttendanceNotesPanel
└─ AttendanceDiffViewer

Actions: attendance-actions.ts
├─ queryAttendanceGrid(class_id, week_start)
├─ saveAttendanceGrid(updates)
├─ lockWeek(branch_id, week_start)
└─ unlockWeek(branch_id, week_start)

Database: attendance + class_schedules + attendance_locks
RLS: class_schedule.branch_id-scoped (BM locks, all can view own)
Cron:
  - Friday 3pm: Weekend reminder
  - Sunday 11pm: Auto-lock week

### Attendance Summary by Class Module (Feature: 2026-03-11)
```
Routes: /attendance (tab), /payroll/[period] (collapsible), /my-attendance (card)
├─ AttendanceSummaryCards (shared UI component)
├─ PayrollAttendanceSummary (extracted, payroll page)
└─ Inline cards (my-attendance page)

Actions: attendance-summary-actions.ts
├─ getAttendanceSummary(branchId, weekStart, month, year) → branch-scoped
└─ getMyAttendanceSummary(month, year) → employee self-only

Query Pattern: Two-step (proven for large data)
  1. Query class_schedules by branch_id → get schedule IDs + metadata
  2. Query attendance by schedule IDs → filter at DB, aggregate in-memory
  Benefits: Avoids untested joins, enforces branch scoping, handles VP staff

Database: attendance + office_attendance + class_schedules (JOIN) + employees
RLS: Branch-scoped for admin view, self-scoped for employee portal
Data: Week totals + month totals per employee per class
```

### Payroll Module (Feature: Semi-Manual Mode, 2026-03-11)
```
Routes: /payroll
├─ PayrollPeriodForm (create period)
├─ PayrollSpreadsheet (semi-manual payslip entry)
├─ PayslipPreview (monthly comparison, >20% alert)
├─ PayslipExcelExport
└─ PayrollAttendanceSummary (collapsible panel)

Actions: payroll-period-actions.ts, payroll-payslip-actions.ts, payroll-calculate-actions.ts
├─ createPayrollPeriod(branch_id, start, end)
├─ initializePayslips(payroll_period_id) → auto-fill attendance + rates
├─ reinitializePayslips(payroll_period_id) → reset to initial state
├─ batchUpdatePayslips(updates) → manual entry of deductions/totals, sets is_reviewed=true
├─ confirmPayrollPeriod(period_id) → checks all is_reviewed=true
├─ calculatePayroll(payroll_period_id) → legacy, for reference
├─ previewPayroll(period_id)
├─ recalculatePayroll(period_id)
└─ undoPayroll(period_id, max 24h)

Services: payroll-calculation-service.ts, payroll-prefill-service.ts, payroll-audit-service.ts
├─ calculateOfficeSalary, calculateTeacherSalary, calculateAssistantSalary (reference only)
├─ prefillFromKpiAndNotes(payslip) → suggest KPI bonus, allowances, deductions
└─ logPayslipAudit(payslip_id, changes, actor) → fire-and-forget

Field Classification:
  - Auto-calculated (read-only): sessions_worked, rate_per_session, teaching_pay, substitute sessions/rate/pay
  - Pre-filled suggestions (editable): kpi_bonus, allowances, deductions, penalties, other_pay
  - Manual entry (starts at 0): bhxh, bhyt, bhtn, tncn, gross_salary, net_salary
  - System-managed: is_reviewed (boolean, gate for confirmPayrollPeriod)

Database: payslips + employees + kpi_evaluations + employee_weekly_notes
Audit: payslip_audit_logs (migration 007)
```

### KPI Module
```
Routes: /kpi
├─ KpiGrid (Part A pass/fail + Part B /10)
├─ KpiSubmissionForm
└─ KpiHistoryChart (6-month)

Actions: kpi-save-actions.ts
├─ submitKPI(employee_id, period, part_a_pass, part_b_score)
├─ getKPIHistory(employee_id, months=6)
└─ calculateBonus(part_a_pass, part_b_score) → score × 50,000

Database: kpi_evaluations
Rules:
  - Teaching assistants only
  - base_pass rule: if false → bonus = 0 only
  - Pre-fill from last month
Cron:
  - 25th each month: Reminder to submit
```

### Evaluation Module (Phase 6)
```
Routes: /evaluation-templates, /evaluation-periods, /employees/[id]/evaluate
├─ EvaluationTemplateForm
├─ EvaluationPeriodForm
├─ EvaluationForm (score /10 per criterion)
├─ EvaluationHistoryList
└─ EvaluationDetailView

Actions:
├─ evaluation-template-actions.ts (admin CRUD templates)
├─ evaluation-period-actions.ts (admin CRUD periods)
├─ evaluation-actions.ts (query evaluations)
└─ evaluation-save-actions.ts (create evaluations)

Database:
├─ evaluation_templates (admin creates)
├─ evaluation_criteria (per template)
├─ evaluation_periods (period + template + start/end)
├─ employee_evaluations (per employee + period)
└─ evaluation_scores (score /10 + comment per criterion)

RLS: Templates/periods admin-only, evaluations BM-scoped
```

### Employee Portal Module (Phase 5)
```
Routes: /my-attendance, /my-payslips, /my-profile, /my-kpi
├─ MyAttendanceGrid (read-only)
├─ MyPayslipHistory
├─ MyProfileView
└─ MyKpiHistoryChart (Multi-Role RBAC, 2026-03-17)

Actions: employee-portal-actions.ts, kpi-query-actions.ts
├─ queryMyAttendance(employee_id)
├─ queryMyPayslips(employee_id)
├─ queryMyProfile(employee_id)
└─ getMyKpiHistory(employee_id, months=6) (Multi-Role RBAC)

Database: attendance, payslips, kpi_evaluations, employees (self-only)
RLS: WHERE employee_id = get_user_id()
Mobile: Bottom nav (5 tabs), CSS-responsive layout
PWA: Service worker (static assets only)
```

### Employee Profile Module (Phase 6 + Enhancements + Multi-Role RBAC)
```
Routes: /employees, /employees/[id]
├─ EmployeeForm (CRUD)
├─ EmployeeProfileInfo
├─ EmployeeProfileTabs (Basic, Extended, Evaluations, Notes)
├─ EmployeeNotesList
├─ EmployeeImportDialog (bulk import from Excel)
├─ EmployeeStatusFilter (active/inactive toggle)
└─ RoleAssignmentDialog (admin-only, toggle multiple roles) (Multi-Role RBAC, 2026-03-17)

Actions:
├─ employee-actions.ts (legacy CRUD)
├─ employee-query-actions.ts (employee queries with filtering)
├─ employee-mutation-actions.ts (create/update/toggle active + updateUserRoles) (Multi-Role RBAC)
├─ employee-import-actions.ts (bulk import from Excel)
├─ employee-profile-actions.ts (profile fields)
├─ employee-notes-actions.ts (CRUD notes)

Database: employees (extended fields + roles[]), employee_notes
Extended Fields: cccd, dob, bank_account, qualifications, characteristics, is_active, roles[]
Features:
  - Multi-role assignment (admin-only, UI dialog)
  - Soft delete (is_active toggle)
  - Status filter (active/inactive employees)
  - Bulk import from Excel with validation
  - Class assignment warning (cannot assign inactive employees to classes)
  - Search + filtering by status
  - Reactivate class schedules (toggle is_active)
RLS: BM can edit own branch + roles, admin can edit all + roles
```

### Audit Log Module (Phase 7)
```
Audit Table: audit_logs
├─ action (CREATE|UPDATE|DELETE|CALCULATE|CONFIRM|LOCK)
├─ table_name
├─ record_id
├─ actor_id (who made the change)
├─ changes (JSON diff)
└─ created_at

Service: audit-log-service.ts
└─ logAudit(action, table, id, actor, changes) — fire-and-forget

Integration: Called in all CRUD actions + payroll calculations
RLS: All employees can view own actions, admin/accountant view all
```

---

## Security Architecture

### Authentication
- **Method:** Supabase Auth (email/password)
- **Token:** JWT with app_metadata (role, branch_id)
- **Storage:** Supabase manages session (httpOnly cookie)
- **Refresh:** Automatic via Supabase JS client

### Authorization (RLS)
- **Policy Type:** Row-level security on all 17 tables
- **Enforcement:** 70+ RLS policies (updated for multi-role support)
- **Key Functions:**
  - `get_user_roles()` — from JWT app_metadata.roles[] (array)
  - `get_user_role()` — from JWT app_metadata.roles[0] (first role, backward compat)
  - `user_has_role(role)` — check if user roles[] includes given role
  - `get_user_branch_id()` — from JWT app_metadata.branch_id
  - `get_user_id()` — from JWT sub
  - `get_current_user_is_active()` — SECURITY DEFINER, RLS recursion safe

### Data Protection
- **Password Hashing:** Supabase handles (bcrypt)
- **HTTPS:** Required in production
- **Secrets:** Environment variables only (.env.local, never in code)
- **Audit Trail:** All changes logged with actor + timestamp

### Role-Based Access Control
- **Admin:** All CRUD, all branches, audits, recalc
- **Branch Manager:** Own branch only, can lock/unlock
- **Accountant:** Payroll CRUD, view all
- **Employee:** Own data only (read-only)

---

## Performance & Optimization

### Database Optimization
- **Indexes:** week_start, employee_id, branch_id, payroll_period_id
- **Unique Constraints:** Prevent duplicates (e.g., unique(employee_id, week_start) on attendance)
- **Upsert Pattern:** Single `INSERT ... ON CONFLICT ... DO UPDATE` replaces insert+loop

### Application Optimization
1. **Attendance Grid:** Upsert all changes in 1 query
2. **Payroll Calculation:** In-memory loop (no DB calls per session)
3. **Static Asset Caching:** Service worker (excludes /api/*)
4. **Code Splitting:** Component-level with Next.js dynamic imports
5. **Lazy Loading:** Images with Next/Image component

### Optimization Features (18 MVP)
1. **Auto-fill Attendance:** From class schedules (cron)
2. **Weekend Reminder:** Friday email reminder
3. **Auto-lock Week:** Sunday 11pm cron
4. **Conflict Highlight:** Substitute teacher flagged
5. **Diff Preview:** Before/after comparison
6. **Payroll Comparison:** Month-to-month comparison
7. **>20% Alert:** Alert if salary change exceeds 20%
8. **Checklist from Notes:** employee_weekly_notes becomes checklist
9. **Snapshot Rate:** Lock rate at payroll confirmation
10. **Double Confirm:** Confirm + re-enter to prevent accidental lock
11. **Undo 24h:** Revert payroll within 24 hours
12. **KPI Pre-fill:** From last month scores
13. **KPI Reminder:** 25th month cron
14. **6-Month Chart:** KPI history visualization
15. **Audit Log:** All CRUD + calculations logged
16. **Keyboard Shortcuts:** Arrow nav, Ctrl+S
17. **Excel Import:** Class schedules from .xlsx
18. **Excel Export:** Payroll to .xlsx

---

## Deployment Architecture

### Infrastructure
- **Frontend:** Next.js 16 on Dell Ubuntu server
- **Database:** Supabase Cloud PostgreSQL (500MB free)
- **Auth:** Supabase Auth
- **Storage:** Cloudinary or local file storage
- **Port:** 3001
- **Domain:** Configure via Caddy/Nginx reverse proxy

### CI/CD
- **VCS:** GitHub (private repo)
- **Builds:** npm run build (0 errors)
- **Tests:** npm test (unit tests passing)
- **Deployment:** SSH to Dell Ubuntu, pull + npm install + npm run build + npm start

### Environment Variables
```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional: Email service
RESEND_API_KEY=...
```

---

## Testing Strategy

### Unit Tests
- `tests/attendance-lock.test.ts` — Lock enforcement logic
- `tests/payroll-calculation.test.ts` — 3 formula calculations
- `tests/kpi-bonus.test.ts` — Bonus calculation with base_pass rule
- `tests/payroll-audit-service.test.ts` — Audit logging for payslip changes
- `tests/payroll-prefill-service.test.ts` — Prefill logic from KPI + notes
- `tests/attendance-summary.test.ts` — Per-class, per-employee aggregation
- **Total:** 130+ unit tests, 6 suites, all passing

### Integration Tests
- RLS policy validation (role-based access)
- CRUD operations (create, read, update, delete)
- Audit logging

### Manual Testing
- Attendance grid click-to-cycle
- Payroll preview + confirm + undo
- KPI submission + history
- Evaluation template creation + scoring
- Excel import/export
- Keyboard shortcuts

---

## Scalability Considerations

### Current Scope
- Single branch (multi-branch ready via branch_id scoping)
- ~100 employees per branch
- 1 year of payroll data
- Weekly attendance records

### Bottlenecks & Solutions
1. **Attendance Grid Load:** Week_start index + upsert pattern (solved)
2. **Payroll Calculation:** In-memory calculation for <100 employees (solved)
3. **RLS Policy Count:** 70 policies (manageable; consider policy consolidation for 100+ tables)
4. **File Storage:** Limit to profile images (use Cloudinary for scalability)

### Future Scaling
- Multi-tenant support (org_id column)
- Database connection pooling (PgBouncer)
- Read replicas for reporting
- Caching layer (Redis) for frequently accessed data

---

## Key Architectural Decisions

### 1. Database Identity
**Decision:** `employees.id = auth.users.id` (canonical link)
**Why:** Eliminates junction tables, simplifies RLS
**Trade-off:** Employee creation coupled to auth user

### 2. Role/Branch in JWT as arrays
**Decision:** Store `roles[]` in `app_metadata` (admin-only write), not `user_metadata`; maintain roles[] in employees table
**Why:** User-metadata is client-writable (security risk); database-backed roles for auditability
**Trade-off:** Role changes require JWT re-issue + DB sync

### 3. Multi-Role Support (2026-03-17)
**Decision:** `employees.roles TEXT[]` + JWT `app_metadata.roles[]`; RLS via `user_has_role(role)` helper
**Why:** Supports hybrid roles (e.g., branch_manager + accountant); backward compatible with single-role logic
**Trade-off:** All policies rewritten from `get_user_role() = 'X'` to `user_has_role('X')`

### 4. Attendance RLS via Class
**Decision:** No `branch_id` on `attendance` table; RLS via JOIN on `class_schedules.branch_id`
**Why:** Normalizes branch data, prevents redundancy
**Trade-off:** RLS policy complexity (one extra JOIN)

### 4. Employee Notes as Payroll Source
**Decision:** `employee_weekly_notes` is single source of truth for adjustments
**Why:** Audit trail, avoids scattered adjustments
**Trade-off:** Notes must be typed for accountant checklist

### 5. Audit Logs Fire-and-Forget
**Decision:** Async logging without await (background job)
**Why:** No latency impact on CRUD
**Trade-off:** Eventual consistency (logs may lag by seconds)

### 6. CSS-Responsive Layout
**Decision:** Use Tailwind `hidden md:flex` (no useMediaQuery hook)
**Why:** SSR-safe, no hydration mismatches
**Trade-off:** Limited dynamic breakpoint logic

### 7. Service Worker Static-Only
**Decision:** Cache static assets, exclude `/api/*` routes
**Why:** Avoid stale API responses
**Trade-off:** API always fresh (network must be available)

### 8. RLS Recursion Prevention
**Decision:** Use `SECURITY DEFINER` functions to bypass RLS within policy evaluation
**Why:** PostgreSQL evaluates ALL permissive WITH CHECK clauses on UPDATE, causing infinite recursion when policies query the same table
**Pattern:** Create helper function `get_current_user_is_active()` to check user status without triggering RLS
**Code-Level Bypass:** `createAdminClient()` for specific high-trust operations with app-level security checks
**Trade-off:** Requires careful auditing to prevent abuse

### 9. Email Case-Insensitive Uniqueness
**Decision:** Normalize all employee emails to lowercase at write time
**Why:** Supabase creates case-sensitive unique indexes by default
**Pattern:** Use `LOWER(email)` in unique constraint and normalize on INSERT/UPDATE
**Trade-off:** Business logic must remember to normalize reads as well

### 10. Admin Client Bypass for Recursive RLS
**Decision:** Provide `createAdminClient()` function that uses service_role key for specific recursive-RLS operations
**Why:** Some operations (e.g., user deactivation checks) require elevated permissions to avoid RLS loops
**Pattern:** Wrap in try-catch, validate all inputs, audit with `logAudit()`
**Trade-off:** Requires strict code review to prevent privilege escalation

---

## Monitoring & Logging

### Application Logging
- **Audit Table:** All CRUD + calculations
- **Error Handling:** Server action errors returned to client
- **Performance:** Watch for slow queries (attendance grid, payroll calc)

### Database Monitoring
- **Query Logs:** Monitor RLS policy evaluation time
- **Connection Pool:** Monitor for exhaustion
- **Storage:** Monitor 500MB limit (Supabase Cloud free tier)

### Production Alerts
- Payroll lock failures
- RLS policy violations (403 errors)
- Service worker cache misses
- Cron job failures (auto-fill, auto-lock, reminders)

---

## Email Service Architecture (Phase 6 — In Planning)

### Overview
**Purpose:** Send payslips to employees for confirmation, track employee acknowledgment
**Provider:** Resend (free 100/day, VietNamese support via Zalo)
**Workflow:** Period confirmed → send emails → employee confirms → period finalizes

### Email Service Components

```
┌─────────────────────────────────────────────────────┐
│            Email Service Layer                      │
│                                                     │
│  ├─ email-service.ts                               │
│  │   └─ sendEmail(to, subject, html)               │
│  │       └─ Uses Resend SDK + retry logic          │
│  │                                                 │
│  ├─ email-templates.ts                             │
│  │   ├─ buildPayslipEmailHtml(...)                 │
│  │   │   └─ Employee payslip + confirm button      │
│  │   └─ buildReminderEmailHtml(...)                │
│  │       └─ Payslip reminder (day 2)               │
│  │                                                 │
│  └─ Cron endpoints                                 │
│      ├─ auto-confirm-payslips                      │
│      │   └─ Auto-confirm after 3 days no action    │
│      └─ payslip-reminder                           │
│          └─ Remind on day 2 if no action           │
└─────────────────────────────────────────────────────┘
```

### Database Schema (Migration 012)

**Payslips Extended:**
- `employee_status` ENUM: pending → sent → confirmed | disputed (max 2)
- `employee_confirmed_at` TIMESTAMPTZ: when employee confirmed
- `employee_feedback` TEXT: dispute reason if disputed
- `confirmation_token` UUID: per-payslip verification code
- `dispute_count` INT: tracked at DB level (CHECK <= 2)
- `reminder_sent_at` TIMESTAMPTZ: idempotent reminder tracking

**Payroll Periods Extended:**
- `status` updated: 'draft' → 'confirmed' → 'pending_confirmation' → 'finalized'
- `confirmation_deadline` TIMESTAMPTZ: auto-confirm deadline (now() + 3 days)

### Workflow State Machine

```
Admin/Accountant:
  payroll_period: 'draft' → 'confirmed'
  sendPayslipEmails()
    ├─ Payslips without email → auto-confirm immediately
    ├─ For each valid email → send via Resend
    ├─ Update payslip.employee_status='sent', email_sent_at=NOW()
    └─ If all sent: period.status='pending_confirmation'

Employee:
  Receives email with /my-payslips/{id}?token={token}
  └─ Confirm OR Dispute (max 2 times)
     └─ If dispute → admin/accountant fixes and resends
     └─ If confirm → employee_status='confirmed'

Cron (daily 9:00 AM):
  auto-confirm-payslips:
    └─ Find payslips WHERE employee_status='sent'
       AND email_sent_at < NOW() - 3 days
       └─ Auto-confirm: employee_status='confirmed'

  payslip-reminder:
    └─ Find payslips WHERE employee_status='sent'
       AND reminder_sent_at IS NULL
       AND email_sent_at BETWEEN NOW()-48h AND NOW()-24h
       └─ Send reminder email, set reminder_sent_at=NOW()

Admin/Accountant:
  finalizePayrollPeriod()
    └─ Check all payslips.employee_status='confirmed'
    └─ If yes: period.status='finalized' (immutable)
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| Token leaked | UUID per payslip, owned by employee, single-use verification (with employee_status guard) |
| Employee tampering salary | All mutations via admin client (createAdminClient), RLS audit logging |
| Duplicate emails | Batch send with 100ms delay, track email_sent_at and reminder_sent_at |
| Email spam filter | Verify Resend domain (DKIM/SPF/DMARC) before production |
| Concurrent disputes | DB CHECK constraint (dispute_count <= 2) + app-level check |

---

## Documentation References

- **Code Standards:** `/docs/code-standards.md`
- **Project Overview & PDR:** `/docs/project-overview-pdr.md`
- **Codebase Summary:** `/docs/codebase-summary.md`
- **Deployment Guide:** `/docs/deployment-guide.md`
- **Project Roadmap:** `/docs/project-roadmap.md`

### 10. Admin Client Bypass for Recursive RLS
**Decision:** Provide `createAdminClient()` function that uses service_role key for specific recursive-RLS operations
**Why:** Some operations (e.g., user deactivation checks) require elevated permissions to avoid RLS loops
**Pattern:** Wrap in try-catch, validate all inputs, audit with `logAudit()`
**Trade-off:** Requires strict code review to prevent privilege escalation

### 11. `.maybeSingle()` Update-and-Verify Pattern
**Decision:** Use `.maybeSingle()` instead of `.single()` for update operations
**Why:** `.single()` throws if 0 rows found; `.maybeSingle()` allows explicit not-found handling
**Pattern:** Update → check if data exists → explicit error or success
**Code:** `const { data: updated, error } = await supabase.from('table').update(data).eq('id', id).maybeSingle();`
**Trade-off:** More verbose but safer for concurrent updates

---

**Last Updated:** 2026-03-17
**Maintained By:** Luna HRM Team
