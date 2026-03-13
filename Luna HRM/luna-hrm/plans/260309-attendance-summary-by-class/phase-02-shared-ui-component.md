# Phase 2: Shared UI Component

**Priority:** High
**Status:** ✅ completed
**Effort:** ~30 min (actual: completed)

## Context Links
- Brainstorm mockup: `plans/reports/brainstorm-260309-attendance-summary-by-class.md` → UI Mockup section
- Types: `lib/types/attendance-summary-types.ts` (Phase 1)
- Existing attendance summary: `components/attendance/attendance-summary.tsx` (different — per-week present/absent counts)
- Design: Card/list dọc, user confirmed

## New File

### `components/attendance/attendance-summary-cards.tsx` (NEW, ~120 lines)

**Props:**
```typescript
interface AttendanceSummaryCardsProps {
  items: AttendanceSummaryItem[]
  loading?: boolean
  compact?: boolean // true = payroll panel (collapsed by default)
}
```

**Layout:**
```
┌────────────────────────────────────────────┐
│ Trần Thị Linh (A-TM01) · Trợ giảng       │
│ ├─ BC01 (Beginner A): 3 công              │
│ ├─ BC02 (Intermediate): 2 công            │
│ └─ Tuần: 5 │ Tháng: 18.5                  │
├────────────────────────────────────────────┤
│ Lê Thị Ngân (O-TM01) · Văn phòng         │
│ └─ Tuần: 5 │ Tháng: 22                    │
├────────────────────────────────────────────┤
│ ─── Tổng chi nhánh ───                    │
│ GV: 10.5 │ VP: 5 │ Tổng: 15.5            │
└────────────────────────────────────────────┘
```

**Implementation:**
```
'use client'

1. If loading → skeleton cards (3 shimmer lines)
2. Map items → cards:
   - Header: full_name (employee_code) · position label
   - Body: classes.map → "class_code (class_name): X công"
   - Footer: "Tuần: {total_week} │ Tháng: {total_month}"
   - VP staff (empty classes[]): show only footer totals
3. Footer summary:
   - Group items by teaching vs office
   - Show "GV: X │ VP: Y │ Tổng: Z"
4. Compact mode (payroll): Collapsible with shadcn Collapsible component
```

**Components used:**
- `Card`, `CardContent`, `CardHeader` from shadcn
- `Badge` for position label
- `Collapsible` / `CollapsibleContent` / `CollapsibleTrigger` for compact mode
- `Skeleton` for loading state

**Position labels (Vietnamese):**
```typescript
const POSITION_LABELS: Record<string, string> = {
  teacher: 'Giáo viên',
  assistant: 'Trợ giảng',
  office: 'Văn phòng',
  admin: 'Quản lý',
}
```

## Validation

- [x] Renders card list from AttendanceSummaryItem[]
- [x] Shows class breakdown for teaching staff
- [x] Shows only totals for VP staff
- [x] Shows branch totals footer
- [x] Compact mode: collapsible, default closed
- [x] Loading state: skeleton cards
- [x] Empty state: "Chưa có dữ liệu chấm công"
