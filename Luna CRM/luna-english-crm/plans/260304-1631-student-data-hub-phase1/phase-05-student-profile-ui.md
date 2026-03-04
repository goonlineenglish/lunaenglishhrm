# Phase 5: Student Profile UI Enhancement

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 3 (actions), Phase 2 (types/constants)
- Current: 13 student components in `components/students/`

## Overview
- **Priority**: P2
- **Status**: Pending
- **Description**: Enhance student detail sheet with tabs, add new columns to data table, create learning path display

## Key Insights
- student-detail-sheet.tsx already shows basic info via lead JOIN
- Need tabs: Hồ sơ (existing) | Lộ trình | Điểm danh | Điểm số
- Phase 2 data tables will be empty — tabs show "Chưa có dữ liệu" placeholder
- Learning path tab can populate from program constants (sessions/levels known)
- student-columns.tsx defines TanStack table columns — add 3 new ones

## Related Code Files
- **Modify**:
  - `components/students/student-detail-sheet.tsx` — add tab navigation
  - `components/students/student-detail-info.tsx` — show new fields (DOB, gender, address, teacher, payment)
  - `components/students/student-columns.tsx` — add program, teacher, payment columns
- **Create**:
  - `components/students/student-learning-path-tab.tsx` — visual level/session progress
  - `components/students/student-attendance-tab.tsx` — attendance list (placeholder for Phase 2)
  - `components/students/student-scores-tab.tsx` — scores/homework list (placeholder for Phase 2)

## Implementation Steps

### 1. Update student-detail-info.tsx
- Add display rows for: Ngày sinh, Giới tính, Địa chỉ, GV phụ trách, Học phí, Trạng thái TT, Chương trình
- Use Vietnamese labels
- Format tuition as VND (Intl.NumberFormat)
- Show payment status with color badge (paid=green, partial=yellow, unpaid=red, overdue=red-bold)

### 2. Update student-detail-sheet.tsx
- Add Tabs component (shadcn/ui) with 4 tabs:
  - "Hồ sơ" — existing student-detail-info
  - "Lộ trình học" — student-learning-path-tab
  - "Điểm danh" — student-attendance-tab
  - "Điểm số" — student-scores-tab
- Fetch learning path data when tab selected (lazy load)

### 3. Create student-learning-path-tab.tsx
- Fetch learning_path for student via getLearningPath action
- Display: program name, current level/total, session progress bar
- Show milestones timeline (if any)
- Empty state: "Chưa có lộ trình học — Thêm từ trang hồ sơ"
- Button: "Thiết lập lộ trình" → opens dialog to select program + starting level

### 4. Create student-attendance-tab.tsx
- Fetch attendance_records for student (will be empty until Phase 2)
- Table: Ngày | Trạng thái | Ghi chú
- Summary: X% có mặt (Y/Z buổi)
- Empty state: "Chưa có dữ liệu điểm danh — Dữ liệu sẽ được đồng bộ tự động"

### 5. Create student-scores-tab.tsx
- Two sections: Điểm số (scores table) + Bài tập (homework table)
- Scores: Tên bài | Điểm | Ngày
- Homework: Tên bài | Đã nộp | Hạn nộp
- Empty state: "Chưa có dữ liệu — Dữ liệu sẽ được đồng bộ tự động"

### 6. Update student-columns.tsx
- Add 3 columns after existing ones:
  - Chương trình (program_type → Vietnamese label from constants)
  - GV phụ trách (teacher_name)
  - Thanh toán (payment_status → colored badge)
- Keep columns toggleable (existing pattern)

## Todo List
- [ ] Update student-detail-info.tsx (new fields display)
- [ ] Update student-detail-sheet.tsx (add tabs)
- [ ] Create student-learning-path-tab.tsx
- [ ] Create student-attendance-tab.tsx
- [ ] Create student-scores-tab.tsx
- [ ] Update student-columns.tsx (3 new columns)
- [ ] Verify all components render without errors
- [ ] `npm run build` passes

## Success Criteria
- Student detail shows all 18 fields
- 4 tabs work (Hồ sơ, Lộ trình, Điểm danh, Điểm số)
- Data table shows program, teacher, payment columns
- Empty states display properly for Phase 2 data
- All Vietnamese labels correct
- No runtime errors

## Risk Assessment
- Tab lazy loading: fetching data on tab switch may cause flicker. Mitigate: loading skeleton
- student-detail-sheet.tsx may exceed 200 lines with tabs. Mitigate: each tab is separate component
