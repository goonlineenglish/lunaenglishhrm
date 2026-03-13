# Phase 7: Polish + Localization

## Context Links

- [Brainstorm — 18 Optimizations](../reports/brainstorm-optimizations.md) — Optimizations P, Q, R, S
- [Code Standards](../../docs/code-standards.md) — messages.ts, keyboard shortcuts pattern
- [Design Guidelines](../../docs/design-guidelines.md) — Vietnamese labels, accessibility

## Overview

- **Priority:** P2 (Final refinement)
- **Status:** Pending
- **Effort:** 1 day
- **Description:** Complete Vietnamese UI labels, keyboard shortcuts for attendance grid, Excel import for class_schedules, Excel export for payroll, audit log system, code cleanup, TypeScript strict mode verification.

## Key Insights

- All UI labels must be Vietnamese (no English visible to end users)
- Keyboard shortcuts essential for BM productivity in attendance grid (Tab/Enter/1/0/KP)
- Excel import/export uses xlsx library (sheetjs) — lightweight, no server dependencies
- Audit log = simple `audit_logs` table recording who changed what when
- Code cleanup: ensure all files < 200 lines, no unused imports, consistent formatting

## Requirements

### Functional
1. **Vietnamese UI labels** — Complete messages.ts with all modules (attendance, payroll, KPI, employees, evaluations, auth)
2. **Keyboard shortcuts** — Attendance grid: Tab (next cell), Enter (confirm), 1/0/K/H (set status), Ctrl+S (save)
3. **Excel import** — Import class_schedules from .xlsx file (drag-and-drop or file picker)
4. **Excel export** — Export payroll period to .xlsx (columns matching current Excel template)
5. **Audit log** — Record all mutations: table, action (create/update/delete), user, timestamp, old/new values
6. **Code cleanup** — TypeScript strict, no unused vars, consistent formatting, all files < 200 lines

### Non-Functional
- Import handles 50+ class schedules
- Export generates < 5 seconds for 200 employees
- Audit log doesn't degrade performance (async insert)

## Architecture

### Audit Log Design
```sql
-- New table (17th table)
audit_logs
├── id: UUID (PK)
├── table_name: TEXT
├── record_id: UUID
├── action: TEXT ('INSERT' | 'UPDATE' | 'DELETE')
├── old_data: JSONB (nullable — null for INSERT)
├── new_data: JSONB (nullable — null for DELETE)
├── user_id: UUID (FK → auth.users)
├── user_email: TEXT (denormalized for quick reference)
├── ip_address: TEXT (nullable)
├── created_at: TIMESTAMP DEFAULT now()

Index: (table_name, created_at), (user_id, created_at)
RLS: admin SELECT only; no one else
```

### Excel Import Flow
```
BM uploads .xlsx file
    ↓
Client-side parsing (sheetjs)
    ↓
Validate: class_code unique, teacher/assistant exist, days_of_week valid
    ↓
Preview table with validation status
    ↓
Confirm → batch insert via server action
```

### Excel Export Flow
```
Accountant clicks "Xuat Excel"
    ↓
Server action: fetch payslips for period
    ↓
Format as xlsx (sheetjs on client or server)
    ↓
Download .xlsx file
```

## Related Code Files

### Files to Create

**Audit Log:**
- `supabase/migrations/004_audit_logs.sql` — Create audit_logs table + RLS
- `lib/services/audit-log-service.ts` — Log function called from server actions
- `app/(dashboard)/audit-log/page.tsx` — Admin audit log viewer (optional)
- `components/shared/audit-log-table.tsx` — Filterable log table (optional)

**Vietnamese Labels:**
- `lib/constants/messages.ts` — Complete Vietnamese labels for all modules (update existing)

**Keyboard Shortcuts:**
- `lib/hooks/use-keyboard-shortcuts.ts` — Global keyboard shortcut handler
- Update `components/attendance/attendance-grid.tsx` — Add keyboard event handlers

**Excel Import:**
- `components/class-schedules/excel-import-dialog.tsx` — File picker + preview + confirm
- `lib/utils/excel-parser.ts` — Parse .xlsx to ClassSchedule[] using sheetjs

**Excel Export:**
- `components/payroll/excel-export-button.tsx` — Export button + download trigger
- `lib/utils/excel-export.ts` — Generate .xlsx from payslip data

**Dependencies:**
- Add `xlsx` package (sheetjs) for Excel handling

### Files to Modify
- `lib/actions/class-schedule-actions.ts` — Add batch import action
- `lib/actions/payroll-actions.ts` — Add export data action
- `lib/actions/attendance-actions.ts` — Add audit logging
- `lib/actions/employee-actions.ts` — Add audit logging
- All other action files — Add audit logging calls
- `components/attendance/attendance-grid.tsx` — Add keyboard navigation
- `lib/constants/messages.ts` — Complete all labels

## Implementation Steps

### Step 1: Complete Vietnamese Labels
1. Update `lib/constants/messages.ts` with comprehensive labels:
   ```typescript
   export const MESSAGES = {
     COMMON: { SAVE: 'Luu', CANCEL: 'Huy', DELETE: 'Xoa', EDIT: 'Chinh sua', CREATE: 'Tao moi',
               CONFIRM: 'Xac nhan', SEARCH: 'Tim kiem', FILTER: 'Loc', EXPORT: 'Xuat', IMPORT: 'Nhap',
               LOADING: 'Dang tai...', ERROR: 'Da xay ra loi', SUCCESS: 'Thanh cong', },
     AUTH: { LOGIN: 'Dang nhap', LOGOUT: 'Dang xuat', EMAIL: 'Email', PASSWORD: 'Mat khau',
             FORGOT_PASSWORD: 'Quen mat khau', RESET_PASSWORD: 'Dat lai mat khau', },
     ATTENDANCE: { TITLE: 'Cham cong', OFFICE_TITLE: 'Cham cong VP', WEEK: 'Tuan',
                   SAVE_WEEK: 'Luu tuan', LOCK_WEEK: 'Khoa tuan', LOCKED: 'Da khoa',
                   STATUS_PRESENT: 'Di day', STATUS_ABSENT: 'Vang co phep',
                   STATUS_NO_PERMISSION: 'Vang khong phep', STATUS_HALF: 'Nua buoi',
                   TOTAL_SESSIONS: 'Tong buoi', NOTES: 'Ghi chu', },
     CLASS_SCHEDULES: { TITLE: 'Thoi Khoa Bieu', CLASS_CODE: 'Ma lop', CLASS_NAME: 'Ten lop',
                        SHIFT_TIME: 'Ca hoc', DAYS: 'Ngay hoc', TEACHER: 'Giao vien',
                        ASSISTANT: 'Tro giang', },
     PAYROLL: { TITLE: 'Tinh luong', PERIOD: 'Ky luong', GROSS: 'Luong brutto',
                NET: 'Luong thuc lanh', CALCULATE: 'Tinh tu dong',
                CONFIRM: 'Xac nhan luong', SEND_EMAIL: 'Gui email phieu luong',
                UNDO: 'Hoan tac', SESSIONS: 'So buoi', RATE: 'Don gia',
                SUBSTITUTE: 'Day thay', ALLOWANCE: 'Phu cap', PENALTY: 'Phat',
                BHXH: 'BHXH (8%)', BHYT: 'BHYT (1.5%)', BHTN: 'BHTN (1%)',
                TNCN: 'Thue TNCN', },
     KPI: { TITLE: 'KPI Tro giang', SCORE: 'Diem', BONUS: 'Thuong',
            EVALUATED: 'Da danh gia', PENDING: 'Chua danh gia',
            PREFILL: 'Du lieu sao chep tu thang truoc — vui long xem lai', },
     EMPLOYEES: { TITLE: 'Nhan vien', PROFILE: 'Ho so', CODE: 'Ma NV',
                  NAME: 'Ho ten', POSITION: 'Vi tri', BRANCH: 'Co so',
                  TEACHER: 'Giao vien', ASSISTANT: 'Tro giang', OFFICE: 'Van phong',
                  STATUS_ACTIVE: 'Dang lam viec', STATUS_INACTIVE: 'Nghi viec', },
     EVALUATIONS: { TITLE: 'Danh gia', TEMPLATE: 'Mau danh gia', PERIOD: 'Ky danh gia',
                    CRITERIA: 'Tieu chi', SCORE: 'Diem', NOTES: 'Nhan xet',
                    AD_HOC: 'Danh gia dot xuat', PERIODIC: 'Danh gia dinh ky', },
     NOTES: { TITLE: 'Ghi chu', PRAISE: 'Khen ngoi', WARNING: 'Canh bao',
              OBSERVATION: 'Nhan xet', GENERAL: 'Chung', },
     BRANCHES: { TITLE: 'Co so', NAME: 'Ten co so', ADDRESS: 'Dia chi', MANAGER: 'Quan ly', },
   }
   ```
2. Replace all hardcoded strings in components with MESSAGES constants

### Step 2: Keyboard Shortcuts
1. Create `lib/hooks/use-keyboard-shortcuts.ts`:
   - Register shortcuts: Tab (next cell), Shift+Tab (prev), Enter (confirm edit), Escape (cancel)
   - Number keys: 1 (present), 0 (absent), K (KP), H (half/0.5)
   - Ctrl+S (save week)
   - Only active when attendance grid is focused
2. Update `components/attendance/attendance-grid.tsx`:
   - Add tabIndex to cells for keyboard navigation
   - Track focused cell in state
   - Arrow keys: move between cells
   - Direct key input changes cell status

### Step 3: Audit Log System
1. Create `supabase/migrations/004_audit_logs.sql`:
   - CREATE TABLE audit_logs (schema above)
   - Enable RLS: admin SELECT only
2. Create `lib/services/audit-log-service.ts`:
   ```typescript
   export async function logAudit(params: {
     tableName: string; recordId: string; action: 'INSERT' | 'UPDATE' | 'DELETE';
     oldData?: Record<string, unknown>; newData?: Record<string, unknown>;
   }): Promise<void>
   ```
   - Inserts into audit_logs with current user from Supabase auth
   - Runs async (don't block main operation on log failure)
3. Add `logAudit()` calls to key server actions:
   - attendance-actions: save, lock
   - employee-actions: create, update
   - payroll-actions: calculate, confirm, undo
   - kpi-actions: save evaluation
   - class-schedule-actions: create, update, deactivate
4. Optionally: create admin audit log viewer page (low priority)

### Step 4: Excel Import (Class Schedules)
1. Install `xlsx` package: `npm install xlsx`
2. Create `lib/utils/excel-parser.ts`:
   - `parseClassScheduleExcel(file: File): ParseResult`
   - Expected columns: Ma Lop, Ten Lop, Ca Hoc, Ngay Hoc (comma-separated: T2,T4,T6), Ma GV, Ma TG
   - Validate: class_code unique, days valid (T2-CN), employee codes exist
   - Return: valid rows + error rows
3. Create `components/class-schedules/excel-import-dialog.tsx`:
   - File drop zone or picker
   - Parse on upload → show preview table
   - Green rows = valid, Red rows = errors with message
   - "Nhap X lop" button (import valid rows only)
4. Add batch import action to `lib/actions/class-schedule-actions.ts`:
   - `batchImportClassSchedules(schedules: ClassScheduleInput[])` — insert multiple

### Step 5: Excel Export (Payroll)
1. Create `lib/utils/excel-export.ts`:
   - `generatePayrollExcel(payslips: Payslip[], periodName: string): Blob`
   - Columns matching real Excel template: STT, Ma, Ten, Buoi, Don gia, Luong buoi, Day thay, KPI, Phu cap, GROSS, BHXH, BHYT, BHTN, TNCN, Phat, NET
   - 3 sheets: "Tro giang", "Giao vien", "Van phong"
   - Header row with Luna branding
   - Summary row at bottom: totals
2. Create `components/payroll/excel-export-button.tsx`:
   - "Xuat Excel" button on payroll period page
   - Click → generate xlsx → trigger browser download

### Step 6: Code Cleanup
1. Run `npx tsc --noEmit` — fix all TypeScript errors
2. Run `npm run lint` — fix linting issues
3. Check all files < 200 lines — split oversized files
4. Remove unused imports and variables
5. Ensure consistent error handling (try/catch in all actions)
6. Verify `npm run build` passes clean

### Step 7: Final Integration Test
1. Full workflow: create branch → create employees → create class schedules → mark attendance → calculate payroll → KPI → email → export Excel
2. Test all 4 roles end-to-end
3. Test mobile PWA
4. Test keyboard shortcuts in attendance grid
5. Test Excel import with real data
6. Verify Vietnamese labels throughout

## Todo List

- [ ] Complete Vietnamese labels in messages.ts
- [ ] Replace all hardcoded strings with MESSAGES constants
- [ ] Implement keyboard shortcuts for attendance grid
- [ ] Create audit_logs table + migration
- [ ] Implement audit log service
- [ ] Add audit logging to key server actions
- [ ] Install xlsx package
- [ ] Build Excel parser for class schedule import
- [ ] Build Excel import dialog with preview + validation
- [ ] Build Excel export for payroll
- [ ] Run TypeScript strict check (fix all errors)
- [ ] Run linting (fix all issues)
- [ ] Verify all files < 200 lines
- [ ] Full integration test (all 7 phases together)
- [ ] `npm run build` passes clean

## Success Criteria

- No English labels visible in UI (all Vietnamese)
- Tab/Enter/1/0/K/H work in attendance grid
- Ctrl+S saves attendance week
- Excel import: 50+ classes imported from .xlsx
- Excel export: downloads .xlsx matching real template format
- Audit log records all key mutations
- TypeScript builds with no errors
- Lint passes clean
- All files < 200 lines
- Full workflow tested end-to-end

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| xlsx package size | Low | Tree-shake, import only needed modules |
| Keyboard shortcuts conflict with browser | Medium | Only activate when grid focused, avoid browser defaults |
| Audit log performance impact | Low | Async inserts, don't block main operations |
| Missing Vietnamese translations | Low | Complete review pass, test with Vietnamese speaker |

## Security Considerations

- Audit log: admin-only access (RLS)
- Excel import: validate all data server-side (client parsing is convenience only)
- Excel export: only accessible to accountant + admin (role check)
- No sensitive data in audit log (avoid storing passwords or tokens)

## Next Steps

- MVP complete after Phase 7
- Deploy to Dell Ubuntu server (see deployment-guide.md)
- User acceptance testing with real data
