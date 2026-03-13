# Brainstorm: Lightweight HRM App — Build from Scratch

## Problem Statement

User currently running Frappe HRMS (161 doctypes, Frappe + ERPNext + MariaDB + Redis = ~3GB RAM). Only needs **3 core functions** but carries 100% bloat. Target host: Dell Inspiron 3442 (i3-4005U, 8GB RAM, 120GB SSD) running Ubuntu alongside Luna CRM.

## Requirements Gathered

| Requirement | Detail |
|---|---|
| **Multi-branch** | Separate branches, each with own manager. Central admin sees all. |
| **Employee profiles** | Per-branch employee records, evaluation |
| **Attendance** | Branch manager marks attendance, employees view their own records |
| **Payroll** | Full: base salary + BHXH + BHYT + TNCN + OT + bonuses + deductions |
| **Payslip delivery** | Accountant reviews → emails payslip; employees self-view |
| **Scale** | 50-200 employees across all branches |
| **Mobile** | PWA for employee check-in & payslip viewing on phone |

## Evaluated Approaches

### A. Hide modules in Frappe HRMS (Rejected)
- **Pros:** 10 min setup, reversible, upgradeable
- **Cons:** Still 3GB RAM (ERPNext mandatory), still 161 doctypes, Dell can't run it + Luna CRM simultaneously
- **Verdict:** Does NOT solve the resource problem

### B. Fork HRMS & strip modules (Rejected)
- **Pros:** Lighter than full HRMS
- **Cons:** Still needs Frappe + ERPNext + MariaDB + Redis (~2GB min). 2-3 days work. Can't upgrade. High break risk.
- **Verdict:** High effort, still heavy

### C. Build new app from scratch (CHOSEN)
- **Pros:** Only what's needed. Same stack as Luna CRM. ~300MB RAM total. Full control.
- **Cons:** 2-4 weeks development. Self-code payroll logic. No pre-built tax engine.
- **Verdict:** Best fit for constraints

### D. Frappe disable features (Rejected)
- Same as A. Cosmetic only, no actual resource savings.

## Final Recommended Solution

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENTS                        │
│  Desktop Browser  │  Mobile PWA  │  Email        │
└────────┬──────────┴──────┬───────┴──────┬────────┘
         │                 │              │
┌────────▼─────────────────▼──────────────▼────────┐
│              Next.js App (on Dell)                │
│  App Router + Server Actions + shadcn/ui         │
│  Port 3001 (separate from Luna CRM :3000)        │
└────────┬─────────────────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────┐
│            Supabase Cloud (Free)                  │
│  PostgreSQL │ Auth │ RLS │ Storage │ Realtime     │
└──────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 16 + App Router | Same as Luna CRM, SSR |
| UI | shadcn/ui + Tailwind v4 | Same as Luna CRM |
| Auth | Supabase Auth + RLS | Role-based: admin, branch_manager, accountant, employee |
| Database | Supabase Cloud PostgreSQL | Free 500MB, enough for 200 employees |
| Mobile | PWA (manifest.json + SW) | Zero cost, employees open on phone |
| Email | Resend or Supabase Edge Functions | Send payslips via email |
| Hosting | Dell Ubuntu (Next.js only) | ~300MB RAM |

### Database Schema (Core Tables Only)

```
branches          — id, name, address, manager_id
employees         — id, branch_id, name, email, phone, position, salary_base, join_date, status
attendance        — id, employee_id, date, status(present/absent/half/leave), marked_by, notes
payroll_periods   — id, branch_id, month, year, status(draft/confirmed/sent)
payslips          — id, employee_id, period_id, base_salary, work_days, ot_hours, ot_amount,
                    bhxh_employee, bhyt_employee, bhtn_employee, tncn, bonuses, deductions,
                    gross_pay, net_pay, email_sent_at
salary_components — id, employee_id, component_type(allowance/deduction), name, amount, is_recurring
evaluations       — id, employee_id, evaluator_id, period, score, notes, created_at
```

**~7 tables vs 161 doctypes in Frappe HRMS**

### Roles & Permissions (RLS)

| Role | Branches | Employees | Attendance | Payroll | Evaluations |
|---|---|---|---|---|---|
| **admin** | All CRUD | All CRUD | All view | All view | All view |
| **branch_manager** | Own branch | Own branch CRUD | Mark + View own branch | View own branch | Create for own branch |
| **accountant** | All view | All view | All view | All CRUD + Send email | View only |
| **employee** | None | Own profile read | Own attendance read | Own payslip read | Own evaluations read |

### Payroll Calculation Logic (Vietnamese Labor Law)

```
Gross = Base Salary × (Work Days / Standard Days) + OT + Bonuses + Allowances

Deductions:
  BHXH (employee) = Gross × 8%
  BHYT (employee) = Gross × 1.5%
  BHTN (employee) = Gross × 1%

Taxable Income = Gross - BHXH - BHYT - BHTN - 11,000,000 (personal deduction)
                 - 4,400,000 × dependents

TNCN (PIT) = Progressive tax on Taxable Income:
  0 - 5M:    5%
  5M - 10M:  10%
  10M - 18M: 15%
  18M - 32M: 20%
  32M - 52M: 25%
  52M - 80M: 30%
  > 80M:     35%

Net Pay = Gross - BHXH - BHYT - BHTN - TNCN - Other Deductions
```

### Resource Comparison

| Metric | Frappe HRMS | New App |
|---|---|---|
| RAM usage | ~3 GB | ~300 MB |
| Docker containers | 4 (frappe, mariadb, redis-cache, redis-queue) | 1 (next.js only) |
| Database | Self-hosted MariaDB | Supabase Cloud (free) |
| Doctypes/Tables | 161 | 7 |
| Disk space | ~2 GB | ~200 MB |
| Can run with Luna CRM on Dell? | Barely (5.5GB total) | Easily (600MB total) |

### Feature Scope (MVP)

| Module | Features | Screens |
|---|---|---|
| **Auth** | Login, role-based access, branch-scoped | 2 |
| **Branch Mgmt** | CRUD branches, assign managers | 2 |
| **Employee Mgmt** | CRUD profiles, per-branch | 3 |
| **Attendance** | Daily mark by manager, calendar view, employee self-view | 3 |
| **Payroll** | Auto-calc from attendance, review, confirm, email | 4 |
| **Evaluations** | Simple score + notes by manager, employee self-view | 2 |
| **Employee Portal** | Self-view attendance, payslip, profile | 3 |
| **Total** | | **~19 screens** |

### Implementation Phases

| Phase | Scope | Duration |
|---|---|---|
| 1 | Database + Auth + Branch + Employee CRUD | 2-3 days |
| 2 | Attendance module (mark + view) | 2-3 days |
| 3 | Payroll engine + payslip generation | 3-4 days |
| 4 | Email payslips + Employee self-service portal | 2-3 days |
| 5 | Evaluations + PWA mobile setup | 1-2 days |
| 6 | Vietnamese localization + Polish | 1 day |
| **Total** | | **~12-16 days** |

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Payroll logic errors (BHXH/TNCN) | High | Unit test every calculation, cross-check with Excel |
| Supabase free tier limit (500MB) | Low | 200 employees × 12 months = ~50MB/year. Safe for 5+ years |
| Dell hardware failure | Medium | Daily DB backup (Supabase has auto-backup) |
| Data loss | Medium | Supabase daily backups + manual export monthly |
| Complex payroll edge cases | Medium | Start simple, iterate based on real usage |

## Success Criteria

- [ ] Admin creates branches and assigns managers
- [ ] Branch manager manages employees and marks daily attendance
- [ ] Attendance data auto-feeds into payroll calculation
- [ ] Payroll correctly computes BHXH, BHYT, BHTN, TNCN per Vietnamese law
- [ ] Accountant reviews and sends payslip emails
- [ ] Employees view own attendance + payslip on phone (PWA)
- [ ] App runs on Dell i3/8GB alongside Luna CRM without lag
- [ ] Total RAM < 400MB

## Next Steps

1. Create detailed implementation plan (phase files)
2. Set up Supabase project + database schema
3. Scaffold Next.js app
4. Implement phase by phase

---

*Generated: 2026-03-05 | Brainstorm session for lightweight HRM rebuild*
