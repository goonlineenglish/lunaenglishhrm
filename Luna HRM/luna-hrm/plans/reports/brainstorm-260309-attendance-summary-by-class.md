# Brainstorm: Tổng Hợp Công Theo Lớp (Attendance Summary by Class)

**Date**: 2026-03-09
**Status**: brainstorm-complete

---

## Problem Statement

Hiện tại module chấm công chỉ có grid tuần (rows=lớp, cols=ngày) và đếm sessions tổng cho payroll. Thiếu view tổng hợp: "Nhân viên X có bao nhiêu công ở từng lớp trong tuần/tháng?". Kế toán và BM cần thông tin này để đối chiếu bảng lương; nhân viên muốn tự kiểm tra.

## Requirements (Confirmed)

| Tiêu chí | Quyết định |
|-----------|-----------|
| Vị trí UI | `/attendance` (tab mới) + `/payroll/[period]` (reference panel) + `/my-attendance` (employee portal) |
| Thời gian | Tuần (chuyển tuần giống attendance grid) + cộng dồn tháng |
| Quyền xem | Tất cả roles — admin/BM/kế toán xem chi nhánh, employee xem công mình |
| Dữ liệu | Chỉ số công (1/0.5) theo lớp, tổng |
| Layout | Card/List dọc |
| VP staff | Hiện chung — tổng công (không phân lớp, vì VP không gắn lớp) |

## UI Mockup

```
┌─────────────────────────────────────────────┐
│ Tổng hợp công  │ Tuần 10/03 ← →  │ Tháng ▼│
├─────────────────────────────────────────────┤
│                                             │
│ Trần Thị Linh (A-TM01) · Trợ giảng         │
│ ├─ BC01 (Beginner A): 3 công               │
│ ├─ BC02 (Intermediate): 2 công             │
│ └─ Tổng tuần: 5 công │ Tháng: 18.5 công    │
│                                             │
│ John Smith (T-TM01) · Giáo viên            │
│ ├─ BC02 (Intermediate): 3 công             │
│ ├─ BC03 (Advanced): 2.5 công               │
│ └─ Tổng tuần: 5.5 │ Tháng: 21 công         │
│                                             │
│ Lê Thị Ngân (O-TM01) · Văn phòng          │
│ └─ Tổng tuần: 5 công │ Tháng: 22 công      │
│                                             │
│ ─── Tổng chi nhánh ────────────────────     │
│ Teaching: 10.5 công │ VP: 5 công            │
│ Tổng: 15.5 công                             │
└─────────────────────────────────────────────┘
```

## Approach: Shared Component + Server Action

### Architecture

```
[Server Action]                  [Shared Component]         [Mount Points]
getAttendanceSummary() ─────→ <AttendanceSummaryCards> ──→ /attendance (tab)
  ├─ attendance + class_schedules                     ──→ /payroll/[period]
  ├─ office_attendance                                ──→ /my-attendance
  └─ GROUP BY employee, class
```

### Data Query Design

**SQL logic** (attendance table for teaching staff):
```sql
SELECT
  a.employee_id,
  e.full_name,
  e.employee_code,
  e.position,
  cs.class_code,
  cs.class_name,
  SUM(CASE
    WHEN a.status = '1' THEN 1
    WHEN a.status = '0.5' THEN 0.5
    ELSE 0
  END) AS sessions
FROM attendance a
  JOIN class_schedules cs ON a.schedule_id = cs.id
  JOIN employees e ON a.employee_id = e.id
WHERE a.date BETWEEN :start AND :end
  AND cs.branch_id = :branchId
GROUP BY a.employee_id, e.full_name, e.employee_code, e.position, cs.class_code, cs.class_name
ORDER BY e.employee_code, cs.class_code
```

**SQL logic** (office_attendance for VP staff):
```sql
SELECT
  oa.employee_id,
  e.full_name,
  e.employee_code,
  e.position,
  NULL AS class_code,
  NULL AS class_name,
  SUM(CASE
    WHEN oa.status = '1' THEN 1
    WHEN oa.status = '0.5' THEN 0.5
    ELSE 0
  END) AS sessions
FROM office_attendance oa
  JOIN employees e ON oa.employee_id = e.id
WHERE oa.date BETWEEN :start AND :end
  AND oa.branch_id = :branchId
GROUP BY oa.employee_id, e.full_name, e.employee_code, e.position
```

**Cộng dồn tháng**: Chạy cùng query với date range = ngày 1 → cuối tháng, trả parallel.

### Return Type

```typescript
interface AttendanceSummaryItem {
  employee_id: string
  employee_code: string
  full_name: string
  position: string // 'teacher' | 'assistant' | 'office' | 'admin'
  classes: {
    class_code: string
    class_name: string
    sessions: number // 0.5 granularity
  }[]
  total_week: number
  total_month: number
}
```

### File Plan

| File | Action | Purpose |
|------|--------|---------|
| `lib/actions/attendance-summary-actions.ts` | NEW | `getAttendanceSummary(branchId, weekStart)` + `getMyAttendanceSummary(weekStart)` |
| `components/attendance/attendance-summary-cards.tsx` | NEW | Shared card-list component |
| `app/(dashboard)/attendance/page.tsx` | EDIT | Add "Tổng hợp" tab |
| `app/(dashboard)/payroll/[period]/page.tsx` | EDIT | Add collapsible summary panel |
| `components/my-attendance/my-attendance-summary.tsx` | NEW or EDIT | Employee portal version (own data only) |

### Role-based Rendering

| Role | Vị trí | Dữ liệu |
|------|--------|----------|
| admin | `/attendance` tab + `/payroll` panel | Tất cả NV chi nhánh |
| branch_manager | `/attendance` tab | NV chi nhánh mình |
| accountant | `/payroll/[period]` panel | Tất cả NV (view-only reference) |
| employee | `/my-attendance` | Chỉ công mình theo lớp |

### Performance Considerations

- **2 queries chạy song song**: week + month range (Promise.all)
- **No N+1**: JOIN employees + class_schedules in single query, GROUP BY
- **RLS compatible**: Supabase RLS on attendance/office_attendance đã có sẵn
- **Cache**: Không cần — data nhẹ (~50 rows max per branch)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Employee assigned to lớp mới mid-week | Missing sessions | OK — query counts actual attendance records, not schedules |
| Tuần cross month boundary (VD: 28/3 → 3/4) | Tháng nào? | Cộng dồn theo tháng lịch (1→cuối tháng), tuần giữ nguyên 7 ngày |
| VP staff không có class_code | Hiện sao? | 1 dòng tổng, không phân lớp. Card hiện "Văn phòng" thay vì lớp |
| Large branch (50+ employees) | UI performance | Card list đã lazy — ít render. Max ~100 cards with class breakdown |

## Success Criteria

1. BM mở `/attendance` → tab "Tổng hợp" → thấy tất cả NV + lớp + công tuần + tháng
2. Kế toán mở `/payroll/[period]` → panel collapse "Tổng hợp công" → đối chiếu với payslip
3. Employee mở `/my-attendance` → thấy công mình theo từng lớp
4. Số liệu khớp 100% với payroll session counter (`countTeachingSessions`)
5. VP staff hiện tổng công (không phân lớp)

## Not In Scope

- Export Excel tổng hợp công (có thể thêm sau)
- Chart/biểu đồ xu hướng
- So sánh tháng trước

## Next Steps

1. Tạo implementation plan (phase files)
2. Implement server action + component
3. Mount ở 3 vị trí
4. Test đối chiếu với payroll session counter
