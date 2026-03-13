# Luna HRM — System Architecture

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────┐
│              CLIENTS                               │
│  Desktop Browser  │  Mobile PWA  │  Email Notif    │
└────────┬──────────┴──────┬───────┴────────┬────────┘
         │                 │                │
         │     HTTPS       │                │
         │                 │                │
┌────────▼─────────────────▼────────────────▼────────┐
│            NEXT.JS APPLICATION                      │
│        (Dell Ubuntu, Port 3001)                      │
│                                                     │
│  • App Router (app/ directory)                      │
│  • Server Actions (lib/actions/)                    │
│  • shadcn/ui Components                             │
│  • Tailwind CSS v4                                  │
└────────┬──────────────────────────────────────────┘
         │
         │     Supabase SDK
         │     (Auth + Query)
         │
┌────────▼──────────────────────────────────────────┐
│         SUPABASE CLOUD (Free Tier)                 │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  PostgreSQL Database (500MB)                  │ │
│  │  • 16 core tables                            │ │
│  │  • RLS policies (role-based)                  │ │
│  │  • Realtime subscriptions                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Authentication                               │ │
│  │  • Email/password login                       │ │
│  │  • JWT tokens                                 │ │
│  │  • Session management                         │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Storage (optional)                           │ │
│  │  • PDF payslips                               │ │
│  │  • Excel exports                              │ │
│  └──────────────────────────────────────────────┘ │
└────────┬──────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────┐
│      EMAIL SERVICE                                 │
│  Resend or Supabase Edge Functions                │
│  (Payslip distribution)                            │
└────────────────────────────────────────────────────┘
```

---

## Database Schema (16 Tables)

### 1. **branches**
Represents organizational branches (separate English centers).

```sql
branches
├── id: UUID (PK)
├── name: TEXT ("CS Tân Mai", "CS Quận 1")
├── address: TEXT
├── phone: TEXT
├── manager_id: FK → employees (branch_manager role)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

### 2. **employees**
All staff: teachers, assistants, office, admin. Extended with personal info, qualifications, and characteristics.

```sql
employees
├── id: UUID (PK)
├── branch_id: FK → branches (main branch)
├── employee_code: TEXT ("E01", "E02" — unique per branch)
├── first_name: TEXT
├── last_name: TEXT
├── name_en: TEXT (for foreign teachers: "John Smith")
├── email: TEXT (login + payslip email)
├── phone: TEXT
├── position: TEXT ("teacher" | "assistant" | "office" | "admin")
├── role: TEXT ("admin" | "branch_manager" | "accountant" | "employee")
├── rate_per_session: BIGINT (e.g., 500000, 75000, 150000)
├── sub_rate: BIGINT (substitute teaching rate)
├── has_labor_contract: BOOLEAN (determines insurance deductions)
├── dependent_count: INT (for TNCN tax calculation)
├── status: TEXT ("active" | "inactive" | "on_leave")
├── join_date: DATE
├── -- Extended profile fields --
├── date_of_birth: DATE
├── id_number: TEXT (CCCD/CMND/Passport)
├── id_issue_date: DATE
├── id_issue_place: TEXT
├── address: TEXT
├── emergency_contact: TEXT (name + phone)
├── bank_account_number: TEXT
├── bank_name: TEXT
├── nationality: TEXT (important for foreign teachers)
├── qualifications: TEXT ("IELTS 8.0, CELTA, TESOL")
├── teaching_license: TEXT (license number if applicable)
├── characteristics: TEXT (BM notes: personality, strengths, weaknesses)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Unique: (branch_id, employee_code)
```

### 3. **class_schedules**
Fixed weekly class schedule. 1 record = 1 class (multiple days). Each class has a unique `class_code` per branch.

```sql
class_schedules
├── id: UUID (PK)
├── branch_id: FK → branches
├── class_code: TEXT ("BC04", "IELTS-A1") — UNIQUE per branch
├── class_name: TEXT ("IELTS 6.5 - A1", "Kids 1 - C1")
├── shift_time: TEXT ("19:00-20:30", "17:15-19:15")
├── days_of_week: INT[] ([2, 4, 5] = T2, T4, T5)
├── teacher_id: FK → employees (position='teacher')
├── assistant_id: FK → employees (position='assistant')
├── status: TEXT ("active" | "inactive")
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

UNIQUE: (branch_id, class_code)
Index: (branch_id, status)
```

### 4. **attendance**
Weekly attendance marking for each class/position/date combo.

```sql
attendance
├── id: UUID (PK)
├── schedule_id: FK → class_schedules
├── employee_id: FK → employees
├── date: DATE
├── status: TEXT ("1" | "0" | "KP" | "0.5")
│   • "1" = present (default)
│   • "0" = absent with permission
│   • "KP" = absent without permission
│   • "0.5" = half-day
├── marked_by: FK → employees (branch_manager who marked)
├── notes: TEXT (if applicable)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Unique: (schedule_id, employee_id, date)
Index: (employee_id, date), (branch_id, date)
```

### 5. **office_attendance**
Daily attendance for office staff (receptionist, security, admin). Not class-based — simple per-day marking.

```sql
office_attendance
├── id: UUID (PK)
├── branch_id: FK → branches
├── employee_id: FK → employees (position='office')
├── date: DATE
├── status: TEXT ("1" | "0" | "KP" | "0.5")
├── marked_by: FK → employees (branch_manager)
├── notes: TEXT
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Unique: (employee_id, date)
Index: (branch_id, date)
```

### 6. **employee_weekly_notes**
Per-employee structured notes for substitute teaching, bonuses, penalties, extra jobs. Branch manager creates, accountant reviews as checklist during payroll.

```sql
employee_weekly_notes
├── id: UUID (PK)
├── branch_id: FK → branches
├── week_start: DATE (Monday of the week)
├── employee_id: FK → employees
├── note_type: TEXT CHECK (substitute|bonus|penalty|extra_job|general)
├── description: TEXT
│   Examples:
│   "Thay E07 lớp Giao tiếp E1, 2 buổi"
│   "Phụ đạo HS buổi tối, 2 buổi × 40k"
├── amount: NUMERIC (nullable — sessions count or VND)
├── amount_unit: TEXT CHECK (sessions|vnd) nullable
├── is_processed: BOOLEAN DEFAULT false (accountant marks when processed)
├── processed_by: FK → employees (nullable)
├── created_by: FK → employees (branch_manager)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Index: (branch_id, week_start), (employee_id, week_start)
Unique: none (multiple notes per employee per week allowed)
```

### 7. **kpi_evaluations**
Monthly KPI scores for teaching assistants (5 criteria).

```sql
kpi_evaluations
├── id: UUID (PK)
├── employee_id: FK → employees (position='assistant')
├── branch_id: FK → branches
├── month: INT (1-12)
├── year: INT (2026)
├── base_pass: BOOLEAN (4 mandatory criteria met?)
├── tsi_score: INT (0-1: discipline support)
├── tsi_comment: TEXT
├── funtime_score: INT (0-3: activity planning)
├── funtime_comment: TEXT
├── parent_score: INT (0-2: parent engagement)
├── parent_comment: TEXT
├── student_score: INT (0-3: student safety + English)
├── student_comment: TEXT
├── demeanor_score: INT (0-1: punctuality + dress)
├── demeanor_comment: TEXT
├── total_score: INT (0-10: computed as sum/10)
├── bonus_amount: BIGINT (total_score × 50000)
├── evaluated_by: FK → employees (branch_manager)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Unique: (employee_id, month, year)
```

### 8. **payroll_periods**
Month-level payroll cycle (draft → confirmed → sent).

```sql
payroll_periods
├── id: UUID (PK)
├── branch_id: FK → branches
├── month: INT (1-12)
├── year: INT (2026)
├── status: TEXT ("draft" | "confirmed" | "sent")
├── total_gross: BIGINT (sum of all payslips GROSS)
├── total_net: BIGINT (sum of all payslips NET)
├── created_by: FK → employees (accountant)
├── confirmed_at: TIMESTAMP
├── sent_at: TIMESTAMP
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Unique: (branch_id, month, year)
Index: (status, sent_at)
```

### 9. **payslips**
Individual salary calculation (one per employee per period).

```sql
payslips
├── id: UUID (PK)
├── payroll_period_id: FK → payroll_periods
├── employee_id: FK → employees
├── branch_id: FK → branches
├── position: TEXT ("teacher" | "assistant" | "office")
├── sessions_worked: INT (counted from attendance)
├── rate_per_session: BIGINT (snapshot at calc time)
├── teaching_pay: BIGINT (sessions_worked × rate)
├── substitute_sessions: INT (from employee_weekly_notes where note_type='substitute')
├── substitute_rate: BIGINT (snapshot at calc time)
├── substitute_pay: BIGINT (substitute_sessions × rate)
├── other_pay: BIGINT (phụ đạo, manual entry)
├── kpi_bonus: BIGINT (for assistants: total_score × 50000; else 0)
├── allowances: BIGINT (phụ cấp cố định)
├── gross_pay: BIGINT (teaching + substitute + kpi + other + allowances)
├── bhxh: BIGINT (8% if has_labor_contract; else 0)
├── bhyt: BIGINT (1.5% if has_labor_contract; else 0)
├── bhtn: BIGINT (1% if has_labor_contract; else 0)
├── tncn: BIGINT (progressive tax, 7 brackets)
├── penalties: BIGINT (manual deductions/fines)
├── net_pay: BIGINT (gross - bhxh - bhyt - bhtn - tncn - penalties)
├── extra_notes: TEXT (from BM, e.g., "Substitute: 2 sessions for E07")
├── email_sent_at: TIMESTAMP
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Index: (payroll_period_id, employee_id), (employee_id, created_at)
```

### 10. **salary_components**
Pre-configured allowances/deductions (allowance, recurring).

```sql
salary_components
├── id: UUID (PK)
├── employee_id: FK → employees
├── component_type: TEXT ("allowance" | "deduction")
├── name: TEXT ("Phụ cấp xăng", "Khấu trừ bảo hiểm riêng")
├── amount: BIGINT (VND)
├── is_recurring: BOOLEAN (apply every month?)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

### 11. **evaluation_templates**
Admin-created criteria sets for structured evaluations.

```sql
evaluation_templates
├── id: UUID (PK)
├── name: TEXT ("Đánh giá GV cuối kì", "Đánh giá VP quý")
├── applies_to: TEXT ("teacher" | "assistant" | "office" | "all")
├── max_total_score: INT (total max, e.g., 50, 100)
├── is_active: BOOLEAN
├── created_by: FK → employees (admin)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

### 12. **evaluation_criteria**
Individual criteria within a template (N per template).

```sql
evaluation_criteria
├── id: UUID (PK)
├── template_id: FK → evaluation_templates
├── name: TEXT ("Kỹ năng giảng dạy")
├── description: TEXT (detailed description)
├── max_score: INT (e.g., 10, 20)
├── weight: NUMERIC (default 1.0)
├── sort_order: INT
└── created_at: TIMESTAMP
```

### 13. **evaluation_periods**
Custom evaluation periods created by admin.

```sql
evaluation_periods
├── id: UUID (PK)
├── name: TEXT ("Kì 1/2026", "Quý 2/2026")
├── start_date: DATE
├── end_date: DATE
├── status: TEXT ("open" | "closed")
├── created_by: FK → employees (admin)
└── created_at: TIMESTAMP
```

### 14. **employee_evaluations**
Structured evaluations created by BM (periodic or ad-hoc).

```sql
employee_evaluations
├── id: UUID (PK)
├── employee_id: FK → employees
├── evaluator_id: FK → employees (BM/admin)
├── template_id: FK → evaluation_templates
├── period_id: FK → evaluation_periods (nullable — null = ad-hoc)
├── eval_type: TEXT ("periodic" | "ad_hoc")
├── total_score: NUMERIC (computed sum)
├── overall_notes: TEXT
├── bonus_impact: BIGINT (VND, nullable — affects payroll if set)
├── status: TEXT ("draft" | "confirmed")
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

### 15. **evaluation_scores**
Per-criterion scores within an evaluation (N per evaluation).

```sql
evaluation_scores
├── id: UUID (PK)
├── evaluation_id: FK → employee_evaluations
├── criterion_id: FK → evaluation_criteria
├── score: NUMERIC
├── comment: TEXT
└── created_at: TIMESTAMP
```

### 16. **employee_notes**
Quick ad-hoc notes by BM (not structured evaluations).

```sql
employee_notes
├── id: UUID (PK)
├── employee_id: FK → employees
├── author_id: FK → employees (BM/admin)
├── note_type: TEXT ("praise" | "warning" | "observation" | "general")
├── content: TEXT
└── created_at: TIMESTAMP
```

---

## RLS (Row-Level Security) Policies

### **By Role**

**Admin:**
```sql
-- Can see all rows in all branches
SELECT * FROM employees  -- all branches
SELECT * FROM attendance  -- all branches
SELECT * FROM payslips  -- all branches
```

**Branch Manager:**
```sql
-- Can only see employees/attendance in own branch
SELECT * FROM employees WHERE branch_id = auth.user().branch_id
SELECT * FROM attendance WHERE branch_id = auth.user().branch_id
SELECT * FROM office_attendance WHERE branch_id = auth.user().branch_id
SELECT * FROM payslips WHERE branch_id = auth.user().branch_id

-- Can mark attendance + create KPI evals in own branch only
UPDATE attendance SET status=... WHERE branch_id = auth.user().branch_id
UPDATE office_attendance SET status=... WHERE branch_id = auth.user().branch_id
INSERT INTO kpi_evaluations (...) WHERE branch_id = auth.user().branch_id
```

**Accountant:**
```sql
-- Can view all employees, attendance, payslips across all branches
SELECT * FROM employees  -- all branches
SELECT * FROM attendance  -- all branches

-- Can CRUD payroll (confirm, email)
UPDATE payslips SET ...  -- all branches
UPDATE payroll_periods SET status='confirmed' ...
```

**Employee:**
```sql
-- Can only see own records
SELECT * FROM employees WHERE id = auth.user().id
SELECT * FROM attendance WHERE employee_id = auth.user().id
SELECT * FROM payslips WHERE employee_id = auth.user().id
SELECT * FROM kpi_evaluations WHERE employee_id = auth.user().id
SELECT * FROM employee_evaluations WHERE employee_id = auth.user().id
SELECT * FROM evaluation_scores WHERE evaluation_id IN (own evaluations)
-- employee_notes: no access (BM/admin only)
```

### **Evaluation System RLS Summary**

| Table | Admin | Branch Manager | Accountant | Employee |
|-------|-------|----------------|------------|----------|
| evaluation_templates | CRUD | SELECT | SELECT | none |
| evaluation_criteria | CRUD | SELECT | SELECT | none |
| evaluation_periods | CRUD | SELECT | SELECT | none |
| employee_evaluations | ALL | CRUD (own branch) | SELECT (all) | SELECT (own) |
| evaluation_scores | ALL | CRUD (own branch) | SELECT (all) | SELECT (own) |
| employee_notes | ALL | CRUD (own branch) | SELECT (all) | none |

---

## Authentication Flow

1. **User logs in** with email + password (Supabase Auth)
2. **JWT token issued** and stored in client cookies
3. **User role determined** from `employees.role` column
4. **RLS policies enforce** data access based on role + branch_id
5. **Each API call** includes JWT in Authorization header
6. **Supabase checks** user's role and branch_id before returning data

```
Login Form
    ↓
Supabase Auth (email/password)
    ↓
JWT token + user metadata
    ↓
Cookies (secure, httpOnly)
    ↓
Next.js server actions use JWT
    ↓
RLS policies filter results
    ↓
Only authorized data returned
```

---

## Data Flow: Attendance → Payroll

### Teachers & Teaching Assistants (class-based)

```
┌─────────────────────────────────┐
│ Class Schedule (Setup Once)     │
│ IELTS 6.5 T2/T4/T6 17:15-19:15 │
│ Teacher: E01, Assistant: E08    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Weekly Attendance (BM Marks)    │
│ E01: T2[1] T4[1] T6[1] = 3      │
│ E08: T2[1] T4[KP] T6[1] = 2.5   │
│ (+ weekly notes: substitute…)   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Monthly Attendance Summary      │
│ E01: 3×4 weeks = 12 sessions    │
│ E08: 2.5×4 = 10 sessions        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Payroll Calculation             │
│ E01: 12 sessions × 500k = 6M    │
│ E08: 10 sessions × 75k = 750k   │
│      + KPI bonus (if applicable)│
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Deductions (if contract)        │
│ BHXH, BHYT, BHTN, TNCN          │
│ NET = GROSS - deductions        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Payslip (sent to employee)      │
│ NET: 5,280,000 VND (after tax)  │
└─────────────────────────────────┘
```

### Office Staff (daily attendance, not class-based)

```
┌─────────────────────────────────┐
│ Office Attendance (BM Daily)    │
│ E20 (Lễ tân): T2[1] T3[1]...   │
│ E21 (Bảo vệ): T2[1] T3[0.5]...│
│ Simple per-day marking          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Monthly Summary                 │
│ E20: 24 days worked             │
│ E21: 25.5 days worked           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Payroll (same formula as teacher│
│ but days × rate, no KPI)        │
│ E20: 24 × 150k = 3,600,000     │
└─────────────────────────────────┘
```

---

## Payroll Calculation Engine

### **Input Variables**
```
sessions_worked        INT     (counted from attendance)
rate_per_session       BIGINT  (from employees.rate_per_session)
substitute_sessions    INT     (from employee_weekly_notes where note_type='substitute')
substitute_rate        BIGINT  (from employees.sub_rate)
other_pay             BIGINT  (manual entry: phụ đạo, etc.)
allowances            BIGINT  (from salary_components)
has_labor_contract    BOOL    (from employees)
dependent_count       INT     (for TNCN deduction)
```

### **3 Position Formulas**

#### **Teaching Assistant (position='assistant')**
```
teaching_pay = sessions_worked × 75000  (fixed at 75k)
substitute_pay = substitute_sessions × substitute_rate
kpi_eval = [query kpi_evaluations for this month]
kpi_bonus = kpi_eval.total_score × 50000  (if base_pass=true; else 0)

GROSS = teaching_pay + substitute_pay + other_pay + allowances + kpi_bonus

if has_labor_contract:
    BHXH = GROSS × 0.08
    BHYT = GROSS × 0.015
    BHTN = GROSS × 0.01
else:
    BHXH = BHYT = BHTN = 0

taxable_income = GROSS - BHXH - BHYT - BHTN - 11000000 - (4400000 × dependent_count)
TNCN = progressive_tax(taxable_income)  [see below]

NET = GROSS - BHXH - BHYT - BHTN - TNCN - penalties
```

#### **Teacher (position='teacher')**
```
teaching_pay = sessions_worked × rate_per_session
substitute_pay = substitute_sessions × substitute_rate

GROSS = teaching_pay + substitute_pay + other_pay + allowances

[same deductions as assistant, but no KPI]
```

#### **Office (position='office')**
```
[same as teacher, no KPI]
```

### **TNCN (Progressive Tax) Calculation**

```python
def progressive_tax(taxable_income):
    """
    Vietnamese personal income tax (TNCN), 7 brackets.
    Input: taxable_income (VND)
    Output: TNCN amount (VND)
    """
    if taxable_income <= 0:
        return 0

    brackets = [
        (5_000_000, 0.05),      # 0-5M at 5%
        (10_000_000, 0.10),     # 5M-10M at 10%
        (18_000_000, 0.15),     # 10M-18M at 15%
        (32_000_000, 0.20),     # 18M-32M at 20%
        (52_000_000, 0.25),     # 32M-52M at 25%
        (80_000_000, 0.30),     # 52M-80M at 30%
        (float('inf'), 0.35),   # >80M at 35%
    ]

    tax = 0
    cumulative = 0

    for threshold, rate in brackets:
        if taxable_income <= cumulative:
            break

        bracket_income = min(taxable_income, threshold) - cumulative
        tax += bracket_income * rate
        cumulative = threshold

    return int(tax)
```

### **Example Calculation (E08 Teaching Assistant)**

```
Input:
  sessions_worked = 16
  rate_per_session = 75000
  substitute_sessions = 2
  substitute_rate = 40000
  other_pay = 50000 (phụ đạo)
  allowances = 0
  kpi_score = 9 (from evaluation)
  has_labor_contract = false
  dependent_count = 0

Calculation:
  teaching_pay = 16 × 75000 = 1,200,000
  substitute_pay = 2 × 40000 = 80,000
  kpi_bonus = 9 × 50000 = 450,000
  GROSS = 1,200,000 + 80,000 + 50,000 + 450,000 = 1,780,000

  [No labor contract]
  BHXH = BHYT = BHTN = 0

  taxable = 1,780,000 - 0 - 11,000,000 = negative
  TNCN = 0 (below threshold)

  NET = 1,780,000 - 0 - 0 - 0 - 0 = 1,780,000 VND
```

---

## Security Considerations

1. **Row-Level Security (RLS)** — All table access controlled by Supabase policies
2. **API Rate Limiting** — Supabase auto-rate-limits free tier (max 100 req/sec)
3. **HTTPS only** — All traffic encrypted
4. **JWT validation** — Server actions verify token before accessing data
5. **Audit log** — All changes logged with timestamp + user_id
6. **No secrets in frontend** — Only `NEXT_PUBLIC_` variables exposed; service key kept secret
7. **Password reset** — Supabase Auth handles, enforced email verification

---

## Performance Optimization

1. **Attendance grid caching** — Class schedules cached client-side (rarely change)
2. **Database indexing** — Indexes on `(branch_id, date)`, `(employee_id, date)`
3. **Pagination** — Payroll grids paginate after 50 rows
4. **Server-side rendering** — SSR for initial page load
5. **Client-side filtering** — Quick search in tables (300ms debounce)
6. **Lazy loading** — Payslip details load on demand (slide-out panel)

---

*Architecture v1.1 | 2026-03-06 | Added office_attendance table, VP staff data flow*
