# Phase 2: Class Schedules + Attendance

## Context Links

- [Brainstorm V2 — Attendance Redesign](../reports/brainstorm-260305-v2-attendance-redesign.md)
- [Brainstorm V5 — Class Schedule Separation](../reports/brainstorm-260306-class-schedule-attendance-separation.md)
- [Brainstorm — 18 Optimizations](../reports/brainstorm-optimizations.md) — Optimizations A, C, D, E, F
- [UI Mockups](../visuals/hrm-ui-mockups-attendance-payroll.md) — Screens 1-4, 11, 13
- [System Architecture](../../docs/system-architecture.md) — Tables 3-6, data flow
- [Code Standards](../../docs/code-standards.md) — File paths for attendance, class-schedules

## Overview

- **Priority:** P0 (Core feature, feeds payroll)
- **Status:** Pending
- **Effort:** 2-3 days
- **Description:** Class schedule CRUD, class-based weekly attendance grid (GV/TG), office daily attendance grid (VP), employee weekly notes, auto-fill, save/lock, diff view, conflict detection, weekend reminder cron.

## Key Insights

- Class schedules are the foundation: 1 record = 1 class with `days_of_week INT[]` array
- Attendance grid auto-generated from class_schedules — BM only marks exceptions
- Two separate tracks: `attendance` (class-based) and `office_attendance` (daily)
- `days_of_week` uses INT array: [2,4,6] = Monday(2), Wednesday(4), Friday(6). 1=Sunday...7=Saturday. OR use ISO: 1=Monday...7=Sunday. **Decision: ISO convention** (1=Mon, 7=Sun)
- Auto-fill "1" on frontend: grid cells with matching schedule day = "1" by default
- Employee weekly notes are per-employee structured items, not free-text per week
- Week start = Monday (ISO standard)

## Requirements

### Functional
1. **Class Schedule CRUD** — Admin/BM create classes: class_code, class_name, shift_time, days_of_week[], teacher_id, assistant_id, status
2. **Employee code lookup** — Type employee code (E01) in class schedule form → auto-fill name, position, rate
3. **Weekly attendance grid (class-based)** — Rows = class×position (GV/TG), columns = T2-CN. Auto-fill "1" for scheduled days, gray for unscheduled
4. **Office attendance grid (daily)** — Rows = VP employees, columns = T2-CN. Default "1" for work days (Mon-Sat)
5. **Status input** — Click/type to cycle: 1 → 0 → KP → 0.5 → 1
6. **Week selector** — Forward/back navigation (Mon-Sun)
7. **Employee weekly notes** — Per-employee structured notes (type: substitute/bonus/penalty/extra_job/general)
8. **Save button** — Batch save all attendance changes for the week
9. **Lock mechanism** — Auto-lock weeks older than 3 days from next Monday. Admin can unlock.
10. **Diff view** — Before save, show list of changed cells
11. **Conflict detection** — Highlight when teacher scheduled in 2+ classes at same time on same day
12. **Weekend reminder** — Cron job Saturday evening if week not saved

### Non-Functional
- Grid loads < 2s for 100 rows
- Keyboard navigation: Tab between cells, type status directly
- Color-coded cells: green(1), blue(0), red(KP), yellow(0.5), gray(disabled)

## Architecture

### Data Flow: Class Schedule → Attendance Grid
```
class_schedules (setup once)
    ├── class_code, shift_time, days_of_week[2,4,6]
    ├── teacher_id → employees.id
    └── assistant_id → employees.id
         │
         ▼
Weekly Attendance Grid (auto-generated)
    Row 1: IELTS A1 | GV | E01 | T2[1] T3[░] T4[1] T5[░] T6[1]
    Row 2: IELTS A1 | TG | E08 | T2[1] T3[░] T4[1] T5[░] T6[1]
    Row 3: Kids 1   | GV | E05 | T2[1] T3[1] T4[░] T5[1] T6[1]
    ...
         │
         ▼
BM edits exceptions only → saves to `attendance` table
```

### Grid Generation Algorithm
```
1. Fetch active class_schedules for branch
2. For each schedule, generate 2 rows (teacher + assistant)
3. For each row, 7 columns (Mon-Sun)
4. If day_of_week is in schedule.days_of_week → enable cell, default "1"
5. If day_of_week NOT in schedule.days_of_week → disable cell (gray)
6. Overlay existing attendance records (load from DB for this week)
7. Changed cells tracked in React state, batch saved on "Luu tuan"
```

### Conflict Detection SQL
```sql
-- Find teachers scheduled in 2+ classes at same time, same day
SELECT e.employee_code, e.first_name, cs.shift_time,
       array_agg(cs.class_code) as conflicting_classes,
       unnest(cs.days_of_week) as day
FROM class_schedules cs
JOIN employees e ON cs.teacher_id = e.id OR cs.assistant_id = e.id
WHERE cs.status = 'active' AND cs.branch_id = $1
GROUP BY e.id, cs.shift_time, day
HAVING count(*) > 1;
```

## Related Code Files

### Files to Create

**Routes:**
- `app/(dashboard)/class-schedules/page.tsx` — Class schedule management
- `app/(dashboard)/attendance/page.tsx` — Class-based attendance grid
- `app/(dashboard)/office-attendance/page.tsx` — Office staff daily grid

**Components — Class Schedules:**
- `components/class-schedules/class-schedule-table.tsx` — Data table
- `components/class-schedules/class-schedule-form.tsx` — Create/edit dialog
- `components/class-schedules/employee-code-lookup.tsx` — Auto-complete input

**Components — Attendance:**
- `components/attendance/attendance-grid.tsx` — Weekly class-based grid
- `components/attendance/attendance-cell.tsx` — Individual cell (status cycling)
- `components/attendance/attendance-week-selector.tsx` — Week picker (< >)
- `components/attendance/attendance-legend.tsx` — Status color legend
- `components/attendance/attendance-diff-dialog.tsx` — Changes preview before save
- `components/attendance/attendance-summary.tsx` — Per-employee totals row
- `components/attendance/attendance-notes-panel.tsx` — Weekly notes section

**Components — Office Attendance:**
- `components/office-attendance/office-attendance-grid.tsx` — Daily VP grid

**Server Actions:**
- `lib/actions/class-schedule-actions.ts` — CRUD class schedules
- `lib/actions/attendance-actions.ts` — Mark attendance, fetch grid, save batch, lock week
- `lib/actions/office-attendance-actions.ts` — Mark VP attendance, fetch grid
- `lib/actions/weekly-notes-actions.ts` — CRUD employee weekly notes

**Services:**
- `lib/services/attendance-grid-service.ts` — Grid generation logic, conflict detection

**Types:**
- `lib/types/class-schedule.ts` — ClassSchedule, ClassScheduleForm interfaces
- `lib/types/attendance.ts` — AttendanceRecord, AttendanceStatus, AttendanceGridRow, WeeklyNote

**Utils:**
- `lib/utils/date-helpers.ts` — getWeekStart, getWeekEnd, getWeekDates, formatWeekRange

**Cron:**
- `app/api/cron/weekly-reminder/route.ts` — Saturday reminder notification

## Implementation Steps

### Step 1: Types & Utils
1. Create `lib/types/class-schedule.ts`:
   ```typescript
   export interface ClassSchedule {
     id: string; branch_id: string; class_code: string; class_name: string;
     shift_time: string; days_of_week: number[]; // 1=Mon, 7=Sun
     teacher_id: string; assistant_id: string; status: 'active' | 'inactive';
   }
   ```
2. Create `lib/types/attendance.ts`:
   ```typescript
   export type AttendanceStatus = '1' | '0' | 'KP' | '0.5'
   export interface AttendanceGridRow {
     scheduleId: string; classCode: string; className: string; shiftTime: string;
     role: 'GV' | 'TG'; employeeId: string; employeeCode: string; employeeName: string;
     cells: Record<number, { status: AttendanceStatus | null; isScheduled: boolean; existingId?: string }>
   }
   ```
3. Create `lib/utils/date-helpers.ts` — getWeekStart(date), getWeekEnd(date), getWeekDates(weekStart), formatWeekRange, isWeekLocked(weekStart)

### Step 2: Class Schedule CRUD
1. Create `lib/actions/class-schedule-actions.ts`:
   - `getClassSchedules(branchId, status?)` — fetch with teacher/assistant JOIN
   - `createClassSchedule(data)` — insert with validation (unique class_code per branch)
   - `updateClassSchedule(id, data)` — update fields
   - `deactivateClassSchedule(id)` — set status='inactive'
   - `lookupEmployeeByCode(branchId, code)` — return name, position, rate
2. Create `components/class-schedules/class-schedule-table.tsx` — shadcn Table showing all classes
3. Create `components/class-schedules/class-schedule-form.tsx`:
   - Fields: class_code, class_name, shift_time, days_of_week (checkboxes T2-CN), teacher (code lookup), assistant (code lookup)
   - Validation: class_code unique, teacher must be position='teacher', assistant must be position='assistant'
4. Create `components/class-schedules/employee-code-lookup.tsx`:
   - Input field: type "E01" → debounce 300ms → query → show name + position
5. Create `app/(dashboard)/class-schedules/page.tsx` — table + create button + form dialog

### Step 3: Attendance Grid Service
1. Create `lib/services/attendance-grid-service.ts`:
   - `generateAttendanceGrid(branchId, weekStart)`:
     a. Fetch active class_schedules for branch
     b. For each schedule, create 2 rows (teacher + assistant)
     c. For each row, 7 cells (Mon=1 to Sun=7)
     d. Mark cell.isScheduled = schedule.days_of_week.includes(dayNumber)
     e. Default status = '1' for scheduled cells, null for unscheduled
     f. Overlay existing attendance records from DB
   - `detectConflicts(branchId)`:
     a. Find employees assigned to 2+ classes at same shift_time on same day
     b. Return array of conflict objects: { employeeId, day, shiftTime, classes[] }
   - `calculateWeekSummary(gridRows)`:
     a. Group by employee → count sessions, absences, KP

### Step 4: Attendance Grid UI
1. Create `components/attendance/attendance-cell.tsx`:
   - Click to cycle: 1→0→KP→0.5→1
   - Keyboard: type '1', '0', 'k' (KP), 'h' (0.5)
   - Color: green(1), blue(0), red(KP), yellow(0.5), gray(disabled)
   - Disabled for unscheduled days
2. Create `components/attendance/attendance-grid.tsx`:
   - Table header: Lop | Ca | Vi tri | Ma | Ten VN | T2 | T3 | T4 | T5 | T6 | T7 | CN | Tong
   - Rows from grid service
   - Track dirty cells in React state
   - Save button: batch upsert all dirty cells
3. Create `components/attendance/attendance-week-selector.tsx`:
   - Shows "02/03 - 08/03/2026"
   - Left/right arrows to navigate weeks
   - Locked indicator for past weeks
4. Create `components/attendance/attendance-legend.tsx` — color legend strip
5. Create `components/attendance/attendance-diff-dialog.tsx`:
   - Before save, show list: "E02 T3: 1→KP", "E04 T5: 1→0"
   - Confirm/cancel
6. Create `components/attendance/attendance-summary.tsx` — totals per employee

### Step 5: Attendance Server Actions
1. Create `lib/actions/attendance-actions.ts`:
   - `getAttendanceGrid(branchId, weekStart)` — calls grid service
   - `saveAttendanceBatch(records: { scheduleId, employeeId, date, status }[])` — upsert
   - `lockWeek(branchId, weekStart)` — mark week as locked (via metadata or lock table)
   - `getWeekLockStatus(branchId, weekStart)` — check if locked
2. Create `app/(dashboard)/attendance/page.tsx`:
   - Server component: fetch initial grid data
   - Client component: interactive grid with save/lock

### Step 6: Office Attendance Grid
1. Create `lib/actions/office-attendance-actions.ts`:
   - `getOfficeAttendanceGrid(branchId, weekStart)` — fetch VP employees, overlay existing records
   - `saveOfficeAttendanceBatch(records)` — upsert to office_attendance table
2. Create `components/office-attendance/office-attendance-grid.tsx`:
   - Simpler grid: employee×day (no class/shift columns)
   - Default "1" for Mon-Sat, gray for Sun (configurable)
   - Same cell behavior as class-based grid
3. Create `app/(dashboard)/office-attendance/page.tsx` — page wrapper

### Step 7: Employee Weekly Notes
1. Create `lib/actions/weekly-notes-actions.ts`:
   - `getWeeklyNotes(branchId, weekStart, employeeId?)` — fetch notes
   - `createWeeklyNote(data)` — insert structured note
   - `updateWeeklyNote(id, data)` — edit note
   - `deleteWeeklyNote(id)` — remove note
   - `markNoteProcessed(id, processedBy)` — accountant marks as processed
2. Create `components/attendance/attendance-notes-panel.tsx`:
   - List notes grouped by type (substitute, bonus, penalty, extra_job, general)
   - Add note form: select employee, select type, enter description, optional amount
   - Editable inline

### Step 8: Auto-Lock & Reminder Cron
1. Implement auto-lock logic in attendance-actions:
   - On page load, calculate if current week is > 3 days past → return locked=true
   - Locked weeks: all cells read-only, save button disabled
2. Create `app/api/cron/weekly-reminder/route.ts`:
   - Triggered Saturday evening via external cron (curl)
   - Check which branches have unsaved weeks → log/notify
   - Secured with CRON_SECRET header

### Step 9: Conflict Detection
1. In grid service, run conflict detection query on page load
2. If conflicts found, display Alert banner above grid
3. Conflicting cells highlighted with red ring

### Step 10: Verify & Build
1. Run `npm run build`
2. Test: create 5 classes, generate attendance grid, save, lock, diff view
3. Test: office attendance for 3 VP staff
4. Test: weekly notes CRUD, accountant processing
5. Test: conflict detection when teacher assigned to 2 classes same time

## Todo List

- [ ] Create types for class schedules and attendance
- [ ] Create date helper utilities
- [ ] Build class schedule CRUD (actions + UI)
- [ ] Build employee code lookup component
- [ ] Build attendance grid generation service
- [ ] Build attendance cell component (status cycling, colors)
- [ ] Build weekly attendance grid (class-based)
- [ ] Build week selector navigation
- [ ] Build diff dialog (preview changes before save)
- [ ] Build attendance batch save action
- [ ] Build office attendance grid (VP staff)
- [ ] Build employee weekly notes panel
- [ ] Implement auto-lock mechanism
- [ ] Implement conflict detection and highlighting
- [ ] Build attendance summary row (per-employee totals)
- [ ] Create weekend reminder cron endpoint
- [ ] Test grid with 20+ classes
- [ ] `npm run build` passes

## Success Criteria

- Class schedule CRUD works: create, edit, deactivate classes
- Attendance grid auto-generated from class_schedules with correct days
- Auto-fill "1" works for all scheduled cells
- Cell editing cycles through statuses with correct colors
- Diff dialog shows changes before save
- Batch save works (upsert all changed cells)
- Auto-lock prevents editing weeks older than 3 days
- Office attendance grid renders VP staff correctly
- Weekly notes CRUD works with typed notes
- Conflict detection highlights overlapping schedules
- Grid loads < 2s with 20+ classes

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Grid performance with 30+ classes | Medium | Virtual scrolling if needed, pagination at 50 rows |
| days_of_week INT[] Supabase handling | Low | Use PostgreSQL array syntax, test with @supabase/js |
| Auto-lock timing edge cases | Medium | Lock by comparing weekStart + 10 days vs current date |
| Conflict detection false positives | Low | Match exact shift_time strings, not overlapping ranges |

## Security Considerations

- Class schedule CRUD: admin + BM (own branch only via RLS)
- Attendance marking: BM (own branch only via RLS)
- Office attendance: BM (own branch only via RLS)
- Weekly notes: BM creates (own branch), accountant views/processes (all)
- Employee: read-only view of own attendance (Phase 5)

## Next Steps

- Phase 3: Payroll reads sessions_worked from attendance data
- Phase 4: KPI form for teaching assistants
- Attendance summary feeds directly into payroll calculation
