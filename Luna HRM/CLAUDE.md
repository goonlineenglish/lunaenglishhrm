# Luna HRM — CLAUDE.md

## Project Overview

**Luna HRM** — Lightweight HRM app for English Language Centers (Trung tâm tiếng Anh).
Built from scratch to replace Frappe HRMS (too heavy for Dell i3/8GB).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + App Router |
| UI | shadcn/ui + Tailwind v4 |
| Auth | Supabase Auth + RLS |
| Database | Supabase Cloud PostgreSQL (free 500MB) |
| Mobile | PWA |
| Email | Resend or Supabase Edge Functions |
| Hosting | Dell Ubuntu, port 3001 |

## Core Modules (5)

1. **Ca Làm Việc (Class Schedules)** — Manage class schedules: class_code, class_name, shift_time, days_of_week[], teacher_id, assistant_id. Auto-populates attendance grid.
2. **Chấm Công (Attendance)** — Weekly grid per class (auto-generated from class_schedules), auto-fill, BM edits exceptions only. VP staff has separate daily attendance (not class-based).
3. **Tính Lương (Payroll)** — 3 formulas: Office / Teacher / Teaching Assistant (with KPI)
4. **KPI Trợ Giảng** — 5 criteria, /10 scale, bonus = score × 50,000 VND
5. **Hồ Sơ & Đánh Giá NV (Employee Profile & Evaluation)** — Extended profile, template-based evaluations, ad-hoc notes

## Database: 17 Tables (16 data + 1 lock)

`branches`, `employees` (extended), `class_schedules`, `attendance`, `office_attendance`, `attendance_locks`, `employee_weekly_notes`, `kpi_evaluations`, `payroll_periods`, `payslips`, `salary_components`, `evaluation_templates`, `evaluation_criteria`, `evaluation_periods`, `employee_evaluations`, `evaluation_scores`, `employee_notes`

## Roles (4)

| Role | Access |
|------|--------|
| admin | All CRUD, all branches |
| branch_manager | Own branch: employees, attendance, KPI |
| accountant | All view, payroll CRUD + send email |
| employee | Own profile, attendance, payslip (read-only) |

## Business Rules

- **Salary = session-based** (sessions × rate/session), NOT monthly fixed
- **Each class = 1 foreign teacher + 1 Vietnamese teaching assistant**
- **Class schedules = fixed days/week** (e.g., Mon-Wed-Fri), 1 record = 1 class with class_code + days_of_week[]. Admin/BM sets up once, auto-populates attendance grid weekly.
- **Attendance statuses**: 1 (present), 0 (absent w/ permission), KP (no permission), 0.5 (half)
- **VP staff attendance**: Separate daily attendance (office_attendance table), not class-based. BM marks per day.
- **BHXH/BHYT/BHTN** = conditional on `has_labor_contract` flag
- **KPI** = only for teaching assistants, 5 criteria, max 10 pts, bonus = pts × 50k
- **KPI base_pass rule**: `base_pass=false` → bonus=0 only. Base salary (sessions × rate) still paid normally.
- **Evaluation system** = template-based: admin tạo bộ tiêu chí, BM chấm điểm từng criterion, ad-hoc notes bất kì lúc nào
- **bonus_impact** = INFORMATIONAL ONLY — không tự động feed vào payroll. Nếu BM muốn, tạo employee_weekly_note type 'bonus'.
- **Employee profile** = extended: CCCD, DOB, ngân hàng, bằng cấp, đặc tính, lịch sử đánh giá
- **Substitute teaching** = structured notes in employee_weekly_notes (per-employee, typed: substitute/bonus/penalty/extra_job/general) → accountant reviews as checklist
- **Payroll input single source**: Only `employee_weekly_notes` feeds payroll adjustments
- **sessions_worked/substitute_sessions** = NUMERIC (not INT) — supports 0.5 values

## Architecture Decisions (from Codex Review)

- **Auth identity**: `employees.id = auth.users.id` (same UUID, canonical link)
- **Role/branch in `app_metadata`** (NOT `user_metadata` — client-writable = security risk). Set via admin API only.
- **RLS helpers**: `get_user_role()` reads `auth.jwt()->'app_metadata'->>'role'`, `get_user_branch_id()` reads `branch_id`
- **Attendance branch scoping**: No `branch_id` on `attendance` table — RLS via JOIN on `class_schedules.branch_id`
- **Staged circular FK**: `branches` created WITHOUT `manager_id` FK, then ALTER TABLE after `employees` exists
- **attendance_locks table**: `(branch_id, week_start, locked_by, locked_at)` UNIQUE(branch_id, week_start)
- **CSS-responsive layout**: Tailwind `hidden md:flex` / `md:hidden` — no `useMediaQuery` (SSR hydration safe)
- **Service worker**: Static assets ONLY, explicitly excludes `/api/*` routes
- **Recalculation**: Auto-calculate preserves manual fields, resets calculated, post-confirm immutable
- **Payroll legal scope**: Internal approximation — not certified for multi-nationality/large enterprise

## 18 MVP Optimizations

- Attendance (5): Auto-fill, weekend reminder, auto-lock, conflict highlight, diff view
- Payroll (6): Preview comparison, >20% alert, checklist from notes, snapshot rate, double confirm, undo 24h
- KPI (3): Pre-fill from last month, reminder on 25th, 6-month history chart
- System (4): Audit log, keyboard shortcuts, Excel import, Excel export

## Project Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Brainstorm V1 | ✅ Done | Architecture, tech stack, 7-table schema |
| Brainstorm V2 | ✅ Done | Attendance redesign for English center, class schedules |
| Brainstorm V3 | ✅ Done | Payroll formulas, KPI system, 10-table schema |
| Brainstorm V4 | ✅ Done | Employee profile + evaluation system, 15-table schema |
| Brainstorm V5 | ✅ Done | Class schedule module + VP attendance separation |
| Optimizations | ✅ Done | 18 optimizations selected for MVP |
| UI Mockups | ✅ Done | Desktop + Mobile mockups (13 screens) |
| Implementation Plan | ✅ Done | 7-phase plan, 8 files, Codex-reviewed |
| Codex Plan Review | ✅ Approved | 10 issues found, all fixed, 2 rounds, APPROVE |
| Phase 1: DB + Auth | ✅ Done | 17-table schema, RLS w/ app_metadata, auth scaffold, Codex-reviewed |
| Phase 2: Class Schedules + Attendance | ✅ Done + Codex Approved | Class schedule CRUD, weekly grid, auto-fill, VP attendance, notes, cron. Codex review: 7 issues fixed (lock enforcement, ownership validation, upsert, timezone-safe parseIsoDateLocal, staff reassignment guard) — APPROVED after 6 rounds |
| Phase 3: Payroll | ✅ Done | 3 formulas, NUMERIC sessions, BHXH/BHYT/BHTN, TNCN 7-bracket tax, payslip preview, >20% alert, double-confirm, 24h undo |
| Phase 4: KPI | ✅ Done | Part A (4 pass/fail) + Part B (5 criteria /10), bonus = score × 50k, pre-fill, 6-month chart, 25th cron |
| Phase 5: Employee Portal | ✅ Done | PWA manifest + service worker (static-only), /my-attendance, /my-payslips, /my-profile, bottom-nav, CSS-responsive |
| Phase 6: Profile & Evaluation | ✅ Done | Extended profile (CCCD, DOB, bank, qualifications), template-based evaluation, ad-hoc notes |
| Phase 7: Polish | ✅ Done | Audit logs, Vietnamese i18n, keyboard shortcuts, Excel import/export |
| Production Review | ✅ Done | xhigh review all 7 phases: 5 P0 + 12 P1 found, all fixed. 101 unit tests pass. Build clean. |

## Key Files

```
plans/
├── 260306-luna-hrm-full-implementation/
│   ├── plan.md                                    # Master plan (7 phases, Codex-reviewed)
│   ├── phase-01-database-auth-scaffold.md         # 17 tables, RLS, auth, CRUD
│   ├── phase-02-class-schedules-attendance.md     # Class schedule + weekly attendance grid
│   ├── phase-03-payroll-calculation-engine.md      # 3 formulas, tax, insurance
│   ├── phase-04-kpi-evaluation-system.md           # KPI form, bonus, base_pass
│   ├── phase-05-employee-self-service-portal.md    # PWA, CSS-responsive
│   ├── phase-06-employee-profile-evaluation.md     # Profile, evaluations, notes
│   └── phase-07-polish-localization.md             # i18n, Excel, audit
├── reports/
│   ├── brainstorm-260305-hrm-lightweight-rebuild.md    # V1: Architecture
│   ├── brainstorm-260305-v2-attendance-redesign.md     # V2: Attendance + Class schedules
│   ├── brainstorm-260305-v3-payroll-formulas-ui.md     # V3: Payroll + KPI (FINAL)
│   ├── brainstorm-260306-employee-profile-evaluation-system.md  # V4: Profile + Evaluation
│   ├── brainstorm-260306-class-schedule-attendance-separation.md # V5: Class Schedule + VP attendance
│   ├── brainstorm-optimizations.md                     # 18 MVP optimizations
│   ├── codex-plan-review-260306-luna-hrm.md            # Codex Phase 1 plan review (APPROVED)
│   └── phase2-codex-review-260307.md                   # Codex Phase 2 impl review (APPROVED, 6 rounds)
├── .codex-review/
│   ├── rebuttal.md                                     # Phase 1 rebuttal
│   └── phase2-review.jsonl                             # Phase 2 raw review output
├── visuals/
│   ├── hrm-role-workflow-guide.md                      # Role workflow diagrams
│   └── hrm-ui-mockups-attendance-payroll.md            # UI mockups (13 screens)
├── Bảng lương + đánh giá trợ giảng.xlsx               # Real Excel payroll template
└── .codex-review/rebuttal.md                           # Codex Round 1 rebuttal
docs/
├── system-architecture.md
├── code-standards.md
├── design-guidelines.md
├── project-roadmap.md
├── codebase-summary.md
├── deployment-guide.md
└── project-overview-pdr.md
```

## Payroll Formulas (Quick Reference)

```
Office/Teacher: NET = (Sessions × Rate) + (Sub × SubRate) + Other - Deductions - BH - TNCN - Penalties
Teaching Asst:  NET = (Sessions × 75k) + (Sub × SubRate) + Other + (KPI×50k) - Deductions - BH - TNCN - Penalties

BHXH = GROSS × 8%  (if has_labor_contract)
BHYT = GROSS × 1.5% (if has_labor_contract)
BHTN = GROSS × 1%  (if has_labor_contract)
TNCN = progressive tax (7 brackets, after 11M personal deduction)
```

## Next Steps

1. ~~Phase 1: DB + Auth + Scaffold~~ ✅ Done
2. ~~Phase 2: Class Schedules + Attendance~~ ✅ Done + Codex Approved
3. ~~Phase 3: Payroll Calculation Engine~~ ✅ Done
4. ~~Phase 4: KPI Evaluation System~~ ✅ Done
5. ~~Phase 5: Employee Self-Service Portal~~ ✅ Done
6. ~~Phase 6: Employee Profile & Evaluation System~~ ✅ Done
7. ~~Phase 7: Polish (i18n, Excel import/export, audit logs)~~ ✅ Done
8. ~~Production Review (xhigh, all 7 phases)~~ ✅ All P0/P1 fixed

**MVP Complete + Production-Reviewed!** 24 routes, 0 build errors, 101 unit tests passing, all security/correctness issues resolved.

## Production Review Results (2026-03-07)

5 P0 deploy blockers fixed:
- P0-1: Index on non-existent `employees.status` → changed to `is_active`
- P0-2: Cron secret timing-attack → `timingSafeEqual` added
- P0-3: `/api/` not in PROTECTED_PATHS → assessed as non-issue (self-auth via cron secret)
- P0-4: Manual payslip edits didn't recalculate GROSS/NET/tax → full `calculatePayslip()` recalc
- P0-5: N+1 query (8 Supabase clients/employee) → shared client passed to all fetchers, throw on error

12 P1 critical fixes:
- BM branch validation on weekly notes (create, delete)
- weekStartStr normalization to Monday
- Silent `return 0` on DB errors → `throw new Error()`
- Evaluation of non-existent employee guard
- Timing-safe cron secret on all endpoints

---

## Development Server

| Config | Value |
|--------|-------|
| Dev command | `npm run dev` (default port 3000) |
| Production command | `npm start -- -p 3001` |
| Dev URL | `http://localhost:3000` |
| Production URL | `https://hrm.buttercup.edu.vn` (port 3001 behind Caddy) |
| Build | `npm run build` — 24 routes, 0 errors |
| Tests | `npm test` — 101 tests, 4 suites, all passing |

## Supabase Cloud

| Item | Value |
|------|-------|
| Project | `btwwqeemwedtbnskjcem` |
| URL | `https://btwwqeemwedtbnskjcem.supabase.co` |
| Region | Southeast Asia |
| Dashboard | `https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem` |

## Test Accounts (Seed Data)

Auth users phải tạo trước qua Supabase Admin API hoặc Dashboard (Authentication → Users → Add User), rồi chạy `supabase/seed.sql`.

Password mặc định cho dev/test: `Luna@2026` (hoặc tự đặt khi tạo auth user).

| Role | Email | Employee Code | Name | Branch | UUID |
|------|-------|--------------|------|--------|------|
| admin | `admin@luna-hrm.local` | ADMIN01 | Quản Trị Hệ Thống | CS Tân Mai | `10000000-0000-0000-0000-000000000001` |
| branch_manager | `bm.tanmai@luna-hrm.local` | BM-TM01 | Nguyễn Thị Minh | CS Tân Mai | `10000000-0000-0000-0000-000000000002` |
| branch_manager | `bm.quan1@luna-hrm.local` | BM-Q101 | Trần Văn Hùng | CS Quận 1 | `10000000-0000-0000-0000-000000000003` |
| accountant | `accountant@luna-hrm.local` | ACC01 | Phạm Thị Lan | CS Tân Mai | `10000000-0000-0000-0000-000000000004` |
| employee (teacher) | `john.smith@luna-hrm.local` | T-TM01 | John Smith | CS Tân Mai | `10000000-0000-0000-0000-000000000005` |
| employee (assistant) | `tran.linh@luna-hrm.local` | A-TM01 | Trần Thị Linh | CS Tân Mai | `10000000-0000-0000-0000-000000000011` |
| employee (office) | `le.ngan@luna-hrm.local` | O-TM01 | Lê Thị Ngân | CS Tân Mai | `10000000-0000-0000-0000-000000000019` |

**Tạo auth user cho test (chạy trong Supabase SQL Editor):**
```sql
-- Ví dụ tạo admin auth user với UUID cố định
SELECT supabase_auth.create_user(
  '10000000-0000-0000-0000-000000000001',
  'admin@luna-hrm.local',
  'Luna@2026',
  '{"role": "admin", "branch_id": "00000000-0000-0000-0000-000000000001"}'::jsonb
);
```

Hoặc tạo qua Supabase Dashboard → Authentication → Users → Add User, rồi set `app_metadata` qua SQL:
```sql
UPDATE auth.users SET raw_app_meta_data = '{"role":"admin","branch_id":"00000000-0000-0000-0000-000000000001"}' WHERE email = 'admin@luna-hrm.local';
```

### Seed Data Summary

| Data | Count | Notes |
|------|-------|-------|
| Branches | 2 | CS Tân Mai, CS Quận 1 |
| Employees | 21 | 1 admin, 2 BM, 1 accountant, 6 teachers, 8 assistants, 3 office |
| Class Schedules | 10 | 5 per branch |
| Salary Components | 7 | Allowances cho contracted staff |
| Eval Template | 1 | 5 criteria, max 50 points |
| Eval Period | 1 | Kì 1/2026 (Jan-Jun) |

## File Structure Quick Reference

```
luna-hrm/
├── app/(auth)/          # Login, reset-password
├── app/(dashboard)/     # 20 protected routes
├── app/api/cron/        # 2 cron endpoints (weekly-reminder, kpi-reminder)
├── components/          # ~35 UI components
├── lib/actions/         # 33 server action files
├── lib/services/        # 9 service files
├── lib/types/           # Type definitions
├── lib/utils/           # Helpers (date, format, excel, validation)
├── lib/constants/       # Messages, navigation, business rules
├── lib/hooks/           # Auth, permissions, keyboard, mobile
├── lib/db/              # Supabase client
├── supabase/migrations/ # 6 SQL files (000-005)
├── supabase/seed.sql    # 21 employees, 10 classes, sample data
├── tests/               # 4 test suites, 101 tests
├── public/              # PWA manifest + service worker
└── docs/                # 6 documentation files
```

---

*Created: 2026-03-06 | Updated: 2026-03-08 | Luna HRM Project*
