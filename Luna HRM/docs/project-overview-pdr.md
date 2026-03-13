# Luna HRM — Product Development Requirements (PDR)

---

## Problem Statement

**Current situation:** Running Frappe HRMS (161 doctypes, 3GB RAM, 4 Docker containers) but using only 3 functions: attendance, payroll, KPI evaluation. Infrastructure is resource-constrained (Dell i3/8GB running Ubuntu alongside Luna CRM on port 3000).

**Goal:** Build a lightweight, purpose-built HRM system specifically for **English Language Centers** that runs in ~300MB RAM and supports multi-branch management.

---

## Target Users

**Primary Users:**
- **Branch Managers** (2-3 per branch) — Daily attendance marking, KPI evaluation
- **Accountants** (1-2 per org) — Monthly payroll calculation, salary confirmation, email dispatch
- **Admin** (1 person) — System setup, branch management, user roles
- **Employees** (50-200 total) — View own attendance, payslip, profile (PWA on mobile)

**Scale:** 2-5 branches, 50-200 employees, session-based work (not salaried).

---

## Core Requirements

### 1. Attendance Management (Chấm Công)
- Branch Manager marks attendance for all employees **per class**, not per individual
- **Weekly grid format:** Classes × Days of week, auto-fills "1" (present) for scheduled slots
- Branch Manager edits only **exceptions** (0, KP, 0.5) — dramatically speeds up data entry
- Support 4 statuses: 1 (present) | 0 (absent w/ permission) | KP (absent w/o permission) | 0.5 (half-day)
- Auto-lock attendance after 3 days to prevent retroactive changes
- Track substitute teaching, bonuses, penalties, extra jobs in **employee_weekly_notes** table (per-employee, structured) for accountant's checklist
- Employee self-view: See own attendance history (mobile-friendly)

### 2. Payroll Calculation (Tính Lương)
- **Session-based salary model** (not monthly fixed) — crucial for language centers
- Auto-calculate payslips from attendance + payroll period
- Support **3 distinct salary formulas:**
  1. **Office staff** (receptionist, security, admin) — simple sessions × rate
  2. **Teachers** (foreign + Vietnamese) — sessions × rate + substitute + optional insurance
  3. **Teaching Assistants** — sessions × 75k + substitute + KPI bonus + optional insurance
- Calculate insurance deductions (BHXH 8%, BHYT 1.5%, BHTN 1%) **conditional** on `has_labor_contract` flag
- Calculate progressive income tax (TNCN) with 7 brackets per Vietnamese law:
  - Base threshold: 11M personal deduction
  - Dependent deduction: 4.4M per dependent
  - Progressive rates: 5% → 10% → 15% → 20% → 25% → 30% → 35%
- Accountant can manually add allowances, deductions, penalties
- 24-hour undo window if salary is calculated in error
- Email payslips to employees after confirmation

### 3. KPI Evaluation for Teaching Assistants
- **Teaching Assistants only** — 5 evaluation criteria, total 100 points
- **Mandatory pass/fail criteria** (4 required):
  1. Complete all teaching assistant duties per job description
  2. Prepare classroom, maintain materials, housekeeping
  3. Punctual (arrive 15 min early)
  4. Daily student attendance + report absences
- **Scoring criteria** (5 categories, condensed to /10 for payroll):
  1. **TSI (0-1):** Discipline support, 80% student compliance
  2. **Funtime (0-3):** Activity planning, student understanding, goal achievement
  3. **Parents (0-2):** Friendly, shares student progress
  4. **Students (0-3):** 100% English communication, classroom discipline, child safety
  5. **Demeanor (0-1):** Max 2 absences, proper dress, no phone use
- **KPI bonus:** Total score /10 × 50,000 VND (range 0-500,000/month)
- Monthly evaluation form, pre-fill from previous month
- 6-month history chart for consistency tracking

### 4. Employee Profile & Evaluation System (Hồ Sơ & Đánh Giá NV)
- **Extended employee profile**: CCCD, DOB, bank account, qualifications, teaching license, characteristics, emergency contact, nationality
- **Template-based evaluation**: Admin creates `evaluation_templates` with N criteria per role (GV, TG, VP)
- **Custom evaluation periods**: Admin creates periods (kì 1, quý, năm...) with start/end dates + open/closed status
- **Structured scoring**: BM selects template → scores each criterion → overall notes → optional bonus_impact
- **Ad-hoc notes**: BM writes quick notes (praise/warning/observation/general) on any employee anytime
- **Evaluation types**: periodic (gắn kì) + ad_hoc (không gắn kì, bất kì lúc nào)
- **KPI TG preserved**: `kpi_evaluations` stays separate with existing payroll bonus logic
- Employee views own evaluations (read-only) in profile

---

## Business Rules (Critical)

1. **Salary = session-based**
   - Not monthly fixed salary. Rate per session × actual sessions worked = pay
   - Teaching Assistant: 75,000 VND/session (base pass)
   - Teachers: 450,000-500,000 VND/session (varies)
   - Office staff: 120,000-180,000 VND/session (varies)

2. **Class structure**
   - Each class has 1 foreign teacher + 1 Vietnamese teaching assistant
   - Fixed schedule (e.g., Mon-Wed-Fri, specific time slots)
   - Each class has a unique `class_code` per branch (e.g., BC04, IELTS-A1)
   - 1 record per class, `days_of_week` = INT[] array
   - Multiple classes per teacher/assistant possible
   - **Class schedule management is a standalone module** (admin/BM CRUD, auto-populates attendance grid)

3. **Attendance statuses**
   - `1` = Present (default for scheduled slots)
   - `0` = Absent w/ permission
   - `KP` = Absent w/o permission (breach of contract)
   - `0.5` = Half-day

4. **Two-track attendance**
   - **Teachers + Teaching Assistants:** Class-based weekly grid (from `attendance` table, linked to `class_schedules`)
   - **Office staff (VP):** Separate daily attendance grid (from `office_attendance` table, not class-based)

4. **Insurance & tax**
   - BHXH/BHYT/BHTN **only if `has_labor_contract = true`**
   - Foreign teachers often lack labor contracts (different visa status)
   - Teaching Assistants and office staff usually have contracts
   - Tax calculated after insurance deductions

5. **Substitute teaching**
   - Tracked in `employee_weekly_notes` with note_type='substitute' and amount in sessions
   - Accountant reviews as checklist, marks is_processed when applied to payroll
   - Paid at substitute_rate (often = normal rate, sometimes lower)

6. **KPI bonus applies only to Teaching Assistants**
   - Other roles (teachers, office) do not receive KPI bonus
   - Teaching Assistant must pass 4 mandatory criteria to earn base 75k/session
   - KPI bonus is additive (0-500k max/month)

7. **Evaluation system (all roles)**
   - Template-based: admin creates criteria sets per role, BM scores employees
   - Ad-hoc notes: BM writes quick notes (praise/warning/observation) anytime
   - Evaluation periods: admin-defined (kì 1, quý, năm...)
   - bonus_impact from evaluations → payslip (separate from KPI TG bonus)

8. **Extended employee profile**
   - Personal info: CCCD, DOB, address, emergency contact, bank account, nationality
   - Professional: qualifications, teaching license
   - HR notes: characteristics (free text, BM-maintained)

---

## Roles & Permissions (RLS)

| Permission | Admin | Branch Manager | Accountant | Employee |
|-----------|-------|-----------------|-----------|----------|
| **Employees** | All CRUD | Own branch only | View only | Own profile read |
| **Attendance** | All view | Mark + view own branch | All view | Own attendance read |
| **Payroll** | View only | View own branch | All CRUD + email | Own payslip read |
| **KPI Evaluation** | View only | Create own branch | View only | Own evaluation read |
| **Branches** | All CRUD | Own branch view | View only | None |
| **Users** | Manage roles | None | None | None |
| **Eval Templates** | CRUD | View only | View only | None |
| **Eval Periods** | CRUD | View only | View only | None |
| **Employee Evaluations** | All | CRUD own branch | View all | Own evaluations read |
| **Employee Notes** | All | CRUD own branch | View all | None |

**Enforcement:** Row-Level Security (RLS) policies on Supabase — data access enforced at database level, not application layer.

---

## Functional Requirements

### Attendance Module
- Weekly grid per branch (auto-generates from class_schedules)
- Auto-fill "1" for scheduled slots, BM edits exceptions only
- Highlight exceptions (red for KP, yellow for 0/0.5)
- Diff preview before save
- Weekly notes field for substitute teaching
- Auto-lock after 3 days
- Conflict detection (teacher assigned 2 classes same time)
- Weekend reminder (notification Saturday evening if not saved)

### Payroll Module
- Create payroll period (month/branch)
- Auto-calculate attendance → sessions → salary
- Display 3 tabs: Teaching Assistants | Teachers | Office
- Show month-over-month comparison, flag >20% changes
- Convert notes to checklist (accountant ticks when processed)
- Snapshot salary rates (lock at calculation time)
- Double-confirm before submission
- Send payslips via email
- 24-hour undo if error detected

### KPI Module
- Monthly evaluation form (5 criteria, /100 score)
- Pre-fill from previous month
- 6-month history chart
- 25th-day reminder notification
- Calculate KPI bonus automatically
- Integration with payslip (add bonus to GROSS)

### Profile & Evaluation Module
- Extended employee profile (CCCD, DOB, bank, qualifications, characteristics)
- Admin: create/edit/deactivate evaluation templates with N criteria
- Admin: create/close evaluation periods
- BM: evaluate employee using template (score each criterion + notes)
- BM: write ad-hoc notes (praise/warning/observation/general) anytime
- BM: ad-hoc full evaluation (no period attached)
- Employee: view own evaluations and scores (read-only)
- Accountant: view evaluations for bonus_impact reference
- Profile tabs: personal info | evaluation history | notes

### Employee Portal
- PWA (works offline, installable on phone)
- View own attendance (monthly + weekly)
- View own payslip (current month + history)
- View own profile
- Download payslip as PDF
- Dark mode support

### System Features
- Audit log (who changed what, when)
- Keyboard shortcuts (Tab/Enter/1/0/KP for fast data entry)
- Import class schedules from Excel
- Export payroll to Excel
- Multi-language UI (Vietnamese, English)

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| **RAM usage** | < 400MB (incl. Next.js runtime) |
| **Response time** | <2s for attendance grid (100 rows) |
| **Availability** | 99% uptime (Supabase Cloud) |
| **Database size** | 50MB/year for 200 employees × 12 months |
| **Users** | Support 200+ concurrent employees (Supabase free tier) |
| **Mobile responsiveness** | Works on 4-inch phones (minimal scrolling) |
| **Offline support** | PWA can work 2 hours offline, sync on reconnect |
| **Security** | RLS + HTTPS + rate limiting on API |
| **Backups** | Supabase auto-backups (daily), manual export monthly |

---

## Scope Boundaries

### **IN Scope (MVP)**
- Multi-branch management (separate branch_manager per branch, admin sees all)
- Attendance marking (class-based weekly grid)
- Payroll calculation (3 formulas: office/teacher/TA)
- KPI evaluation (TA only, 5 criteria)
- Employee self-service portal (PWA)
- Email payslip dispatch
- Extended employee profiles (CCCD, DOB, bank, qualifications, characteristics)
- Template-based evaluation system (admin creates templates, BM scores)
- Ad-hoc employee notes (BM writes anytime)
- Custom evaluation periods (admin-defined)
- All 18 MVP optimizations (auto-fill, alerts, conflict detection, undo, etc.)
- Vietnamese UI labels

### **OUT of Scope (Future)**
- Leave request/approval workflow (not in current brainstorm)
- Advance/loan management
- Expense reimbursement
- Recurring task scheduling (cron jobs)
- Mobile app (PWA is the mobile solution)
- Third-party integrations (Slack, Google Calendar)
- Multi-language switching (Vietnamese only for MVP)
- Time tracking / biometric integration
- Performance analytics dashboard
- Advanced reporting (custom SQL queries)

---

## Success Criteria

### Functional
- [ ] Admin creates 2+ branches and assigns branch managers
- [ ] Branch Manager marks attendance for 50+ employees in <5 minutes
- [ ] Attendance auto-fills scheduled classes, BM edits only exceptions
- [ ] Payroll correctly calculates salary for all 3 position types
- [ ] Teaching Assistant KPI bonus calculated correctly (score × 50k)
- [ ] BHXH/BHYT/BHTN deducted only if `has_labor_contract = true`
- [ ] TNCN (progressive tax) calculated per Vietnamese law (7 brackets)
- [ ] Accountant confirms payroll and sends 50+ payslips via email
- [ ] Employee views own attendance and payslip on mobile PWA
- [ ] 24-hour undo window for salary errors works
- [ ] All 18 optimizations (auto-fill, alerts, undo, etc.) functional

### Performance
- [ ] App runs on Dell i3/8GB + Luna CRM (total <600MB RAM)
- [ ] Attendance grid loads in <2 seconds (100 rows)
- [ ] Payroll calculation completes in <5 seconds (200 employees)
- [ ] Email dispatch (50 payslips) completes in <30 seconds

### Quality
- [ ] Zero salary calculation errors (audit against Excel template)
- [ ] Unit tests for all payroll formulas (BHXH, BHYT, BHTN, TNCN)
- [ ] RLS policies tested (verify branch_manager can't see other branches)
- [ ] No data loss on power failure (Supabase auto-backup)
- [ ] PWA works offline, syncs on reconnect

### Usability
- [ ] UI mockups match implementation
- [ ] Vietnamese labels used throughout
- [ ] Keyboard shortcuts functional (Tab, Enter, 1, 0, KP)
- [ ] No horizontal scrolling on mobile (width 320px+)
- [ ] Accessibility: WCAG AA compliant (color contrast, keyboard nav)

---

## Project Timeline

| Phase | Duration | Deliverable |
|-------|----------|---|
| 1: DB + Auth + Branch/Employee CRUD | 2-3 days | Schema, RLS, login |
| 2: Attendance module | 2-3 days | Weekly grid, auto-fill, notes |
| 3: Payroll engine | 3-4 days | 3 formulas, payslip generation, email |
| 4: KPI module | 1-2 days | Evaluation form, bonus calc |
| 5: Employee portal (PWA) | 1-2 days | Self-view attendance/payslip |
| 6: Profile & Evaluation | 2-3 days | Extended profiles, template evaluations, ad-hoc notes |
| 7: Polish + i18n | 1 day | Vietnamese labels, shortcuts, Excel import/export |
| **Total** | **~15 days** | **MVP ready** |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Payroll calculation errors (tax brackets) | **High** | Unit test every formula, cross-check with Excel template |
| Data loss (Dell hardware failure) | **Medium** | Supabase auto-backup + manual export monthly |
| Supabase free tier limits (500MB) | **Low** | 200 employees × 12 months ≈ 50MB; safe for 5+ years |
| Class schedule changes mid-month | **Medium** | Allow edit of class_schedules; recalculate affected attendance |
| GV nước ngoài (no labor contract) | **Medium** | `has_labor_contract` flag; insurance = 0 if false |
| 1 GV teaches multiple classes (count error) | **Medium** | SQL: GROUP BY employee_id, COUNT(DISTINCT schedule_id) |

---

## Acceptance Criteria

**Definition of Done:**
- [ ] All 16 database tables created with RLS policies
- [ ] All 3 payroll formulas unit-tested
- [ ] Attendance grid displays correctly, auto-fills work
- [ ] Payroll calculation matches Excel template
- [ ] KPI form calculates bonus correctly
- [ ] 50+ payslips generated and emailed successfully
- [ ] Employee PWA works on mobile (offline sync)
- [ ] Extended profiles: CCCD, bank, qualifications viewable/editable
- [ ] Template evaluations: admin creates, BM scores, employee views
- [ ] Ad-hoc notes: BM creates, visible in employee profile
- [ ] Audit log tracks all changes
- [ ] Zero salary discrepancies (100% accuracy vs template)
- [ ] Build passes, tests pass, no TypeScript errors
- [ ] All UI labels in Vietnamese

---

*PDR Version 1.1 | 2026-03-06 | Added class schedule module, two-track attendance, office_attendance table*
