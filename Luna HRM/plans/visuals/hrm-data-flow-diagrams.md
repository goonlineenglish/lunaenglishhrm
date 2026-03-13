# Luna HRM — ASCII Data Flow Diagrams

> System: Luna HRM — Lightweight HRM for English Language Centers
> Created: 2026-03-06 | Based on Brainstorm V1/V2/V3 + Excel template analysis

---

## Table of Contents

1. [System Overview Data Flow](#1-system-overview-data-flow)
2. [Attendance Data Flow — Chấm Công](#2-attendance-data-flow--cham-cong)
3. [Payroll Data Flow — Tính Lương](#3-payroll-data-flow--tinh-luong)
4. [KPI Evaluation Data Flow — Đánh Giá KPI](#4-kpi-evaluation-data-flow--danh-gia-kpi)
5. [Database Entity Relationship Diagram](#5-database-entity-relationship-diagram)
6. [Authentication & RLS Data Flow](#6-authentication--rls-data-flow)
7. [Email Notification Flow](#7-email-notification-flow)

---

## 1. System Overview Data Flow

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  LUNA HRM — SYSTEM OVERVIEW DATA FLOW                                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  ┌────────────┐    ┌───────────────────┐    ┌──────────────────────────┐
  │   ADMIN    │───▶│  Branch + Employee│───▶│    Class Schedules       │
  │  Setup     │    │  Master Data      │    │  (lịch lớp cố định)      │
  └────────────┘    └───────────────────┘    └──────────┬───────────────┘
                                                         │
                                                         │ auto-generate
                                                         ▼
  ┌────────────┐    ┌───────────────────┐    ┌──────────────────────────┐
  │   BRANCH   │───▶│  Weekly Attendance│◀───│  Weekly Grid (auto-fill) │
  │  MANAGER   │    │  Grid             │    │  default status = "1"    │
  │  (BM)      │    │  (edit exceptions)│    └──────────────────────────┘
  └────────────┘    └────────┬──────────┘
                             │
                             │ writes
                             ▼
                    ┌──────────────────────────────────────────────────┐
                    │              SUPABASE DATABASE                    │
                    │  ┌─────────────┐   ┌────────────────────────┐        │
                    │  │  attendance │   │ employee_weekly_notes │        │
                    │  │  table      │   │ (per-employee notes)  │        │
                    │  └──────┬──────┘   └──────────┬─────────────┘       │
                    └─────────┼─────────────────┼──────────────────────┘
                              │                 │
                    ┌─────────▼─────────────────▼──────────────────────┐
                    │         MONTHLY AGGREGATION                        │
                    │  SUM sessions per employee from attendance table   │
                    └─────────────────────┬────────────────────────────┘
                                          │
                             ┌────────────┴────────────┐
                             ▼                         ▼
              ┌──────────────────────┐   ┌─────────────────────────┐
              │   PAYROLL CALC       │   │   KPI EVALUATION        │
              │   (Accountant)       │   │   (BM evaluates TG)     │
              │   3 formulas:        │   │   5 criteria → /10      │
              │   - Office/Teacher   │   │   bonus = score × 50k   │
              │   - Teaching Asst    │   └──────────┬──────────────┘
              └──────────┬───────────┘              │ kpi_bonus (TG only)
                         │◀─────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │   PAYSLIPS TABLE     │
              │   (snapshot data)    │
              │   Draft → Confirm    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐    ┌──────────────────────────┐
              │   EMAIL (Resend)     │───▶│   EMPLOYEE PORTAL        │
              │   Payslip to each    │    │   (read-only PWA view)   │
              │   employee           │    └──────────────────────────┘
              └──────────────────────┘

  ═══ ROLES AND ACCESS LEVELS ═════════════════════════════════════════
  │ admin          │ All CRUD, all branches, all modules               │
  │ branch_manager │ Own branch: employees, attendance, KPI            │
  │ accountant     │ All view (read), payroll CRUD, send email         │
  │ employee       │ Own profile, own attendance, own payslip (R/O)    │
  ══════════════════════════════════════════════════════════════════════
```

---

## 2. Attendance Data Flow — Chấm Công

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  ATTENDANCE (CHẤM CÔNG) DATA FLOW                                                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  SETUP (one-time, by Admin/BM)
  ─────────────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │  class_schedules table                                               │
  │  ┌──────────────────────────────────────────────────────────────────┐    │
  │  │  branch_id│class_code│class_name   │shift_time  │days_of_week  │    │
  │  │  tân_mai  │ BC04     │IELTS 6.5 A1│ 19:00-20:30│ [2,4,5]      │    │
  │  │  tân_mai  │ BC05     │TOEIC B2    │ 17:15-19:15│ [3,5]        │    │
  │  │  tân_mai  │ BC06     │Kids 1 C1   │ 18:45-20:45│ [2,3,5,6]    │    │
  │  └──────────────────────────────────────────────────────────────────┘    │
  │        + teacher_id (FK → employees)                                 │
  │        + assistant_id (FK → employees)                               │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │
                          │ auto-generate weekly grid
                          ▼

  WEEKLY WORKFLOW (every week, by BM)
  ────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │  SYSTEM: Generate Weekly Grid                                        │
  │                                                                      │
  │  For each class_schedule in branch:                                  │
  │    For each day in [week_start .. week_start+6]:                     │
  │      If day_of_week = ANY(schedule.days_of_week):                    │
  │        Create attendance row with status = "1" (DEFAULT)             │
  │      Else:                                                           │
  │        Show grey cell (░░░ no schedule)                              │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │
                          ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BM OPENS WEEKLY GRID                                                │
  │                                                                      │
  │  View: Class × Employee rows, Date columns (Mon→Sun)                 │
  │                                                                      │
  │  BM ONLY EDITS EXCEPTIONS:                                           │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  Status Values:                                              │    │
  │  │   "1"   → Present (mặc định tự điền, BM không cần làm gì)  │    │
  │  │   "0"   → Absent with permission (vắng có phép)             │    │
  │  │   "KP"  → Absent NO permission (vắng KP — highlight đỏ)    │    │
  │  │   "0.5" → Half session (nửa buổi — highlight vàng)          │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  │                                                                      │
  │  BM also writes employee_weekly_notes (per-employee structured):        │
  │  note_type=substitute: "E01 thay E07, lớp E1, 2 buổi"                  │
  │  note_type=general: "E04 vắng T5, khám bệnh"                           │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │
                          │ save
                          ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  attendance table (Supabase)                                         │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │  id │ schedule_id │ employee_id │ date     │ status │ marked_by│  │
  │  │  1  │ sched_ielts │ emp_E08     │ 2026-03-02 │ "1"   │ bm_01   │  │
  │  │  2  │ sched_kids1 │ emp_E02     │ 2026-03-03 │ "KP"  │ bm_01   │  │
  │  │  3  │ sched_toeic │ emp_E04     │ 2026-03-05 │ "0"   │ bm_01   │  │
  │  └──────────────────────────────────────────────────────────────┘   │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │
                          ▼

  AUTOMATION & GUARDS
  ────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │  Weekend Reminder (Saturday)                                         │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  CRON: Every Saturday 20:00                                  │    │
  │  │  IF branch has unsaved/incomplete attendance this week       │    │
  │  │  THEN → notify BM (in-app + email)                          │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  │                                                                      │
  │  Auto-Lock (3 days after week ends)                                  │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  CRON: Daily                                                 │    │
  │  │  IF week_end + 3 days < TODAY                                │    │
  │  │  THEN → attendance rows for that week become READ-ONLY       │    │
  │  │  (Admin can unlock if needed)                                │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼

  MONTHLY AGGREGATION → PAYROLL INPUT
  ─────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │  SELECT employee_id, SUM(status::numeric) AS sessions_worked         │
  │  FROM attendance                                                     │
  │  WHERE date BETWEEN month_start AND month_end                        │
  │    AND status IN ('1', '0.5')                                        │
  │  GROUP BY employee_id                                                │
  │                                                                      │
  │  → sessions_worked (INT) per employee → feeds payroll calculation    │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Payroll Data Flow — Tính Lương

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  PAYROLL (TÍNH LƯƠNG) DATA FLOW                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  INPUT SOURCES (gathered by Accountant)
  ───────────────────────────────────────
  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────────┐
  │  attendance table   │  │  employees table      │  │  employee_weekly_notes table   │
  │                     │  │                       │  │                                │
  │  → sessions_worked  │  │  → rate_per_session   │  │  → substitute info (typed)     │
  │    (auto-counted    │  │  → sub_rate           │  │    (accountant reviews         │
  │    from SUM)        │  │  → has_labor_contract │  │    as checklist, is_processed) │
  │                     │  │  → position (type)    │  │                                │
  └──────────┬──────────┘  └──────────┬────────────┘  └────────────┬───────────────────┘
             │                        │                           │
             └────────────────────────┴───────────────────────────┘
                                      │
                                      ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  kpi_evaluations table (for Teaching Assistants only)                │
  │  → total_score (0-10)                                                │
  │  → bonus_amount = total_score × 50,000 VND                          │
  └───────────────────────────┬──────────────────────────────────────────┘
                              │ (TG only)
                              ▼

  3 CALCULATION PATHS (by employee position)
  ───────────────────────────────────────────

  POSITION CHECK ──────────────────────────────────────────────────────────
  │                                                                        │
  │  employees.position == "office"     →  PATH A (Văn Phòng)             │
  │  employees.position == "teacher"    →  PATH B (Giáo Viên)             │
  │  employees.position == "assistant"  →  PATH C (Trợ Giảng)             │
  │                                                                        │
  ──────────────────────────────────────────────────────────────────────────

  PATH A & B: Office / Teacher (same formula, different rates)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  GROSS = (sessions_worked × rate_per_session)                        │
  │        + (substitute_sessions × sub_rate)        ← from employee_weekly_notes │
  │        + other_pay                               ← accountant inputs          │
  │                                                                      │
  │  IF has_labor_contract:                                              │
  │    BHXH = GROSS × 8%                                                │
  │    BHYT = GROSS × 1.5%                                              │
  │    BHTN = GROSS × 1%                                                │
  │  ELSE: BHXH = BHYT = BHTN = 0                                       │
  │                                                                      │
  │  Taxable = GROSS - BHXH - BHYT - BHTN - 11,000,000 (personal)       │
  │          - 4,400,000 × num_dependents                                │
  │  TNCN = progressive_tax(Taxable) [7 brackets]                        │
  │                                                                      │
  │  NET = GROSS - BHXH - BHYT - BHTN - TNCN - penalties                │
  └──────────────────────────────────────────────────────────────────────┘

  PATH C: Teaching Assistant (with KPI bonus)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  GROSS = (sessions_worked × 75,000)              ← fixed rate 75k   │
  │        + (substitute_sessions × sub_rate)        ← from employee_weekly_notes │
  │        + other_pay                               ← accountant inputs          │
  │        + kpi_bonus                               ← kpi_evaluations   │
  │          (total_score × 50,000)                                      │
  │                                                                      │
  │  IF has_labor_contract:                                              │
  │    BHXH = GROSS × 8%                                                │
  │    BHYT = GROSS × 1.5%                                              │
  │    BHTN = GROSS × 1%                                                │
  │  ELSE: BHXH = BHYT = BHTN = 0                                       │
  │                                                                      │
  │  Taxable = GROSS - BHXH - BHYT - BHTN - 11,000,000 (personal)       │
  │          - 4,400,000 × num_dependents                                │
  │  TNCN = progressive_tax(Taxable) [7 brackets]                        │
  │                                                                      │
  │  NET = GROSS - BHXH - BHYT - BHTN - TNCN - penalties                │
  └──────────────────────────────────────────────────────────────────────┘

  PROGRESSIVE TAX TABLE (TNCN — 7 bậc lũy tiến)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Bậc 1: ≤ 5,000,000                →  5%                           │
  │  Bậc 2: 5,000,001 – 10,000,000     → 10%                           │
  │  Bậc 3: 10,000,001 – 18,000,000    → 15%                           │
  │  Bậc 4: 18,000,001 – 32,000,000    → 20%                           │
  │  Bậc 5: 32,000,001 – 52,000,000    → 25%                           │
  │  Bậc 6: 52,000,001 – 80,000,000    → 30%                           │
  │  Bậc 7: > 80,000,000               → 35%                           │
  └──────────────────────────────────────────────────────────────────────┘

  PAYROLL WORKFLOW (Accountant)
  ──────────────────────────────
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  DRAFT   │───▶│ CALCULATE│───▶│  REVIEW  │───▶│ CONFIRM  │───▶│  EMAIL   │
  │          │    │ (auto)   │    │ >20% diff│    │ double   │    │ Resend   │
  │ Create   │    │ 3 paths  │    │  alert   │    │ confirm  │    │ to each  │
  │ period   │    │ per NV   │    │ BM notes │    │ required │    │ employee │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │  payslips table      │
                                            │  (SNAPSHOT data)     │
                                            │  rate captured at    │
                                            │  calculation time    │
                                            │  → immutable record  │
                                            └──────────────────────┘
                                                       │
                                                       │ undo window
                                                       ▼
                                            ┌──────────────────────┐
                                            │  UNDO (24h window)   │
                                            │  Accountant can      │
                                            │  revert confirmed    │
                                            │  payslip within 24h  │
                                            └──────────────────────┘
```

---

## 4. KPI Evaluation Data Flow — Đánh Giá KPI

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  KPI EVALUATION (ĐÁNH GIÁ KPI TRỢ GIẢNG) DATA FLOW                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  TRIGGER: Monthly evaluation (BM evaluates each Teaching Assistant)
  ─────────────────────────────────────────────────────────────────────

  ┌────────────────────────────────────────────────────────────────────┐
  │  REMINDER: Notification on 25th of each month                      │
  │  → Branch Manager receives: "Chưa đánh giá KPI T3/2026 cho 8 TG" │
  └──────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼

  PRE-FILL: Copy last month scores (optimization)
  ┌────────────────────────────────────────────────────────────────────┐
  │  SELECT * FROM kpi_evaluations                                      │
  │  WHERE employee_id = :eid AND month = :last_month                   │
  │  → pre-populate form with previous scores                           │
  │  → BM only adjusts changed criteria                                 │
  └──────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼

  KPI FORM — 2-SECTION STRUCTURE
  ─────────────────────────────────
  ┌────────────────────────────────────────────────────────────────────┐
  │  SECTION 1: LƯƠNG CỨNG — Pass/Fail (4 mandatory criteria)          │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Tiêu chí 1: Hoàn thành nhiệm vụ TG theo mô tả công việc    │  │
  │  │  Tiêu chí 2: Chuẩn bị phòng học, bảo quản vật tư            │  │
  │  │  Tiêu chí 3: Đúng giờ (đến trước 15 phút)                   │  │
  │  │  Tiêu chí 4: Điểm danh HS hàng ngày + báo vắng              │  │
  │  │                                                               │  │
  │  │  → base_pass = (all 4 PASS) ? true : false                   │  │
  │  │  → IF false: salary = 0 (no sessions × rate)                 │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  │                                                                     │
  │  SECTION 2: THƯỞNG KPI — 5 scoring criteria                        │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │                      MAX   SCORE   WEIGHT                    │  │
  │  │  TSI (giờ TSI)         1   [0-1]   10%                       │  │
  │  │  Funtime (giờ Funtime) 3   [0-3]   30%                       │  │
  │  │  Parent (phụ huynh)    2   [0-2]   20%                       │  │
  │  │  Student (học sinh)    3   [0-3]   30%                       │  │
  │  │  Demeanor (tác phong)  1   [0-1]   10%                       │  │
  │  │  ────────────────────────────────────────                    │  │
  │  │  total_score = TSI + Funtime + Parent + Student + Demeanor   │  │
  │  │  Range: 0 – 10                                               │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     │ BM submits
                                     ▼

  CALCULATION
  ┌────────────────────────────────────────────────────────────────────┐
  │  bonus_amount = total_score × 50,000 VND                           │
  │                                                                    │
  │  Min bonus: 0 × 50,000 = 0 VND                                    │
  │  Max bonus: 10 × 50,000 = 500,000 VND                              │
  │  Typical:   6–9 × 50,000 = 300,000 – 450,000 VND                  │
  └──────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼

  STORAGE
  ┌────────────────────────────────────────────────────────────────────┐
  │  kpi_evaluations table                                             │
  │  ┌────────────────────────────────────────────────────────────┐   │
  │  │  employee_id  │ branch_id │ month │ year │ base_pass       │   │
  │  │  tsi_score   │ funtime_score │ parent_score │ student_score │   │
  │  │  demeanor_score │ total_score │ bonus_amount │ evaluated_by │   │
  │  └────────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼

  FEED INTO PAYROLL
  ┌────────────────────────────────────────────────────────────────────┐
  │  Payroll engine reads kpi_evaluations for current month            │
  │  IF employee.position == "assistant":                              │
  │    payslips.kpi_bonus = kpi_evaluations.bonus_amount               │
  │    (included in GROSS calculation — see Diagram 3)                 │
  └────────────────────────────────────────────────────────────────────┘

  6-MONTH HISTORY CHART (employee portal view)
  ┌────────────────────────────────────────────────────────────────────┐
  │  SELECT month, year, total_score, bonus_amount                     │
  │  FROM kpi_evaluations                                              │
  │  WHERE employee_id = :eid                                          │
  │  ORDER BY year DESC, month DESC LIMIT 6                            │
  │                                                                    │
  │  Renders as bar chart: last 6 months scores + bonuses              │
  └────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Entity Relationship Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  DATABASE ER DIAGRAM — 10 TABLES                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                         │
  │  ┌──────────────────────────────┐                                                       │
  │  │  branches                    │                                                       │
  │  │  ──────────────────────────  │                                                       │
  │  │  id           UUID PK        │                                                       │
  │  │  name         TEXT           │                                                       │
  │  │  address      TEXT           │                                                       │
  │  │  phone        TEXT           │                                                       │
  │  │  status       TEXT (active)  │                                                       │
  │  │  created_at   TIMESTAMPTZ    │                                                       │
  │  └──────────────┬───────────────┘                                                       │
  │                 │ 1                                                                     │
  │    ┌────────────┼──────────────────────────────────────────────┐                       │
  │    │ N          │ N                    │ N            │ N       │ N                     │
  │    ▼            ▼                      ▼              ▼         ▼                      │
  │                                                                                         │
  │  ┌─────────────────────────┐    ┌─────────────────────────────────────────────────┐    │
  │  │  employees              │    │  class_schedules                                │    │
  │  │  ─────────────────────  │    │  ─────────────────────────────────────────────  │    │
  │  │  id           UUID PK   │    │  id             UUID PK                         │    │
  │  │  branch_id    FK        │    │  branch_id      FK → branches                   │    │
  │  │  employee_code TEXT     │    │  class_code     TEXT  "BC04"                     │    │
  │  │  full_name    TEXT      │    │  class_name     TEXT  "IELTS 6.5 A1"            │    │
  │  │  name_en      TEXT      │    │  shift_time     TEXT  "19:00-20:30"             │    │
  │  │  email        TEXT      │    │  days_of_week   INT[] [2,4,5]                   │    │
  │  │  email        TEXT      │    │  teacher_id     FK → employees                  │    │
  │  │  phone        TEXT      │    │  assistant_id   FK → employees                  │    │
  │  │  position     TEXT      │    │  status         TEXT  active/inactive            │    │
  │  │    (teacher/assistant/  │    │  created_at     TIMESTAMPTZ                     │    │
  │  │     office)             │    └────────────────┬────────────────────────────────┘    │
  │  │  rate_per_session BIGINT│                     │ 1                                   │
  │  │  sub_rate     BIGINT    │                     │                                     │
  │  │  has_labor_contract BOOL│                     │ N                                   │
  │  │  hire_date    DATE      │    ┌────────────────▼────────────────────────────────┐    │
  │  │  status       TEXT      │    │  attendance                                     │    │
  │  │  created_at   TIMESTAMPTZ│   │  ─────────────────────────────────────────────  │    │
  │  └──────────────┬──────────┘    │  id             UUID PK                         │    │
  │                 │ 1             │  schedule_id    FK → class_schedules             │    │
  │    ┌────────────┼───────────────│  employee_id    FK → employees                  │    │
  │    │ N          │ N     N ──────┘  date           DATE                            │    │
  │    ▼            ▼                │  status         TEXT  "1"/"0"/"KP"/"0.5"       │    │
  │                                  │  marked_by      FK → employees (BM)            │    │
  │  ┌──────────────────────────┐    │  created_at     TIMESTAMPTZ                    │    │
  │  │  kpi_evaluations         │    └─────────────────────────────────────────────────┘   │
  │  │  ──────────────────────  │                                                           │
  │  │  id           UUID PK   │    ┌─────────────────────────────────────────────────┐    │
  │  │  employee_id  FK        │    │  employee_weekly_notes                          │    │
  │  │  branch_id    FK        │    │  ─────────────────────────────────────────────  │    │
  │  │  month        INT       │    │  id             UUID PK                         │    │
  │  │  year         INT       │    │  branch_id      FK → branches                   │    │
  │  │  base_pass    BOOLEAN   │    │  week_start     DATE  (Monday of the week)       │    │
  │  │  tsi_score    INT 0-1   │    │  employee_id    FK → employees                   │    │
  │  │  tsi_comment  TEXT      │    │  note_type      TEXT  (substitute|bonus|...)     │    │
  │  │  funtime_score INT 0-3  │    │  description    TEXT                              │    │
  │  │  funtime_comment TEXT   │    │  amount         NUMERIC  (nullable)              │    │
  │  │  parent_score  INT 0-2  │    │  is_processed   BOOLEAN DEFAULT false            │    │
  │  │  parent_comment TEXT    │    ┌─────────────────────────────────────────────────┐    │
  │  │  student_score INT 0-3  │    │  payroll_periods                                │    │
  │  │  student_comment TEXT   │    │  ─────────────────────────────────────────────  │    │
  │  │  demeanor_score INT 0-1 │    │  id             UUID PK                         │    │
  │  │  demeanor_comment TEXT  │    │  branch_id      FK → branches                   │    │
  │  │  total_score   INT 0-10 │    │  month          INT                             │    │
  │  │  bonus_amount  BIGINT   │    │  year           INT                             │    │
  │  │  evaluated_by  FK       │    │  status         TEXT  draft/confirmed/sent      │    │
  │  │  created_at   TIMESTAMPTZ│   │  confirmed_by   FK → employees (accountant)     │    │
  │  └──────────────────────────┘   │  confirmed_at   TIMESTAMPTZ                    │    │
  │                                  │  created_at     TIMESTAMPTZ                    │    │
  │  ┌──────────────────────────┐    └────────────────┬────────────────────────────────┘   │
  │  │  salary_components       │                     │ 1                                   │
  │  │  ──────────────────────  │                     │ N                                   │
  │  │  id           UUID PK   │    ┌────────────────▼────────────────────────────────┐    │
  │  │  employee_id  FK        │    │  payslips                                       │    │
  │  │  type         TEXT      │    │  ─────────────────────────────────────────────  │    │
  │  │    allowance/deduction  │    │  id                 UUID PK                     │    │
  │  │  name         TEXT      │    │  employee_id        FK → employees               │    │
  │  │  amount       BIGINT    │    │  period_id          FK → payroll_periods         │    │
  │  │  is_recurring BOOLEAN   │    │  sessions_worked    INT                         │    │
  │  │  created_at   TIMESTAMPTZ│   │  rate_per_session   BIGINT  (snapshot)          │    │
  │  └──────────────────────────┘   │  substitute_sessions INT                       │    │
  │                                  │  substitute_pay     BIGINT                     │    │
  │  ┌──────────────────────────┐    │  other_pay          BIGINT                     │    │
  │  │  evaluations             │    │  kpi_bonus          BIGINT  (TG only)          │    │
  │  │  ──────────────────────  │    │  gross_amount       BIGINT                     │    │
  │  │  id           UUID PK   │    │  bhxh_amount        BIGINT                     │    │
  │  │  employee_id  FK        │    │  bhyt_amount        BIGINT                     │    │
  │  │  evaluator_id FK        │    │  bhtn_amount        BIGINT                     │    │
  │  │  period       TEXT      │    │  tncn_amount        BIGINT                     │    │
  │  │  score        DECIMAL   │    │  penalties          BIGINT                     │    │
  │  │  notes        TEXT      │    │  net_amount         BIGINT                     │    │
  │  │  created_at   TIMESTAMPTZ│   │  extra_notes        TEXT                       │    │
  │  └──────────────────────────┘   │  email_sent_at      TIMESTAMPTZ               │    │
  │                                  │  created_at         TIMESTAMPTZ               │    │
  │                                  └─────────────────────────────────────────────────┘   │
  │                                                                                         │
  └─────────────────────────────────────────────────────────────────────────────────────────┘

  RELATIONSHIP SUMMARY
  ─────────────────────
  branches      (1) ──→ (N) employees
  branches      (1) ──→ (N) class_schedules
  branches      (1) ──→ (N) employee_weekly_notes
  branches      (1) ──→ (N) payroll_periods
  employees     (1) ──→ (N) attendance
  employees     (1) ──→ (N) employee_weekly_notes
  employees     (1) ──→ (N) kpi_evaluations
  employees     (1) ──→ (N) payslips
  employees     (1) ──→ (N) salary_components
  employees     (1) ──→ (N) evaluations
  class_schedules (1) ──→ (N) attendance
  payroll_periods (1) ──→ (N) payslips
```

---

## 6. Authentication & RLS Data Flow

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  AUTHENTICATION & ROW LEVEL SECURITY (RLS) DATA FLOW                                     ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  AUTH FLOW (Login)
  ──────────────────
  ┌─────────────┐    ┌────────────────────┐    ┌──────────────────────────────┐
  │   Browser   │───▶│  Supabase Auth     │───▶│  JWT Token                   │
  │   Login     │    │  (email/password)  │    │  {                           │
  │   Form      │    │                    │    │    sub: user_uuid,           │
  └─────────────┘    └────────────────────┘    │    role: "branch_manager",  │
                                               │    branch_id: "uuid_of_cs1",│
                                               │    employee_id: "emp_uuid"  │
                                               │  }                           │
                                               └──────────────┬───────────────┘
                                                              │
                                                              │ sent with every request
                                                              ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Next.js API Route / Server Action                                   │
  │                                                                      │
  │  const supabase = createServerClient()  ← reads JWT from cookie     │
  │  const { data: { user } } = await supabase.auth.getUser()           │
  │  → user.user_metadata.role      = "branch_manager"                  │
  │  → user.user_metadata.branch_id = "uuid_of_cs1"                     │
  └────────────────────────────────────────┬─────────────────────────────┘
                                           │
                                           │ query passes JWT automatically
                                           ▼

  SUPABASE RLS ENGINE
  ────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Every query to Supabase DB goes through RLS policies                │
  │                                                                      │
  │  auth.jwt() → extracts role + branch_id from token                  │
  └──────────────────────────────────────────────────────────────────────┘

  RLS POLICIES PER TABLE PER ROLE
  ─────────────────────────────────────────────────────────────────────────────────────────────
  TABLE              │ admin             │ branch_manager        │ accountant        │ employee
  ───────────────────┼───────────────────┼───────────────────────┼───────────────────┼──────────
  branches           │ ALL               │ SELECT (own only)     │ SELECT (all)      │ none
  employees          │ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own)
  class_schedules    │ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own classes)
  attendance         │ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own)
  employee_weekly_notes│ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own)
  kpi_evaluations    │ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own)
  payroll_periods    │ ALL               │ SELECT (own branch)   │ ALL               │ none
  payslips           │ ALL               │ SELECT (own branch)   │ ALL               │ SELECT (own)
  salary_components  │ ALL               │ SELECT (own branch)   │ ALL               │ SELECT (own)
  evaluations        │ ALL               │ ALL (own branch)      │ SELECT (all)      │ SELECT (own)
  ─────────────────────────────────────────────────────────────────────────────────────────────

  BRANCH_ID SCOPING (for branch_manager)
  ────────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────────────┐
  │  RLS Policy Example (branch_manager on attendance):                  │
  │                                                                      │
  │  CREATE POLICY "bm_own_branch_attendance"                            │
  │  ON attendance                                                       │
  │  FOR ALL                                                             │
  │  TO authenticated                                                    │
  │  USING (                                                             │
  │    auth.jwt() ->> 'role' = 'branch_manager'                         │
  │    AND                                                               │
  │    branch_id = (auth.jwt() ->> 'branch_id')::uuid                   │
  │  );                                                                  │
  │                                                                      │
  │  → BM at CS Tân Mai CANNOT read CS Linh Đàm attendance              │
  │  → Row-level enforcement — no application-layer bypass possible      │
  └──────────────────────────────────────────────────────────────────────┘

  ROLE HIERARCHY SUMMARY
  ─────────────────────────────────────────────────────────────────────
  │  admin         │ ██████████████████████████████ ALL branches/data  │
  │  accountant    │ ████████████████████░░░░░░░░░░ VIEW all, EDIT pay │
  │  branch_manager│ ████████████████░░░░░░░░░░░░░░ OWN branch only   │
  │  employee      │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░ OWN records only  │
  ─────────────────────────────────────────────────────────────────────
```

---

## 7. Email Notification Flow

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║  EMAIL & NOTIFICATION FLOW                                                               ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

  NOTIFICATION CHANNELS
  ──────────────────────
  ┌────────────────────────────────┐    ┌──────────────────────────────────┐
  │  Email via Resend              │    │  In-App Notifications            │
  │  (transactional emails)        │    │  (Next.js toast/badge)           │
  └────────────────────────────────┘    └──────────────────────────────────┘

  ═══════════════════════════════════════════════════════════════════════
  NOTIFICATION TYPE 1: Payslip Email (monthly, on confirmation)
  ═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │  TRIGGER: Accountant clicks "Gửi email" button on confirmed payslip │
  └───────────────────────────────────────┬────────────────────────────┘
                                          │
                                          ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │  Server Action: sendPayslipEmail(payslip_id)                        │
  │                                                                     │
  │  1. Fetch payslip + employee + period data from Supabase            │
  │  2. Render payslip HTML template (Vietnamese)                       │
  │     - Employee name, position, branch                               │
  │     - Sessions worked, rate, sub sessions, KPI bonus (if TG)       │
  │     - GROSS, deductions breakdown, NET amount                       │
  │     - Period (T3/2026)                                              │
  │  3. Call Resend API                                                 │
  │     From: hrm@lunainglish.com                                       │
  │     To:   employee.email                                            │
  │     Subject: "Phiếu lương T3/2026 — [Employee Name]"               │
  │  4. Update payslips.email_sent_at = NOW()                           │
  └────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────┐
                               │  Employee inbox  │
                               │  receives email  │
                               │  + in-app badge  │
                               └──────────────────┘

  ═══════════════════════════════════════════════════════════════════════
  NOTIFICATION TYPE 2: Weekend Attendance Reminder (weekly, Saturday)
  ═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │  TRIGGER: CRON job — every Saturday at 20:00                        │
  └───────────────────────────────────────┬────────────────────────────┘
                                          │
                                          ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │  Check Attendance Completeness                                      │
  │                                                                     │
  │  For each branch:                                                   │
  │    expected_cells = COUNT(class_schedules × days this week)         │
  │    actual_cells   = COUNT(attendance WHERE week = current_week)     │
  │                                                                     │
  │    IF actual_cells < expected_cells:                                │
  │      → Branch Manager has UNSAVED attendance                        │
  └───────────────────────────────────────┬────────────────────────────┘
                                          │ unsaved attendance detected
                                          ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │  NOTIFY Branch Manager(s) of affected branch                        │
  │                                                                     │
  │  In-App: Toast notification on next login                           │
  │    "Tuần 02/03 - 08/03 chưa chấm công đầy đủ. Còn 3 ô trống."     │
  │                                                                     │
  │  Email (optional):                                                  │
  │    To: branch_manager.email                                         │
  │    Subject: "Nhắc nhở: Chưa hoàn tất chấm công tuần này"           │
  │    Body: List of incomplete classes                                  │
  └────────────────────────────────────────────────────────────────────┘

  ═══════════════════════════════════════════════════════════════════════
  NOTIFICATION TYPE 3: KPI Evaluation Reminder (monthly, 25th)
  ═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │  TRIGGER: CRON job — every 25th of month at 09:00                   │
  └───────────────────────────────────────┬────────────────────────────┘
                                          │
                                          ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │  Check KPI Completion                                               │
  │                                                                     │
  │  For each branch:                                                   │
  │    assistants = employees WHERE position='assistant' AND branch=B   │
  │    evaluated  = kpi_evaluations WHERE month=current AND branch=B    │
  │                                                                     │
  │    pending = assistants NOT IN evaluated                            │
  │    IF COUNT(pending) > 0:                                           │
  │      → BM has unevaluated teaching assistants                      │
  └───────────────────────────────────────┬────────────────────────────┘
                                          │ pending evaluations detected
                                          ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │  NOTIFY Branch Manager(s)                                           │
  │                                                                     │
  │  In-App: Banner notification                                        │
  │    "Chưa đánh giá KPI T3/2026 cho 3 trợ giảng. Deadline: 31/03"   │
  │                                                                     │
  │  Email:                                                             │
  │    To: branch_manager.email                                         │
  │    Subject: "Nhắc nhở: Đánh giá KPI trợ giảng T3/2026"            │
  │    Body: List of unevaluated TG names                               │
  └────────────────────────────────────────────────────────────────────┘

  NOTIFICATION FLOW SUMMARY
  ──────────────────────────
  ┌────────────────────────┬──────────────┬─────────────┬──────────────────┐
  │  Notification          │  Trigger     │  Recipient  │  Channel         │
  ├────────────────────────┼──────────────┼─────────────┼──────────────────┤
  │  Payslip sent          │  Accountant  │  Employee   │  Email + in-app  │
  │  Attendance incomplete │  CRON Sat    │  BM         │  In-app (email)  │
  │  KPI pending           │  CRON 25th   │  BM         │  In-app + email  │
  └────────────────────────┴──────────────┴─────────────┴──────────────────┘
```

---

*Generated: 2026-03-06 | Luna HRM — Data Flow Diagrams v1.0*
*Source: Brainstorm V1/V2/V3 reports + Excel payroll template analysis*
