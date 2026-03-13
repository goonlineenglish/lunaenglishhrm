# Luna HRM — Project Roadmap

---

## Project Overview

**Luna HRM** is a lightweight, purpose-built human resources system for English Language Centers, designed to replace Frappe HRMS (~3GB RAM) with a focused app (~300MB RAM).

**Target completion:** ~15 implementation days (3-4 weeks at sustainable pace)

---

## Implementation Phases

### **Phase 1: Database & Authentication (2-3 days)**

**Priority:** P0 (Critical path)

**Goals:**
- Set up Supabase Cloud project
- Create 10 PostgreSQL tables with correct schema
- Implement Row-Level Security (RLS) policies
- Build login/logout system (email + password)
- Test authentication & authorization

**Deliverables:**
- ✅ Supabase project live
- ✅ All 16 tables created (`branches`, `employees`, `class_schedules`, `attendance`, `office_attendance`, `employee_weekly_notes`, `kpi_evaluations`, `payroll_periods`, `payslips`, `salary_components`, `evaluation_templates`, `evaluation_criteria`, `evaluation_periods`, `employee_evaluations`, `evaluation_scores`, `employee_notes`)
- ✅ RLS policies for all roles (admin, branch_manager, accountant, employee)
- ✅ Next.js 16 app scaffolded with App Router
- ✅ Login/logout pages
- ✅ User role context + navigation by role

**Success Criteria:**
- [ ] Can create branch (admin only)
- [ ] Can create employee (admin/BM)
- [ ] Login redirects to correct dashboard per role
- [ ] Branch manager can't see other branches (RLS enforced)
- [ ] Employee sees own profile only

**Risk:** Supabase RLS policy syntax errors → test thoroughly with multiple users

---

### **Phase 2: Class Schedules & Attendance Module (2-3 days)**

**Priority:** P0 (Core feature)

**Goals:**
- Build class schedule management CRUD (admin/BM setup classes, assign teachers/assistants)
- Build weekly attendance grid per class (auto-generated from class_schedules)
- Build office staff daily attendance (separate, simpler grid)
- Implement auto-fill from class_schedules
- Support status input (1, 0, KP, 0.5)
- Save/lock mechanism
- Weekly notes for substitute teaching

**Features (5 optimizations):**
- Auto-fill "1" for scheduled slots
- Weekend reminder notification (Saturday evening)
- Auto-lock after 3 days
- Conflict highlighting (teacher in 2 places)
- Diff preview before save

**Deliverables:**
- ✅ Class schedule CRUD page (create/edit/deactivate classes)
- ✅ Class schedule table (class_code, class_name, shift, days, teacher, assistant)
- ✅ Attendance grid page (branch view, class-based for GV/TG)
- ✅ Office attendance page (daily grid for VP staff)
- ✅ Week selector (◀ ▶ navigation)
- ✅ Auto-fill from class_schedules
- ✅ Cell editing (status input)
- ✅ Weekly notes textarea
- ✅ Save/lock buttons
- ✅ Conflict detection SQL
- ✅ Diff preview modal
- ✅ Cron job for weekend reminder

**Success Criteria:**
- [x] Class schedule CRUD works (create, edit, deactivate)
- [x] Attendance grid auto-generated from class_schedules
- [x] Office attendance grid renders VP staff per day
- [x] Grid renders 20+ rows correctly
- [x] Auto-fill works (defaults to "1" for scheduled)
- [x] Cell edits save immediately
- [x] Older weeks lock automatically
- [x] Conflict highlighted in red
- [x] Notification sent Saturday evening
- [x] Load time <2s for 100 rows

**Codex Review:** 7 issues raised, 6 rebuttal rounds, APPROVED.
- ✅ parseIsoDateLocal + getWeekStart normalization across all lock paths
- ✅ Auto-fill "1" persisted before lockWeek()
- ✅ Position validation + schedule ownership checks
- ✅ Admin branch selector gated before data load
- ✅ Local date parsing (YYYY-MM-DD)
- ✅ Staff reassignment blocked when attendance exists
- ✅ Upsert pattern for batch operations

**Risk:** Complex SQL for conflict detection → unit test thoroughly (MITIGATED)

---

### **Phase 3: Payroll Calculation Engine (3-4 days)**

**Priority:** P0 (Core business logic)

**Goals:**
- Implement 3 salary formulas (office/teacher/assistant)
- Calculate insurance (BHXH/BHYT/BHTN) correctly
- Implement progressive tax (TNCN) with 7 brackets
- Auto-generate payslips from attendance
- Email payslips to employees

**Features (6 optimizations):**
- Month-over-month comparison view
- Salary change alert (>20% flag)
- Notes-to-checklist (BM notes → accountant checklist)
- Rate snapshot (lock at calc time)
- Double-confirm dialog
- 24-hour undo window

**Deliverables:**
- ✅ Payroll calculation service (`lib/services/payroll-calculation-service.ts`)
- ✅ Session counter logic (`lib/services/payroll-session-counter.ts`)
- ✅ Data fetcher (`lib/services/payroll-data-fetcher.ts`)
- ✅ Tax calculator with 7 brackets (`lib/utils/tax-calculator.ts`)
- ✅ Payroll period CRUD (create, select month)
- ✅ Auto-calculate button (triggers payslip generation for all employees)
- ✅ 3 tabs: Teaching Assistants | Teachers | Office
- ✅ Payroll data table with comparison
- ✅ Payslip detail panel (side slide-out)
- ✅ Email dispatch (Resend or Supabase Edge Function)
- ✅ Undo button (within 24h)
- ✅ Unit tests for all 3 formulas
- ✅ Unit tests for TNCN (all 7 brackets)

**Success Criteria:**
- [x] Payslip matches Excel template exactly (zero discrepancies)
- [x] BHXH = GROSS × 8% (if contract)
- [x] TNCN calculated correctly per 7 brackets
- [x] KPI bonus appears correctly (if position='assistant')
- [x] 50+ payslips calculated in <5s
- [x] Emails sent successfully
- [x] Unit tests: 100% of payroll logic covered
- [x] Undo works (restore previous payslip state)

**Status:** ✅ COMPLETE

---

### **Phase 4: KPI Evaluation System (1-2 days)**

**Priority:** P1 (High value, but less critical than payroll)

**Goals:**
- Build KPI evaluation form (5 criteria)
- Calculate KPI bonus (score × 50k)
- Integrate bonus into payslip
- Monthly reminder notification

**Features (3 optimizations):**
- Pre-fill from previous month
- 25th-day reminder notification
- 6-month history chart

**Deliverables:**
- ✅ KPI types (`lib/types/kpi.ts`)
- ✅ KPI calculation service (`lib/services/kpi-calculation-service.ts`)
- ✅ KPI query actions (`lib/actions/kpi-query-actions.ts`)
- ✅ KPI save actions (`lib/actions/kpi-save-actions.ts`)
- ✅ KPI evaluation form page
- ✅ KPI employee form page with Part A + Part B
- ✅ Pre-fill logic (copy last month's scores)
- ✅ Cron job for 25th reminder (`app/api/cron/kpi-reminder/route.ts`)
- ✅ Integration: Payslip reads KPI bonus
- ✅ History chart component (6-month trend)

**Success Criteria:**
- [x] Form calculates total score /10 correctly
- [x] Bonus = score × 50,000 (0-500k range)
- [x] Payslip shows KPI bonus in GROSS
- [x] Pre-fill copies previous month
- [x] Notification sent on 25th
- [x] Chart displays trend correctly

**Status:** ✅ COMPLETE

---

### **Phase 5: Employee Self-Service Portal (1-2 days)**

**Priority:** P1 (Nice to have, but adds mobile support)

**Goals:**
- Build PWA (Progressive Web App)
- Employee can view own attendance + payslip
- Mobile-friendly layout
- Offline support + sync

**Features:**
- ✅ PWA manifest.json + service worker (static-only cache)
- ✅ Attendance list (monthly + weekly view)
- ✅ Payslip list + detail panel
- ✅ Profile page (read-only)
- ✅ Dark mode support
- ✅ Offline caching
- ✅ Sync on reconnect

**Deliverables:**
- ✅ PWA manifest (`public/manifest.json`)
- ✅ Service worker (`public/sw.js`) — static assets only
- ✅ Employee portal actions (`lib/actions/employee-portal-actions.ts`)
- ✅ Bottom navigation component (`components/layout/bottom-nav.tsx`)
- ✅ Month-year picker component (`components/shared/month-year-picker.tsx`)
- ✅ Attendance calendar component (`components/employee-portal/employee-attendance-calendar.tsx`)
- ✅ Portal pages: /my-attendance, /my-payslips, /my-profile
- ✅ CSS-responsive layout (md:hidden / hidden md:flex)
- ✅ Mobile-optimized components

**Success Criteria:**
- [x] Installable on phone (from browser)
- [x] Works on 320px width (minimal horizontal scroll)
- [x] Loads offline (cached data)
- [x] Syncs when reconnected
- [x] Attendance/payslip viewable on mobile

**Status:** ✅ COMPLETE

---

### **Phase 6: Employee Profile & Evaluation System (2-3 days)**

**Priority:** P1 (Extended HR capabilities)

**Goals:**
- Extend `employees` table with personal info (CCCD, DOB, bank, qualifications, characteristics)
- Build template-based evaluation system (admin creates templates, BM scores employees)
- Implement ad-hoc notes for quick BM feedback anytime
- Custom evaluation periods (admin-defined)

**Deliverables:**
- ✅ Extended employee profile form (personal info, qualifications, characteristics)
- ✅ Evaluation template management (admin CRUD)
- ✅ Evaluation period management (admin creates/closes periods)
- ✅ BM evaluation form (select template → score each criterion)
- ✅ Ad-hoc employee notes (praise/warning/observation/general)
- ✅ Employee profile tabs (info | evaluations | notes)
- ✅ Employee self-view evaluations (read-only)
- ✅ RLS policies for 6 new tables

**Success Criteria:**
- [ ] Admin creates template with N criteria
- [ ] Admin creates/closes evaluation periods
- [ ] BM evaluates employee with structured scoring
- [ ] BM writes ad-hoc notes anytime
- [ ] Employee profile shows evaluation history + notes
- [ ] Employee views own evaluations (read-only)
- [ ] bonus_impact appears in payslip (if set)
- [ ] RLS enforced: BM sees own branch only

**Risk:** Template changes mid-period → snapshot template_id + criteria at evaluation time

---

### **Phase 7: Polish & Localization (1 day)**

**Priority:** P2 (Final refinement)

**Goals:**
- Complete Vietnamese UI labels
- Add Excel keyboard shortcuts
- Import class schedules from Excel
- Export payroll to Excel
- Code cleanup & lint

**Features (4 optimizations):**
- Keyboard shortcuts (Tab/Enter/1/0/KP)
- Excel class schedule import
- Payroll Excel export
- Audit log system

**Deliverables:**
- ✅ All UI labels in Vietnamese (`lib/constants/messages.ts`)
- ✅ Keyboard navigation handlers
- ✅ Excel import page (class_schedules)
- ✅ Excel export button (payroll table)
- ✅ Audit log table + queries
- ✅ Code linting + format
- ✅ TypeScript strict mode

**Success Criteria:**
- [ ] No English labels visible
- [ ] Tab/Enter work for quick data entry
- [ ] Import Excel works (20+ classes)
- [ ] Export matches current Excel format
- [ ] Audit log records all changes
- [ ] Build passes with no TypeScript errors
- [ ] Linting clean

---

## Success Metrics

### **Functional Metrics**
- ✅ All 3 payroll formulas unit-tested (0 errors vs Excel)
- ✅ 200+ employees processed in <5s
- ✅ 18/18 MVP optimizations implemented
- ✅ 100% of RLS policies tested (no data leaks)
- ✅ Employee portal usable on mobile (320px+)

### **Performance Metrics**
- ✅ Attendance grid loads in <2s (100 rows)
- ✅ Payroll calculation <5s (200 employees)
- ✅ App runs on Dell i3/8GB + Luna CRM (total <600MB)
- ✅ PWA works offline, syncs on reconnect

### **Quality Metrics**
- ✅ Unit test coverage >90% (payroll logic)
- ✅ TypeScript strict mode, 0 errors
- ✅ Accessibility: WCAG AA (color contrast, keyboard nav)
- ✅ No data loss (Supabase backup)

---

## Risk Assessment

| Risk | Severity | Mitigation | Phase |
|---|---|---|---|
| Payroll formula errors | **High** | Unit test every bracket, cross-check Excel | 3 |
| RLS data leak | **High** | Comprehensive RLS test suite, audit logs | 1 |
| Attendance grid performance | **Medium** | Index on (branch_id, date), pagination | 2 |
| Supabase free tier limits | **Low** | 200 emp × 12 mo ≈ 50MB; safe for 5+ years | 1 |
| Class schedule mid-month changes | **Medium** | Allow edits, cascade to attendance | 2 |
| GV without labor contract | **Low** | Flag `has_labor_contract` in employees | 3 |

---

## Timeline & Milestones

| Milestone | Target | Status |
|---|---|---|
| Phase 1 complete | Day 3 | ✅ Done |
| Phase 2 complete | Day 6 | ✅ Done |
| Phase 3 complete | Day 10 | ✅ Done |
| Phase 4 complete | Day 11 | ✅ Done |
| Phase 5 complete | Day 12 | ✅ Done |
| Phase 6 complete | Day 14 | ⬜ Pending |
| Phase 7 complete | Day 15 | ⬜ Pending |
| **MVP Ready** | **Day 15** | ⬜ Pending |

---

## Dependencies & Prerequisites

**Must complete before starting:**
- [ ] Supabase account (free tier sufficient)
- [ ] Node.js 18+ installed
- [ ] Next.js 16 knowledge
- [ ] SQL/PostgreSQL basics
- [ ] Payroll formulas verified in Excel

**External dependencies:**
- Supabase Cloud (stable, no known issues)
- Resend or Supabase Edge Functions (email)
- Dell Ubuntu server (for production deployment)

---

## Post-MVP Enhancements (Future)

**Not in MVP scope:**
- Leave request/approval workflow
- Advance/loan management
- Time tracking / biometric
- Custom reporting engine
- Mobile app (PWA is enough for now)
- Multi-language UI (Vietnamese only)
- Third-party integrations (Slack, Google Calendar)

---

## Success Definition (Definition of Done)

**The project is complete when:**

1. **All 16 tables** created in Supabase with RLS
2. **All 3 payroll formulas** unit-tested (0 errors vs Excel)
3. **Attendance grid** works (auto-fill, lock, notes, conflict detection)
4. **Payroll calculation** completed for 200 employees in <5s
5. **KPI evaluation** form saves correctly, bonus appears in payslip
6. **Employee PWA** works on mobile (offline support)
7. **Profile & Evaluation** — extended profiles, template evaluations, ad-hoc notes
8. **Audit log** records all changes
9. **Email dispatch** sends 50+ payslips successfully
10. **24-hour undo** works for payroll errors
11. **All optimizations** (18 total) implemented and tested
12. **Vietnamese UI** — all labels localized
13. **Tests pass** — Unit + integration, >90% coverage
14. **Build clean** — TypeScript strict mode, no errors
15. **Performance** — Attendance <2s, Payroll <5s, App <400MB RAM

---

*Roadmap v1.3 | 2026-03-07 | Phases 3-5 complete: Payroll engine, KPI system, Employee PWA portal*
