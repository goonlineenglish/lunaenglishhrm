# Luna HRM — Lightweight Attendance & Payroll System

**Luna HRM** is a purpose-built human resources management application for **English Language Centers** (Trung tâm tiếng Anh). It replaces the resource-heavy Frappe HRMS with a slim, focused system designed specifically for managing attendance, payroll, and KPI evaluations in language education environments.

Built with **Next.js 16, Supabase, and shadcn/ui**, Luna HRM runs on modest hardware (~300MB RAM) alongside other applications.

---

## Why Luna HRM?

**Problem:** Frappe HRMS requires 3GB RAM + 4 Docker containers, but we need only 3 functions: attendance tracking, payroll calculation, and KPI evaluation.

**Solution:** Custom-built Next.js app with a PostgreSQL database optimized for the English language center workflow.

| Metric | Frappe HRMS | Luna HRM |
|--------|------------|----------|
| RAM usage | ~3 GB | ~300 MB |
| Tables | 161 doctypes | 16 tables |
| Containers | 4 | 1 |
| Setup time | 30+ min | 5 min |

---

## Quick Start

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 + App Router |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Auth** | Supabase Auth + Row-Level Security (RLS) |
| **Database** | Supabase Cloud PostgreSQL (500MB free) |
| **Mobile** | PWA (Progressive Web App) |
| **Email** | Resend or Supabase Edge Functions |
| **Hosting** | Dell Ubuntu, port 3001 |

### Prerequisites

- Node.js 18+ (npm or pnpm)
- Supabase account (Cloud free tier)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Installation

```bash
git clone <repo-url>
cd luna-hrm
npm install
npm run dev
```

Open http://localhost:3001 in your browser.

---

## Core Modules

### 1. Ca Làm Việc (Class Schedules)
Manage class schedules — the foundation that auto-generates the attendance grid.

- **Admin/BM** sets up classes with `class_code`, `class_name`, `shift_time`, `days_of_week[]`
- **Each class = 1 foreign teacher + 1 Vietnamese teaching assistant**
- Fixed schedule (e.g., Mon-Wed-Fri), 1 record per class
- Teacher/assistant assignment per class
- Auto-populates the weekly attendance grid — no manual row creation

### 2. Chấm Công (Attendance)
Track employee attendance using a **weekly grid per class** approach.

- **Branch Manager** marks attendance for all classes in one screen (~2 min/week)
- **Auto-fill:** Scheduled slots default to "1" (present). BM edits only exceptions
- **Statuses:** 1 (present) | 0 (absent w/ permission) | KP (no permission) | 0.5 (half-day)
- **Weekly notes:** Track substitute teaching and extra duties
- **Auto-lock:** Older weeks lock automatically after 3 days
- **Office staff:** Separate daily attendance (`office_attendance` table) — not class-based, simple per-day marking

### 3. Tính Lương (Payroll)
Calculate salaries based on **sessions taught**, not fixed monthly amounts.

- **3 salary formulas:** Office staff | Teachers | Teaching Assistants (with KPI)
- **Session-based:** Rate per session × sessions worked = base salary
- **Substitute pay:** Extra sessions marked in attendance notes
- **Benefits:** BHXH (8%) | BHYT (1.5%) | BHTN (1%) conditional on labor contract
- **Tax (TNCN):** Progressive Vietnamese income tax (7 brackets)

### 4. KPI Trợ Giảng (Teaching Assistant KPI)
Monthly performance evaluation with **5 criteria** and **KPI bonus**.

- **Base pass:** 4 mandatory criteria → 75,000 VND/session base salary
- **5 KPI categories:** TSI discipline | Funtime activities | Parent engagement | Student safety | Demeanor
- **Scoring:** Total /100 condensed to /10 scale for payroll
- **Bonus:** KPI score × 50,000 VND (max 500,000 VND/month)

### 5. Hồ Sơ & Đánh Giá NV (Employee Profile & Evaluation)
Extended employee profiles with **template-based evaluations** and **ad-hoc notes**.

- **Extended profile:** CCCD, DOB, bank account, qualifications, teaching license, characteristics
- **Evaluation templates:** Admin creates criteria sets per role (GV, TG, VP)
- **Evaluation periods:** Admin creates custom periods (kì 1, quý, năm...)
- **BM evaluates:** Structured scoring per criterion + overall notes
- **Ad-hoc notes:** BM writes quick notes (praise/warning/observation) anytime
- **History tracking:** Full evaluation + notes history in employee profile

---

## Key Features

### Attendance (5 optimizations)
- Auto-fill scheduled classes
- Weekend reminder notification
- Auto-lock after 3 days
- Schedule conflict highlighting
- Diff preview before save

### Payroll (6 optimizations)
- Month-over-month comparison
- Salary change alert (>20%)
- Notes-to-checklist conversion
- Snapshot rate locking
- Double-confirmation dialog
- 24-hour undo window

### KPI (3 optimizations)
- Pre-fill from previous month
- 25th-day reminder notification
- 6-month history chart

### System (4 optimizations)
- Audit log (who changed what, when)
- Excel-style keyboard shortcuts
- Class schedule import from Excel
- Payroll export to Excel

---

## Database Structure

**16 core tables:**
- `branches` — Multi-branch support
- `employees` — Extended staff profiles (CCCD, DOB, bank, qualifications, characteristics)
- `class_schedules` — Fixed weekly class times (1 record = 1 class, class_code + days_of_week[])
- `attendance` — Weekly grid marking (teachers + assistants, class-based)
- `office_attendance` — Daily attendance for office staff (not class-based)
- `employee_weekly_notes` — Per-employee structured notes (substitute/bonus/penalty/extra_job/general)
- `kpi_evaluations` — Monthly KPI scores (teaching assistants only)
- `payroll_periods` — Monthly payroll cycles
- `payslips` — Calculated salaries
- `salary_components` — Allowances/deductions
- `evaluation_templates` — Admin-created criteria sets per role
- `evaluation_criteria` — Individual criteria within templates
- `evaluation_periods` — Custom evaluation periods
- `employee_evaluations` — Structured evaluations (periodic + ad-hoc)
- `evaluation_scores` — Per-criterion scores
- `employee_notes` — Quick ad-hoc notes (praise/warning/observation)

See `docs/system-architecture.md` for detailed schema.

---

## Roles & Permissions

| Role | Access Level |
|------|---|
| **Admin** | All CRUD, all branches |
| **Branch Manager** | Own branch: employees, attendance, KPI evaluation |
| **Accountant** | View all, payroll CRUD + email dispatch |
| **Employee** | Own profile, attendance, payslip (read-only) |

Row-Level Security (RLS) enforced at the database level.

---

## Project Status

| Phase | Status | Target |
|-------|--------|--------|
| Brainstorm V1-V4 | ✅ Complete | Requirements, UI mockups, formulas, evaluation system |
| Phase 1: DB + Auth | ⬜ Pending | Supabase setup, schema, RLS policies |
| Phase 2: Class Schedules + Attendance | ⬜ Pending | Class schedule CRUD, weekly grid, auto-fill, VP attendance |
| Phase 3: Payroll | ⬜ Pending | 3 salary formulas, payslip generation |
| Phase 4: KPI | ⬜ Pending | Evaluation form, KPI bonus calculation |
| Phase 5: Employee Portal | ⬜ Pending | PWA mobile, self-view features |
| Phase 6: Profile & Evaluation | ⬜ Pending | Extended profiles, template evaluations, ad-hoc notes |
| Phase 7: Polish | ⬜ Pending | Vietnamese i18n, Excel import/export |

---

## Documentation

- **[Project Overview & PDR](./docs/project-overview-pdr.md)** — Business requirements, rules, success criteria
- **[System Architecture](./docs/system-architecture.md)** — Database design, RLS, data flow
- **[Code Standards](./docs/code-standards.md)** — File structure, naming, patterns
- **[Codebase Summary](./docs/codebase-summary.md)** — Pre-implementation status, schema reference
- **[Deployment Guide](./docs/deployment-guide.md)** — Server setup, environment config
- **[Design Guidelines](./docs/design-guidelines.md)** — UI/UX patterns, brand colors
- **[Project Roadmap](./docs/project-roadmap.md)** — Phases, milestones, risk assessment

---

## Key References

- **Brainstorm Reports:** `plans/reports/brainstorm-*.md`
- **UI Mockups:** `plans/visuals/hrm-ui-mockups-*.md`
- **Excel Template:** `plans/Bảng lương + đánh giá trợ giảng.xlsx` (real payroll data)

---

## Business Rules (Quick Reference)

- **Salary = Session-based** (not monthly fixed)
- **Each class = 1 teacher + 1 teaching assistant**
- **Class schedules = fixed days/week** (e.g., Mon-Wed-Fri), 1 record per class with class_code + days_of_week[]. Auto-populates attendance grid.
- **Attendance statuses:** 1 | 0 | KP | 0.5
- **Office staff attendance:** Separate daily attendance (not class-based), BM marks per day
- **BHXH/BHYT/BHTN** = conditional on `has_labor_contract` flag
- **KPI** = teaching assistants only, 5 criteria, max 500k/month bonus
- **Evaluation** = template-based: admin tạo tiêu chí, BM chấm điểm, ad-hoc notes bất kì lúc nào
- **Substitute teaching** = structured per-employee notes in employee_weekly_notes, accountant reviews as checklist

---

## Payroll Formulas

### Office / Teacher
```
NET = (Sessions × Rate) + (Substitute Sessions × Sub Rate)
      + Other Pay - BHXH - BHYT - BHTN - TNCN - Penalties
```

### Teaching Assistant
```
NET = (Sessions × 75,000) + (Substitute Sessions × Sub Rate)
      + Other Pay + (KPI Score × 50,000)
      - BHXH - BHYT - BHTN - TNCN - Penalties
```

**Insurance (if labor contract):**
- BHXH = GROSS × 8%
- BHYT = GROSS × 1.5%
- BHTN = GROSS × 1%

**Tax (TNCN):** Progressive 7 brackets after 11M personal deduction.

---

## Development Setup

### Clone & Install
```bash
git clone <repo>
cd luna-hrm
npm install
```

### Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Run
```bash
npm run dev        # Dev server on http://localhost:3001
npm run build      # Production build
npm test           # Unit tests
npm run lint       # Code linting
```

---

## Contributing

1. Read `docs/code-standards.md` for style guidelines
2. Follow Next.js App Router conventions
3. Keep components under 200 lines
4. Write unit tests for business logic (payroll calculations)
5. Create a feature branch and open a PR

---

## Support & Contact

For questions about requirements, see `docs/project-overview-pdr.md`.
For architecture details, see `docs/system-architecture.md`.

---

**Created:** 2026-03-06 | **Status:** Pre-Implementation (Brainstorm Complete)
