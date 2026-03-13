# Brainstorm: Lịch Lớp & Tách Chấm Công GV/VP

> Date: 2026-03-06
> Status: Agreed — Docs updated

---

## Problem Statement

Brainstorm trước (V2) thiết kế `class_schedules` + `attendance` chung cho tất cả NV. Nhưng **VP staff** (lễ tân, bảo vệ, hành chính) không có lịch lớp — họ đi làm hàng ngày, không theo ca dạy.

Cần:
1. Tách module **Ca Làm Việc (Class Schedules)** thành module riêng (không chỉ là phụ thuộc của Attendance)
2. Tách chấm công thành 2 track: class-based (GV/TG) và daily (VP)
3. Thêm bảng `office_attendance` riêng cho VP

## Decisions Made

### 1. Class Schedules = Module Riêng (Module 1)

**Trước:** Class schedules chỉ là setup data cho attendance grid
**Sau:** Class schedules là module CRUD riêng, được quản lý trước khi chấm công

- Admin/BM tạo classes: class_code, class_name, shift_time, days_of_week[], teacher_id, assistant_id
- Mỗi class = 1 GV + 1 TG
- Lịch cố định (VD: T2-T4-T6), 1 record/class
- Auto-populate attendance grid từ class_schedules

### 2. Two-Track Attendance

| Track | Đối tượng | Table | Cơ chế |
|-------|----------|-------|--------|
| Class-based | GV + TG | `attendance` | Rows auto-generated từ class_schedules, BM đánh status per class/day |
| Daily | VP staff | `office_attendance` | BM đánh status per employee/day, không link class |

### 3. New Table: `office_attendance`

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

### 4. Updated Module Order

| # | Module | Mô tả |
|---|--------|-------|
| 1 | Ca Làm Việc (Class Schedules) | CRUD class schedules, assign GV/TG |
| 2 | Chấm Công (Attendance) | Weekly grid (class-based) + daily (VP) |
| 3 | Tính Lương (Payroll) | 3 formulas |
| 4 | KPI Trợ Giảng | 5 criteria, bonus |
| 5 | Hồ Sơ & Đánh Giá NV | Extended profile, template eval, ad-hoc notes |

### 5. Total DB Tables: 15 → 16

Added: `office_attendance`

## Impact on Payroll

VP staff payroll: `sessions_worked` counted from `office_attendance` (days × rate), not from `attendance` (class-based).

Payroll calculation needs to check `employee.position`:
- `teacher` / `assistant` → count from `attendance` table
- `office` → count from `office_attendance` table

## Files Updated

- `CLAUDE.md` — Core Modules order, table count
- `docs/system-architecture.md` — New table #5 office_attendance, renumbered, data flow
- `README.md` — Module order, table count, business rules
- `docs/code-standards.md` — File structure (class-schedules/, office-attendance/)
- `docs/project-roadmap.md` — Phase 2 scope, table count
- `docs/codebase-summary.md` — Table reference, attendance model

---

*Brainstorm concluded: 2026-03-06 | Class schedule separation + VP attendance track*
