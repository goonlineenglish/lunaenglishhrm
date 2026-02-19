# Phase 05: Retention & Students

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 03](./phase-03-lead-pipeline-kanban.md) (lead pipeline, stage transitions)
- Research: [Brainstorm Report](../260218-luna-crm-brainstorm-report.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P2
- **Status:** Pending
- **Effort:** 5h

Build student management: CRUD records, auto-link from enrolled leads, DataTable with filters, renewal tracking with countdown alerts, student statuses (active/paused/graduated/dropped), referral code system, and CSV import from Google Sheets.

## Key Insights

- Student record created when lead reaches ĐÃ ĐĂNG KÝ stage (auto or manual)
- `lead_id` foreign key links student back to original lead for full journey tracking
- Renewal tracking: `level_end_date` - compare to NOW(), alert 2 weeks before
- Student statuses: active, paused (bao luu max 3 months), graduated, dropped
- Referral code format: `LUNA-{PARENT_NAME_INITIALS}` (e.g., LUNA-NVA for Nguyen Van A)
- CSV import critical for onboarding -- Luna has ~95 existing students in Google Sheets
- EasyCheck remains the attendance/grading system; CRM tracks enrollment lifecycle only

## Requirements

### Functional
- Student list page with DataTable (sortable, filterable, paginated)
- Create student manually or auto-create when lead reaches ĐÃ ĐĂNG KÝ
- Edit student details (class, level, status, dates)
- Student detail panel (Sheet: info, linked lead history, renewal status)
- Renewal tracking: show days remaining until level_end_date
- 2-week renewal alert: auto-create follow_up_reminder (type: `renewal`)
- Student statuses with transition rules:
  - active → paused (max 3 months, record pause_date)
  - active → graduated
  - active → dropped (record reason)
  - paused → active (resume, update dates)
- Referral code generation: auto-assign on enrollment
- Referral tracking: new leads with matching referral_code linked to referring student
- CSV import tool: upload CSV, map columns, preview, import

### Non-functional
- DataTable handles 200+ students smoothly (pagination 20/page)
- CSV import supports up to 500 rows
- Renewal alerts don't duplicate (check before creating)

## Architecture

```
Student Creation Flow:
  Lead reaches ĐÃ ĐĂNG KÝ (stage 7)
  → DB trigger or server action
  → Create student record linked to lead (lead_id FK)
  → Generate referral code (LUNA-INITIALS)
  → Auto-create enrollment activity on lead

Student Page:
  /students (Server Component)
  └── Fetch students with joins (lead info, class, renewal status)
      └── <StudentDataTable /> (Client Component)
          ├── Columns: name, class, level, status, renewal countdown, referral code
          ├── Filters: status, class, level
          ├── Row click → <StudentDetailSheet />
          └── Bulk actions: export CSV

Renewal Cron (extend Phase 04 cron):
  Check students WHERE level_end_date - NOW() <= 14 days AND renewal_status = 'pending'
  → Create follow_up_reminder (type: 'renewal') for assigned advisor
  → Create notification

CSV Import Flow:
  Upload CSV → parse headers → column mapping UI → preview rows
  → Validate (required fields, duplicates) → bulk insert → summary
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/students/page.tsx` | Server component: fetch students, render DataTable |
| `app/(dashboard)/students/loading.tsx` | Skeleton loader |
| `components/students/student-data-table.tsx` | Client DataTable wrapper with filters |
| `components/students/student-columns.tsx` | TanStack Table column definitions |
| `components/students/student-detail-sheet.tsx` | Sheet: student info, linked lead, renewal |
| `components/students/student-detail-info.tsx` | Student info display/edit form |
| `components/students/student-status-badge.tsx` | Status badge with color (active=green, paused=yellow, etc.) |
| `components/students/renewal-countdown.tsx` | Days remaining badge with color coding |
| `components/students/create-student-dialog.tsx` | Dialog: manual student creation form |
| `components/students/csv-import-dialog.tsx` | Dialog: upload, map columns, preview, import |
| `components/students/csv-column-mapper.tsx` | Column mapping UI (CSV header → DB field) |
| `components/students/csv-preview-table.tsx` | Preview parsed rows before import |
| `components/students/student-status-transition.tsx` | Status change dropdown with validation |
| `lib/actions/student-actions.ts` | Server actions: CRUD, status change, CSV import |
| `lib/utils/referral-code.ts` | Generate referral code from parent name |
| `lib/utils/csv-parser.ts` | Parse CSV file, validate rows |
| `supabase/migrations/011_create-student-enrollment-trigger.sql` | Auto-create student on lead stage 7 |

### Files to Modify

| File | Change |
|------|--------|
| `app/api/cron/check-overdue-reminders/route.ts` | Add renewal check logic |
| `lib/actions/lead-actions.ts` | Handle stage 7 transition → student creation |
| `components/pipeline/lead-detail-info.tsx` | Show linked student if exists |

## Implementation Steps

1. **Create enrollment trigger** `supabase/migrations/011_create-student-enrollment-trigger.sql`
   ```sql
   CREATE OR REPLACE FUNCTION create_student_on_enrollment()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.current_stage = 'da_dang_ky' AND OLD.current_stage != 'da_dang_ky' THEN
       INSERT INTO students (lead_id, student_name, enrollment_date, status, renewal_status)
       VALUES (
         NEW.id,
         COALESCE(NEW.student_name, NEW.parent_name),
         NOW(),
         'active',
         'pending'
       )
       ON CONFLICT (lead_id) DO NOTHING; -- prevent duplicates
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Create referral code utility** `lib/utils/referral-code.ts`
   - `generateReferralCode(parentName)`: extract initials, format LUNA-{INITIALS}
   - Handle Vietnamese diacritics (normalize to ASCII)
   - Check uniqueness, append number if collision (LUNA-NVA-2)

3. **Create CSV parser** `lib/utils/csv-parser.ts`
   - `parseCSV(file)`: parse file to array of objects
   - `validateRow(row, fieldMap)`: check required fields, format phone
   - `detectColumns(headers)`: auto-suggest mapping (fuzzy match)

4. **Create student server actions** `lib/actions/student-actions.ts`
   - `createStudent(data)`: insert student, generate referral code
   - `updateStudent(id, data)`: update fields
   - `changeStudentStatus(id, newStatus, reason?)`: validate transition, update
   - `getStudents(filters)`: fetch with pagination, joins
   - `importStudentsCSV(rows)`: bulk insert with validation
   - `exportStudentsCSV()`: generate CSV from current data

5. **Create students page** `app/(dashboard)/students/page.tsx`
   - Server component: fetch students with lead join
   - Pass to `<StudentDataTable />`
   - "Them hoc sinh" and "Import CSV" buttons in header

6. **Create StudentDataTable** `components/students/student-data-table.tsx`
   - `'use client'` DataTable with filters
   - Toolbar: status filter, class filter, search input
   - Row click opens StudentDetailSheet

7. **Create student-columns.tsx**
   - Columns: student_name, current_class, current_level, status (badge), enrollment_date, level_end_date (countdown), referral_code, actions
   - Sortable columns: name, date, status

8. **Create StudentDetailSheet** `components/students/student-detail-sheet.tsx`
   - Sheet slide-over with tabs: "Thong tin", "Lead goc" (original lead link)
   - `<StudentDetailInfo />` for info/edit
   - Link to original lead detail
   - Renewal status and countdown

9. **Create StudentDetailInfo** `components/students/student-detail-info.tsx`
   - Display/edit: student_name, student_code, current_class, current_level, enrollment_date, level_end_date
   - Status transition dropdown (with validation)
   - Referral code display (read-only, copy button)

10. **Create status badge** `components/students/student-status-badge.tsx`
    - Colors: active=green, paused=yellow, graduated=blue, dropped=red
    - Vietnamese labels: "Dang hoc", "Bao luu", "Tot nghiep", "Nghi"

11. **Create renewal countdown** `components/students/renewal-countdown.tsx`
    - Calculate days remaining from level_end_date
    - Green (>14 days), Yellow (7-14 days), Red (<7 days), Expired (past)
    - Text: "Con 12 ngay" or "Het han 3 ngay truoc"

12. **Create status transition** `components/students/student-status-transition.tsx`
    - Dropdown with valid transitions based on current status
    - Paused: requires resume date; shows max 3-month warning
    - Dropped: requires reason (select + textarea)

13. **Create CSV import dialog** `components/students/csv-import-dialog.tsx`
    - Step 1: Upload file (drag-drop or click)
    - Step 2: Column mapping (`<CSVColumnMapper />`)
    - Step 3: Preview (`<CSVPreviewTable />`) with validation errors
    - Step 4: Import + summary (X created, Y skipped, Z errors)

14. **Create CSVColumnMapper** `components/students/csv-column-mapper.tsx`
    - Show CSV headers → DB field mapping dropdowns
    - Auto-detect common headers (Ten, SĐT, Lop, etc.)
    - Required fields highlighted

15. **Create CSVPreviewTable** `components/students/csv-preview-table.tsx`
    - Show first 10 rows with mapped fields
    - Highlight validation errors (missing required, invalid phone)
    - Row count summary

16. **Create student creation dialog** `components/students/create-student-dialog.tsx`
    - Form: student_name, student_code, class, level, enrollment_date, level_end_date
    - Optional: link to existing lead (search)
    - Auto-generate referral code on save

17. **Update cron job** for renewal checks
    - Add to existing cron: query students WHERE level_end_date - NOW() <= 14 days
    - Create renewal reminder if not already exists
    - Assign to lead's original advisor

18. **Update lead detail** to show linked student
    - If lead.stage = ĐÃ ĐĂNG KÝ and has student record: show link

## Todo List

- [ ] Create enrollment trigger (lead stage 7 → student record)
- [ ] Create referral code generator
- [ ] Create CSV parser utility
- [ ] Create student server actions (CRUD, status, import)
- [ ] Create students page (server component)
- [ ] Create StudentDataTable with filters
- [ ] Create student column definitions
- [ ] Create StudentDetailSheet
- [ ] Create StudentDetailInfo (display/edit)
- [ ] Create student status badge
- [ ] Create renewal countdown component
- [ ] Create status transition component
- [ ] Create CSV import dialog (upload → map → preview → import)
- [ ] Create CSVColumnMapper
- [ ] Create CSVPreviewTable
- [ ] Create manual student creation dialog
- [ ] Update cron job for renewal alerts
- [ ] Update lead detail to show linked student
- [ ] Import existing ~95 students via CSV
- [ ] Test auto-creation on lead enrollment
- [ ] Test status transitions (all valid paths)
- [ ] Test CSV import with real Google Sheets data
- [ ] Test renewal countdown and alerts

## Success Criteria

- Lead reaching ĐÃ ĐĂNG KÝ auto-creates student with referral code
- Student list shows all records with sortable/filterable DataTable
- Renewal countdown visible, alerts created 2 weeks before expiry
- Status transitions enforced (can't go from dropped to active directly)
- CSV import successfully handles Luna's existing ~95 student records
- Referral codes unique, correctly formatted, copyable
- Paused students show max 3-month countdown

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSV format varies (different delimiters, encodings) | Import fails | Support UTF-8 + UTF-8 BOM, auto-detect delimiter |
| Duplicate students on re-import | Data corruption | Check phone/name uniqueness, skip duplicates |
| Vietnamese diacritics in referral code | Unreadable codes | Normalize to ASCII (Nguyen → NGU) |
| Level end dates not set | No renewal alerts | Make level_end_date required after enrollment, show warning if null |

## Security Considerations

- CSV upload validated server-side (file type, max size 2MB)
- Student PII (phone from parent) protected by RLS
- Referral codes don't contain PII
- Bulk import requires admin role
- Export CSV requires admin role

## Next Steps

- Phase 6 uses student count + renewal stats for dashboard KPIs
- Phase 7 can send Zalo OA renewal reminders to parents
