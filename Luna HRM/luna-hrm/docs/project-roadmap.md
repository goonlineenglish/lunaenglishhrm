# Luna HRM Project Roadmap

**Current Status:** All 7 implementation phases complete + Post-MVP enhancements. MVP ready for production.

**Completion Date:** 2026-03-15

---

## Project Timeline & Milestones

### Planning Phase (Complete)

| Item | Status | Date | Notes |
|------|--------|------|-------|
| V1 Brainstorm: Architecture & Tech Stack | ✅ Done | 2026-03-05 | 7-table schema, tech selection |
| V2 Brainstorm: Attendance Redesign | ✅ Done | 2026-03-05 | English center-specific, class schedules |
| V3 Brainstorm: Payroll + KPI | ✅ Done | 2026-03-05 | 3 formulas, KPI system, 10-table schema |
| V4 Brainstorm: Profile + Evaluation | ✅ Done | 2026-03-06 | Extended profile, eval templates, 15 tables |
| V5 Brainstorm: Class Schedules + VP Attendance | ✅ Done | 2026-03-06 | Separation strategy, 17 tables final |
| Optimizations Design | ✅ Done | 2026-03-06 | 18 MVP optimizations selected |
| UI Mockups (13 screens) | ✅ Done | 2026-03-06 | Desktop + mobile layouts |
| Implementation Plan (7 phases) | ✅ Done | 2026-03-06 | Codex-reviewed, approved |

### Implementation Phase (Complete)

| Phase | Component | Status | Start | End | Notes |
|-------|-----------|--------|-------|-----|-------|
| 1 | Database + Auth Scaffold | ✅ Done | 2026-03-06 | 2026-03-06 | 17 tables, 68 RLS policies, auth scaffold, Codex-reviewed |
| 2 | Class Schedules + Attendance | ✅ Done | 2026-03-06 | 2026-03-07 | CRUD, weekly grid, locking, cron, Codex-approved (6 rounds) |
| 3 | Payroll Calculation Engine | ✅ Done | 2026-03-07 | 2026-03-07 | 3 formulas, tax/insurance, preview, alerts, undo |
| 4 | KPI Evaluation System | ✅ Done | 2026-03-07 | 2026-03-07 | Part A+B, bonus calc, pre-fill, 6-month chart |
| 5 | Employee Self-Service Portal | ✅ Done | 2026-03-07 | 2026-03-07 | PWA, CSS-responsive, own data views |
| 6 | Employee Profile + Evaluation | ✅ Done | 2026-03-07 | 2026-03-07 | Profile CRUD, template-based eval, notes, history |
| 7 | Polish + Localization | ✅ Done | 2026-03-07 | 2026-03-07 | Audit logs, i18n, keyboard shortcuts, Excel I/O |
| **8** | **Email Notification + Confirmation** | 📋 **Planning** | TBD | TBD | **Codex-approved (5 rounds), admin/accountant send payslips, employee confirm/dispute, auto-confirm cron** |

### Production Review Phase (Complete)

| Item | Status | Date | Notes |
|------|--------|------|-------|
| xhigh Code Review (all 7 phases) | ✅ Done | 2026-03-07 | 3 parallel reviewers, 5 P0 + 12 P1 found |
| P0 Deploy Blocker Fixes | ✅ Done | 2026-03-07 | Index fix, timing-safe cron, payslip recalc, N+1 shared client |
| P1 Critical Fixes | ✅ Done | 2026-03-07 | BM branch validation, weekStart normalization, error propagation |
| Unit Tests (101 tests) | ✅ Pass | 2026-03-07 | tax-calculator, payroll-calc, kpi-calc, date-helpers |
| Build Verification | ✅ Pass | 2026-03-07 | 0 errors, 24 routes, ESLint clean |

### Employee Module Enhancements Phase (Complete)

| Item | Status | Date | Notes |
|------|--------|------|-------|
| Phase 1: Soft Delete + Status Filter | ✅ Done | 2026-03-15 | is_active toggle, status filter, class assignment warning |
| Phase 2: Bulk Import from Excel | ✅ Done | 2026-03-15 | Template download, batch import, auth creation, rollback on failure |
| All Features Complete | ✅ Done | 2026-03-15 | 3 new files, 5 edits, 130 unit tests passing |

### Multi-Role RBAC Phase (Complete)

| Item | Status | Date | Notes |
|------|--------|------|-------|
| Phase 1: Database Schema + RLS | ✅ Done | 2026-03-17 | `employees.roles TEXT[]`, migration 014, 70 RLS policies rewritten |
| Phase 2: Core Types + Auth Helpers | ✅ Done | 2026-03-17 | SessionUser.roles[], getCurrentUser() multi-role support, updateUserRoles() action |
| Phase 3: Server Actions (21 files) | ✅ Done | 2026-03-17 | All actions converted to roles.includes() pattern, hasAnyRole() helper |
| Phase 4: UI Components + Role Assignment | ✅ Done | 2026-03-17 | RoleAssignmentDialog for admin, role badges, multi-role nav logic |
| Phase 5: Gap Fixes + /my-kpi Portal | ✅ Done | 2026-03-17 | getMyKpiHistory() action, /my-kpi page, bottom-nav KPI tab |
| Phase 6: Tests + Seed Update | ✅ Done | 2026-03-17 | 136/136 tests passing, seed.sql roles[] backfilled, 25 routes, 0 errors |
| All Features Complete | ✅ Done | 2026-03-17 | 14 new/modified files, backward compat with legacy role, production-ready |

---

## Feature Completion Summary

### Core Features (100% Complete)

- [x] Class schedule management (CRUD, import .xlsx)
- [x] Weekly attendance grid (auto-fill, click-to-cycle, locking, notes)
- [x] Office staff daily attendance (VP separate from classes)
- [x] Payroll calculation (3 formulas, tax, insurance, adjustments)
- [x] KPI scoring system (5 criteria, bonus calculation)
- [x] Employee profiles (extended fields: CCCD, DOB, bank, qualifications)
- [x] Employee soft delete + status filter (is_active toggle, class assignment warning)
- [x] Bulk employee import from Excel (template, batch import, auth rollback)
- [x] Evaluation system (template-based, period-based, ad-hoc notes)
- [x] Employee portal (own attendance, payslips, profile)
- [x] Audit logging (all CRUD operations)
- [x] Excel import/export (class schedules, payroll)

### Phase 8 Features (📋 Planning)

- [ ] Email notification service (Resend API integration)
- [ ] Payslip email with confirmation button
- [ ] Employee confirmation/dispute workflow (max 2 disputes)
- [ ] Auto-confirm after 3 days no action
- [ ] Reminder email on day 2
- [ ] Payroll period finalization (all confirmed → finalized state)
- [ ] Admin/accountant send payslips UI
- [ ] Employee payslip confirmation UI

### Optimization Features (100% Complete)

**Attendance:**
- [x] Auto-fill from class schedules
- [x] Weekend reminder (Fri cron)
- [x] Auto-lock on Sunday (cron)
- [x] Conflict highlight (substitute teacher)
- [x] Diff preview (before save)

**Payroll:**
- [x] Payslip preview with monthly comparison
- [x] >20% salary change alert
- [x] Checklist from employee notes
- [x] Snapshot rate per period
- [x] Double-confirm before lock
- [x] 24-hour undo capability

**KPI:**
- [x] Pre-fill scores from last month
- [x] Reminder cron on 25th
- [x] 6-month history chart

**System:**
- [x] Audit log for all operations
- [x] Keyboard shortcuts (arrow nav, Ctrl+S)
- [x] Excel import (class schedules)
- [x] Excel export (payroll)

### Role-Based Features

| Role | Features |
|------|----------|
| **Admin** | All CRUD, all branches, templates, periods, audits, recalc payroll, undo payroll |
| **Branch Manager** | Own branch: employees, attendance, office attendance, KPI, notes |
| **Accountant** | All view, payroll CRUD, send payslip email |
| **Employee** | Own attendance, own payslips, own profile (all read-only) |

---

## Database Schema (17 Tables)

All 17 tables implemented with RLS:

- `branches` — Organization structure
- `employees` — Staff profiles (extended)
- `class_schedules` — Class definitions
- `attendance` — Weekly class attendance
- `office_attendance` — Daily VP staff attendance
- `attendance_locks` — Lock tracking
- `employee_weekly_notes` — Payroll adjustments (typed)
- `kpi_evaluations` — KPI scores (Part A + Part B)
- `payroll_periods` — Payroll cycles
- `payslips` — Monthly salary records
- `salary_components` — Deduction definitions
- `evaluation_templates` — Eval criteria templates
- `evaluation_criteria` — Scoring criteria per template
- `evaluation_periods` — Eval windows (period + template)
- `employee_evaluations` — Eval submissions per employee
- `evaluation_scores` — Criterion scores with comments
- `employee_notes` — Ad-hoc notes (typed)

---

## Delivery Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| Phases Complete | 7/7 | ✅ 7/7 (100%) |
| Routes Implemented | 20+ | ✅ 25 routes |
| Custom Components | 30+ | ✅ ~40+ components |
| Database Tables | 17 | ✅ 17 tables |
| RLS Policies | 60+ | ✅ 70+ policies |
| Build Errors | 0 | ✅ 0 errors |
| Unit Tests | Core logic | ✅ 136 tests passing |
| MVP Optimizations | 18 | ✅ 18/18 (100%) |

---

## Production Readiness

### Testing
- [x] Unit tests for attendance lock, payroll calc, KPI bonus
- [x] Manual testing of all CRUD operations
- [x] RLS policy validation (role-based access)
- [x] Keyboard shortcut testing
- [x] Excel import/export validation

### Security
- [x] Auth identity mapping (employees.id = auth.users.id)
- [x] Role/branch in app_metadata (admin-only write)
- [x] RLS policies for all tables
- [x] Audit logging for compliance
- [x] No hardcoded secrets in code

### Performance
- [x] Indexed queries on week_start, employee_id, branch_id
- [x] Attendance grid upsert (single query, no loop)
- [x] Payroll calculation in-memory (no nested loops)
- [x] Service worker for static asset caching
- [x] PWA manifest for mobile app installation

### Documentation
- [x] Code standards (code-standards.md)
- [x] System architecture (system-architecture.md)
- [x] Codebase summary (codebase-summary.md)
- [x] Project overview & PDR (project-overview-pdr.md)
- [x] Deployment guide (deployment-guide.md)

---

## Known Limitations & Future Enhancements

### Current Scope (MVP)
- Internal payroll calculation (not certified for large enterprise)
- Single Vietnamese language
- Local time zone handling (Dell Ubuntu server)

### Future Enhancements (Out of Scope)
- [ ] Multi-language support (EN/VI)
- [ ] API tokens for external integrations
- [ ] Bulk email via Resend/SendGrid
- [ ] Advanced reporting (pivot tables, custom filters)
- [ ] Mobile app (beyond PWA)
- [ ] LDAP integration with domain auth
- [ ] Compliance audit trail (SOX-ready)
- [ ] Multi-tenant support

---

## Deployment Instructions

See `/docs/deployment-guide.md` for full setup and production checklist.

**Quick Start:**
```bash
# 1. Clone repo + install deps
git clone <repo> && cd luna-hrm && npm install

# 2. Set up Supabase Cloud + copy connection string to .env.local
# 3. Run migrations
npm run migrate

# 4. Seed test data (optional)
npm run seed

# 5. Start development server
npm run dev

# 6. Build & deploy to Dell Ubuntu (port 3001)
npm run build && npm start
```

---

## Team & Support

- **Project Lead:** Luna HRM
- **Stack:** Next.js 16 + Supabase + Tailwind v4 + shadcn/ui
- **Repository:** Private GitHub repo
- **Hosting:** Dell Ubuntu server, port 3001
- **Database:** Supabase Cloud PostgreSQL

---

## Changelog Summary

**All 7 phases completed by 2026-03-07:**

- Phase 1: Database + Auth scaffold (17 tables, RLS)
- Phase 2: Class schedules + Attendance (CRUD, locking, cron)
- Phase 3: Payroll engine (3 formulas, tax, insurance)
- Phase 4: KPI system (Part A+B, bonus)
- Phase 5: Employee portal (PWA, CSS-responsive)
- Phase 6: Profile + Evaluation (templates, ad-hoc notes)
- Phase 7: Polish (audit logs, i18n, Excel I/O)

**Next Phase:** Production deployment & monitoring

---

**Status:** MVP Complete + Post-MVP Enhancements + Multi-Role RBAC ✅
**Build:** 0 errors, 25 routes, ~140+ files
**Ready for Deployment:** Yes

## Dev/Test Quick Reference

| Config | Value |
|--------|-------|
| Dev server | `npm run dev` → `http://localhost:3000` |
| Production | `npm start -- -p 3001` |
| Supabase | `btwwqeemwedtbnskjcem.supabase.co` |
| Tests | `npm test` → 130+ tests, 6 suites |
| Seed data | `supabase/seed.sql` (21 employees, 10 classes) |
| Test password | `Luna@2026` (dev only) |

### Feature 3: Attendance Calendar Dates + Lock Override
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-14
- **Description:** UX enhancements to attendance grid with calendar dates in header (DD/MM under day names) and admin/BM ability to override auto-locked weeks.
- **Scope:**
  - Calendar dates in header (phase 1): DD/MM display under day names in both class and office attendance grids
  - Lock override system (phase 2): Admin + BM can override auto-locked weeks via `is_override=true` flag on `attendance_locks` table
  - Cross-month payroll guard: prevent editing attendance if payroll confirmed
  - Multi-row lock query: both manual and override rows coexist
- **Key Implementation Files:**
  - `supabase/migrations/008_attendance_lock_override.sql` (NEW)
  - `lib/actions/attendance-lock-actions.ts` (NEW — extracted: `unlockWeek`, `overrideAutoLock`, `removeOverride`)
  - `lib/actions/attendance-query-actions.ts` (EXTENDED — multi-row lock query, `lockType` + `hasOverride`)
  - `lib/actions/office-attendance-actions.ts` (EXTENDED — identical multi-row lock patterns)
  - `components/attendance/attendance-grid.tsx` (EXTENDED — calendar dates + unlock/override buttons)
  - `components/office-attendance/office-attendance-grid.tsx` (EXTENDED — same features)
  - `app/(dashboard)/attendance/page.tsx`, `office-attendance/page.tsx` (UPDATED — removed client-side auto-lock merge)
- **Review Status:**
  - Adversarial code review: 14 issues → all fixed
- **Tests:** 130+ unit tests passing
- **Build:** 24 routes, 0 errors, clean

### Feature 4: Payroll Per-Class Rows (Tính Lương Theo Từng Lớp)
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-14
- **Description:** Per-class payroll breakdown with class-specific rates and flat-table spreadsheet display. Each employee's payroll is broken down by class with individual session counts and rates.
- **Scope:**
  - Per-class rates in class schedules (teacher_rate, assistant_rate — nullable)
  - class_breakdown JSONB snapshot in payslips (schema migration)
  - Flat spreadsheet layout: N class rows per employee + KPI badge + summary row
  - Class-level session/rate edits with auto-recalculation
  - Excel export with per-class row expansion
- **Key Implementation Files:**
  - `supabase/migrations/009_payroll_class_breakdown.sql` (NEW)
  - `lib/types/database-payroll-types.ts` (EXTENDED — ClassBreakdownEntry)
  - `components/class-schedules/class-schedule-form.tsx` (EXTENDED — teacher_rate, assistant_rate fields)
  - `lib/actions/payroll-calculate-actions.ts` (EXTENDED — buildClassBreakdown helper)
  - `lib/services/payroll-prefill-service.ts` (EXTENDED — populate class_breakdown)
  - `components/payroll/payroll-class-row.tsx` (NEW — per-class row component)
  - `components/payroll/payroll-spreadsheet.tsx` (EXTENDED — class-grouped layout, KPI badge)
  - `components/payroll/payroll-spreadsheet-row.tsx` (EXTENDED — summary row with class toggle)
  - `lib/actions/payroll-payslip-actions.ts` (EXTENDED — class_breakdown validation + save)
  - `lib/utils/excel-payroll-export.ts` (EXTENDED — per-class row expansion)
- **Review Status:**
  - Plan review: 20 issues → all fixed
- **Tests:** 130 unit tests passing (payroll-calc suite extended)
- **Build:** 24 routes, 0 errors, clean

### Feature 5: Employee Module Enhancements
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-15
- **Description:** Employee soft delete + status filter + bulk Excel import with validation.
- **Scope:**
  - Soft delete: `is_active` toggle (inactive employees hidden from class assignments)
  - Status filter: show active/inactive employees in list
  - Bulk import: Excel template with columns (employee_code, full_name, position, rate_per_session, email, etc.)
  - Validation: duplicate email check, rate validation, required fields
  - Auth creation: auto-create Supabase auth user on import
  - Rollback on failure: transaction-style (all or nothing)
- **Key Implementation Files:**
  - `lib/actions/employee-import-actions.ts` (NEW)
  - `lib/actions/employee-query-actions.ts` (NEW)
  - `lib/actions/employee-mutation-actions.ts` (NEW)
  - `lib/utils/excel-employee-parser.ts` (NEW)
  - `components/employees/employee-import-dialog.tsx` (NEW)
  - Employee table enhanced with status filter + is_active toggle
- **Tests:** 130+ unit tests passing
- **Build:** 24 routes, 0 errors, clean

### Feature 6: RLS Recursion Fix + Security Hardening
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-15
- **Description:** Fix PostgreSQL RLS infinite recursion issue (error 42P17) when policies query the same table.
- **Scope:**
  - SECURITY DEFINER function: `get_current_user_is_active()` for safe user status checks
  - Admin client bypass: `createAdminClient()` using service_role key for recursive operations
  - Email normalization: lowercase at write time to match case-insensitive unique index
  - Audit logging: all mutations logged with actor + changes
- **Key Implementation Files:**
  - `supabase/migrations/011_fix_rls_recursion.sql` (NEW)
  - `lib/actions/branch-access-helpers.ts` (NEW — branch access validation)
  - Employee update actions: added RLS recursion guard
  - Service: enhanced error handling for RLS violations
- **Tests:** 130+ unit tests passing
- **Build:** 24 routes, 0 errors, clean

### Feature 1: Semi-Manual Payroll Mode
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-11
- **Description:** Converted payroll from full auto-calculation to semi-manual mode. System auto-fills attendance data + salary rates; accountant manually enters deductions (BHXH, BHYT, BHTN, TNCN) and totals via spreadsheet-like UI.
- **Scope:**
  - Auto-calculated fields (read-only): sessions_worked, rate_per_session, teaching_pay, substitute sessions/rate/pay
  - Pre-filled suggestions (editable): KPI bonus, allowances, deductions, penalties
  - Manual entry fields: BHXH, BHYT, BHTN, TNCN, gross_pay, net_pay
- **Key Implementation Files:**
  - `supabase/migrations/007_payslip_audit_logs.sql` (NEW)
  - `lib/services/payroll-audit-service.ts` (NEW)
  - `lib/services/payroll-prefill-service.ts` (NEW)
  - `components/payroll/payroll-spreadsheet.tsx` (NEW)
  - `lib/utils/excel-payroll-export.ts` (NEW/EXTENDED)
  - `lib/actions/payroll-payslip-actions.ts` (REFACTORED)
  - `lib/actions/payroll-calculate-actions.ts` (REFACTORED)
  - `components/payroll/payroll-attendance-summary.tsx` (ADDED)
- **Review Status:**
  - Codex review: 3 rounds → APPROVE
  - Code review: 15 issues → 12 fixed, 3 acknowledged
- **Tests:** 130+ unit tests passing
- **Build:** 24 routes, 0 errors, clean

### Feature 2: Attendance Summary by Class (Tổng Hợp Công Theo Lớp)
- **Status:** ✅ Complete
- **Completion Date:** 2026-03-11
- **Description:** Per-employee, per-class attendance aggregation showing weekly + monthly totals. Integrated across 3 views for comprehensive visibility.
- **Locations:** 3 integration points
  - `/attendance` → "Tổng hợp" tab (lazy-loaded for performance)
  - `/payroll/[period]` → Collapsible attendance summary panel
  - `/my-attendance` → Employee class breakdown card
- **Key Implementation Files:**
  - `lib/types/attendance-summary-types.ts` (NEW)
  - `lib/actions/attendance-summary-actions.ts` (NEW)
  - `components/attendance/attendance-summary-cards.tsx` (NEW, shared UI)
  - `components/payroll/payroll-attendance-summary.tsx` (EXTRACTED)
  - `lib/utils/date-helpers.ts` (EXTENDED — exported `getMonthBounds`)
- **Query Pattern:** Two-step (proven for large data)
  - Query class_schedules by branch/employee → get schedule IDs
  - Query attendance by schedule IDs → branch/employee scoped, aggregate in-memory
- **Review Status:**
  - Adversarial review: 11 issues → all fixed
- **Tests:** 130+ unit tests (attendance-summary suite added)
- **Build:** 24 routes, 0 errors, clean
