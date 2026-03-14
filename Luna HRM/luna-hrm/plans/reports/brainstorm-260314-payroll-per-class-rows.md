# Brainstorm: Payroll Per-Class Rows

**Date:** 2026-03-14
**Feature:** Cải tiến Payroll Spreadsheet — Tính lương theo lớp

## Problem Statement

Payroll spreadsheet hiện tại hiển thị 1 dòng/nhân viên với `sessions_worked` gộp toàn tháng. Kế toán không thể verify số buổi của từng lớp ngay trong bảng lương.

## Requirements (Confirmed)

1. Flat table — mỗi lớp 1 dòng, dòng tổng NV ở cuối
2. Scope: buổi của tháng lương đang xét (payroll_period start→end)
3. Rate riêng per class → `class_schedules.teacher_rate` / `assistant_rate`
4. Dòng lớp hiển thị: class_code / sessions / rate / thành tiền (read-only mặc định, nút ✏ edit)
5. Dòng tổng NV: giữ nguyên BHXH/NET/KPI như hiện tại
6. Storage: giữ nguyên schema payslips — thêm JSONB column `class_breakdown`
7. KPI badge: score + bonus amount ngay trên dòng tổng (assistants only)

## Evaluated Options

### Storage: JSONB vs New Table

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| JSONB `class_breakdown` in `payslips` | Snapshot tại init, no JOIN needed, simple migration | Không query by class | ✅ CHOSEN |
| Bảng mới `payslip_class_breakdown` | Relational chuẩn, audit dễ | Overkill, migration phức tạp, N+1 risk | ❌ |

### UX: Expand/Collapse vs Flat Table

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Flat table (mỗi lớp 1 dòng) | Thấy hết ngay, dễ verify | Dài nếu nhiều NV | ✅ CHOSEN |
| Expand/collapse | Gọn | Phải click thêm | ❌ |

## Final Solution

### Schema Changes

```sql
-- 1. Rate per class
ALTER TABLE class_schedules
  ADD COLUMN teacher_rate NUMERIC DEFAULT NULL,
  ADD COLUMN assistant_rate NUMERIC DEFAULT NULL;
-- NULL = fallback về employees.rate_per_session

-- 2. Class breakdown snapshot
ALTER TABLE payslips
  ADD COLUMN class_breakdown JSONB DEFAULT '[]'::jsonb;
-- [{class_code, class_name, sessions, rate, amount, default_sessions, default_rate}]
```

### UI Layout

```
# | Họ tên      | Lớp   | Buổi  | Đơn giá  | Thành tiền
─────────────────────────────────────────────────────────
  | Trần Thị Linh
1 |             | BC01  | 8     | 75,000 ✏ | 600,000
2 |             | BC02  | 10.5  | 75,000 ✏ | 787,500
  |             ⭐ KPI: 8.5/10 → +425,000đ [base ✓]
  | TỔNG LINH  |       | 18.5  |           | 1,387,500
  |             | BHXH  | BHYT  | TNCN  | NET (editable)
```

### Data Flow

```
Init:
  1. getAttendanceSummary(branch, month, year) → per-class sessions
  2. class_schedules.{position}_rate ?? employees.rate_per_session → rate
  3. Populate class_breakdown JSONB + sessions_worked (sum) + teaching_pay (sum of amounts)

Display:
  1. Group payslips by employee_id
  2. Render class_breakdown rows (read-only)
  3. Click ✏ → inline edit sessions + rate → recalc amount → update JSONB
  4. Dirty tracked at payslip level (existing pattern)
  5. Save → batchUpdatePayslips với class_breakdown + teaching_pay updated

KPI badge:
  - Source: payslips.kpi_bonus (already pre-filled from kpi_evaluations)
  - Display: row between last class row and summary row, assistants only
  - Show: total_score/10 → bonus_amount (need to store total_score too, or compute from kpi_bonus/50000)
```

## Implementation Phases

### Phase 1: Migration + Class Schedule Rate
- Migration 009: ADD class_breakdown JSONB to payslips, ADD teacher_rate/assistant_rate to class_schedules
- Class schedule form: thêm 2 field rate (optional, nullable)

### Phase 2: Init Logic
- `payroll-calculate-actions.ts`: populate class_breakdown khi initializePayslips
- Pattern: reuse getAttendanceSummary → build JSONB array với snapshot sessions + rate

### Phase 3: Spreadsheet UI Refactor
- `payroll-spreadsheet.tsx`: grouped flat table (employee header → class rows → KPI badge → summary row)
- `payroll-spreadsheet-row.tsx`: tách thành ClassRow + SummaryRow components
- Edit flow: inline edit sessions/rate per class → recalc amount + teaching_pay

### Phase 4: Save + Excel
- `payroll-payslip-actions.ts`: add class_breakdown to EDITABLE_KEYS (JSONB type handling)
- `excel-payroll-export.ts`: thêm cột Lớp, expand rows per class

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| NV dạy nhiều lớp → bảng dài | Medium | Sticky header per employee |
| Backward compat (payslips chưa có class_breakdown) | Low | Check length === 0 → fallback display |
| Excel layout thay đổi | Low | Flat expand, thêm cột Lớp |
| KPI total_score không lưu trong payslips | Low | Compute từ kpi_bonus / 50000 hoặc query kpi_evaluations |

## Impact Assessment

| File | Impact |
|------|--------|
| `supabase/migrations/009_payroll_class_breakdown.sql` | New |
| `components/class-schedules/class-schedule-form.tsx` | Minor — 2 rate fields |
| `lib/actions/payroll-calculate-actions.ts` | Moderate — populate JSONB |
| `components/payroll/payroll-spreadsheet.tsx` | Major — grouped layout |
| `components/payroll/payroll-spreadsheet-row.tsx` | Major — 2 new row types |
| `lib/actions/payroll-payslip-actions.ts` | Minor — JSONB in EDITABLE_KEYS |
| `lib/utils/excel-payroll-export.ts` | Minor — expand class rows |

## Success Criteria

- [ ] Mỗi NV trong spreadsheet hiện N dòng lớp + 1 dòng tổng
- [ ] Sessions và rate per class edit được inline (✏ icon)
- [ ] teaching_pay = sum(class amounts) tự động recalc
- [ ] KPI badge hiện score/10 và bonus_amount trên dòng tổng assistant
- [ ] Excel export có cột Lớp, mỗi lớp 1 dòng
- [ ] Build passes, 101+ tests pass
