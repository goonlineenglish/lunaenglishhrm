# Phase 4: Google Sheets 2-Way Sync

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 3 (actions must exist), Phase 1 (sheet_sync_snapshots + sync_runs tables)
- Current: `lib/integrations/google-sheets-sync.ts` — 180 lines, 1-way CRM→Sheet
- Cron: `app/api/cron/sync-google-sheets/route.ts`
- Brainstorm conflict rules: `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md` §1
- **Canonical schedule**: every 15 minutes (matches existing cron; operation-principles.md "06:00 daily" was for Sheet→CRM only in early brainstorm, superseded by this plan)

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Upgrade Google Sheets sync from 1-way to 2-way with Sheet-wins conflict resolution, snapshot comparison, advisory lock concurrency control, and deterministic inbound lead-linking rules. Modularize into 3 files.

## Key Insights
- Current BUG: `studentsRows()` references non-existent columns (student_name, parent_name, etc.) — needs JOIN with leads
- Sheet has no `updated_at` → must use snapshot diff to detect Sheet changes
- Conflict rule: Sheet wins when both sides changed same field
- **Concurrency**: `sync_runs` table with UNIQUE partial index `WHERE status='running'` — INSERT fails if another run active. Stale rows (>10min) auto-timeout before INSERT. No advisory lock (serverless-compatible).
- **Inbound lead-linking**: Sheet rows without matching lead → auto-create lead with deterministic defaults
- **Data quality gate**: Rows with null/empty student_code are SKIPPED and logged as errors (not synced)

## Requirements
- **Functional**:
  - Inbound: Sheet → CRM (new students + updates, Sheet wins)
  - Outbound: CRM → Sheet (new students + updates, only if Sheet unchanged)
  - Fix: studentsRows() bug (JOIN with leads for parent info)
  - Snapshot: save after each sync for next comparison
  - Concurrency: sync_runs UNIQUE partial index guard (serverless-safe, no advisory lock)
  - Lead auto-creation for orphan inbound rows
  - Data quality: skip rows with null student_code, log errors
- **Non-functional**:
  - Each file under 200 lines
  - Google API rate limits respected (100 requests/100s per user)
  - Graceful error handling (partial sync OK)
  - No concurrent sync runs

## Architecture

### Sync Flow
```
Every 15 min (cron):
  0. CONCURRENCY GUARD (sync_runs transactional):
     a. UPDATE sync_runs SET status='timeout' WHERE status='running' AND started_at < NOW() - INTERVAL '10 minutes'
     b. INSERT INTO sync_runs (status='running') — if UNIQUE partial index violated → another run active → ABORT
     c. Wrap in try/catch: constraint violation = locked, return early
     d. On completion/error: UPDATE sync_runs SET status='completed'|'error', completed_at=NOW()

  1. Read current Sheet "Học viên" tab → sheetRows[]
  2. DATA QUALITY GATE: filter out rows where Mã HS (student_code) is empty → log as errors
  3. Load last snapshot from sheet_sync_snapshots → prevSnapshot[]
  4. Query Supabase students (JOIN leads) → crmRows[]

  INBOUND (Sheet → CRM):
  5. For each valid sheetRow:
     a. Match by student_code
     b. If new (not in CRM):
        i.  Check if lead exists (match by parent_phone OR parent_name+student_name)
        ii. If lead exists → INSERT student with lead_id, UPDATE lead fields
        iii.If NO lead exists → AUTO-CREATE lead with:
            - source: 'google_sheet' (enum value added in migration 034 — MUST exist before sync runs)
            - current_stage: 'da_dang_ky'
            - parent_name: from Sheet (col E), fallback "PH - {student_name}"
            - parent_phone: from Sheet (col F), fallback "000-0000-0000"
            - Then INSERT student with new lead_id
     c. If exists: compare sheetRow vs prevSnapshot
        - Fields changed on Sheet → UPDATE CRM (Sheet wins)
        - Fields unchanged on Sheet → skip (preserve CRM edits)

  OUTBOUND (CRM → Sheet):
  6. For each crmRow:
     a. Match by student_code
     b. If new (not in Sheet) → APPEND row to Sheet
     c. If exists: compare crmRow vs prevSnapshot
        - Fields changed in CRM AND unchanged in Sheet → UPDATE Sheet
        - Fields changed in CRM AND changed in Sheet → Sheet wins (skip CRM→Sheet)

  7. Save new snapshot (current Sheet state) to sheet_sync_snapshots
  8. UPDATE sync_runs SET status='completed', completed_at=NOW()
  9. Cleanup: DELETE sync_runs WHERE started_at < NOW() - INTERVAL '48 hours'
  10. Cleanup: DELETE sheet_sync_snapshots WHERE synced_at < NOW() - INTERVAL '48 hours'
  11. Return sync results
```

### Column Mapping (Sheet ↔ Supabase)
| # | Sheet Header | Supabase Source | Direction |
|---|---|---|---|
| A | Mã HS | students.student_code | ↔ key (NOT NULL required) |
| B | Họ tên HS | leads.student_name | ↔ |
| C | Ngày sinh | students.date_of_birth | ↔ |
| D | Giới tính | students.gender | ↔ |
| E | Tên PH | leads.parent_name | ↔ (NOT NULL in leads) |
| F | SĐT PH | leads.parent_phone | ↔ (NOT NULL in leads) |
| G | Email PH | leads.parent_email | ↔ |
| H | Địa chỉ | students.address | ↔ |
| I | Chương trình | students.program_type | ↔ |
| J | Level | students.current_level | ↔ |
| K | Lớp | students.current_class | ↔ |
| L | GV phụ trách | students.teacher_name | ↔ |
| M | Ngày đăng ký | students.enrollment_date | ↔ |
| N | Ngày hết hạn | students.level_end_date | ↔ |
| O | Học phí | students.tuition_amount | ↔ |
| P | Trạng thái TT | students.payment_status | ↔ |

### Inbound Lead-Linking Decision Tree
```
Sheet row arrives with student_code X:
  ├─ student_code is empty/null → SKIP, log error "Missing Mã HS at row N"
  ├─ student exists in CRM (match by student_code) → UPDATE (snapshot diff)
  └─ student NOT in CRM:
      ├─ lead found (match by parent_phone OR parent_name+student_name)
      │   └─ INSERT student with lead_id, UPDATE lead parent fields from Sheet
      └─ NO lead found
          └─ AUTO-CREATE lead:
              source='google_sheet', stage='da_dang_ky'
              parent_name=Sheet col E (required, fallback "PH - {col B}")
              parent_phone=Sheet col F (required, fallback "000-0000-0000")
              Then INSERT student with new lead_id
```

## Related Code Files
- **Modify**:
  - `lib/integrations/google-sheets-sync.ts` → keep as orchestrator (~80 lines)
  - `app/api/cron/sync-google-sheets/route.ts` → call new sync function
- **Create**:
  - `lib/integrations/google-sheets-sync-utils.ts` — shared: sheetsClient, column mapping, snapshot helpers, diffing, concurrency guard
  - `lib/integrations/google-sheets-inbound-sync.ts` — Sheet → CRM logic + lead auto-creation
  - `lib/integrations/google-sheets-outbound-sync.ts` — CRM → Sheet logic + existing tabs

## Implementation Steps

### 1. Create google-sheets-sync-utils.ts
- Export `sheetsClient()` — Google Sheets API client
- Export `STUDENT_COLUMN_MAP` — header↔field mapping array (16 columns)
- Export `readSheetTab(sheetId, tabName)` — read all rows from tab
- Export `writeSheetTab(sheetId, tabName, rows)` — batch update rows
- Export `appendSheetRows(sheetId, tabName, rows)` — append new rows
- Export `getLatestSnapshot(supabase)` — fetch last snapshot from DB
- Export `saveSnapshot(supabase, data)` — insert new snapshot
- Export `diffRows(current, previous)` — field-level diff between 2 row snapshots
- Export `parseSheetDate(str)` / `formatSheetDate(date)` — date conversion
- Export `acquireSyncLock(supabase)` — UPDATE stale rows to 'timeout', then INSERT sync_runs (status='running'). UNIQUE partial index prevents duplicates. Returns lockId or null on constraint violation.
- Export `releaseSyncLock(supabase, lockId, status)` — UPDATE sync_runs SET completed_at=NOW(), status='completed'|'error'
- Export `cleanupOldRecords(supabase)` — DELETE old sync_runs + snapshots (>48h)
- Export `validateStudentCode(row)` — return true if student_code is non-empty string

### 2. Create google-sheets-inbound-sync.ts
- Export `syncSheetToCRM(supabase, sheetId)` — main inbound function
- Read "Học viên" tab
- Data quality gate: filter rows, collect errors for null student_code
- Load previous snapshot
- For each valid row: match student_code → INSERT (with lead-linking) or UPDATE CRM
- Lead auto-creation logic (see decision tree above)
- Return `{ inserted: number, updated: number, skipped: number, leadsCreated: number, errors: string[] }`

### 3. Create google-sheets-outbound-sync.ts
- Export `syncCRMToSheet(supabase, sheetId)` — main outbound function
- Query students JOIN leads
- Load previous snapshot
- For each student: match student_code → APPEND or UPDATE Sheet (only if Sheet unchanged)
- Existing outbound tabs (Leads, Hoạt động, Nhắc nhở, Tổng quan) moved here
- Fix studentsRows() bug — use JOIN data

### 4. Refactor google-sheets-sync.ts (orchestrator)
- `syncAll()`:
  1. Acquire sync lock (INSERT sync_runs, UNIQUE partial index guard) → if locked, return early with `{ skipped: true, reason: 'concurrent run' }`
  2. Call inbound sync (Sheet → CRM)
  3. Call outbound sync (CRM → Sheet, all 5 tabs)
  4. Save new snapshot
  5. Release sync lock
  6. Cleanup old records
  7. Return combined results
- Keep SyncResult interface here (add new fields: leadsCreated, lockSkipped)
- Wrap in try/finally to always release lock

### 5. Update cron route
- Import from refactored module
- No logic change (still calls syncAll)

## Todo List
- [ ] Create google-sheets-sync-utils.ts (sheetsClient, mapping, diff, lock, validate)
- [ ] Create google-sheets-inbound-sync.ts (Sheet→CRM + lead auto-creation)
- [ ] Create google-sheets-outbound-sync.ts (CRM→Sheet + fix studentsRows bug)
- [ ] Refactor google-sheets-sync.ts to orchestrator with lock
- [ ] Update "Học viên" tab headers (16 columns)
- [ ] Write automated tests for conflict logic (see Phase 6)
- [ ] Test inbound: add row on Sheet → verify CRM insert + lead creation
- [ ] Test outbound: add student on CRM → verify Sheet append
- [ ] Test conflict: edit both → verify Sheet wins
- [ ] Test concurrent lock: trigger 2 syncs → verify 1 skips
- [ ] Test data quality: empty student_code → verify skip + error log
- [ ] Verify cron endpoint works

## Success Criteria
- No file exceeds 200 lines
- Inbound sync: Sheet → CRM inserts/updates work
- Outbound sync: CRM → Sheet appends/updates work
- Conflict: Sheet wins when both modified
- Orphan rows: lead auto-created with correct defaults
- Data quality: null student_code rows skipped, errors logged
- Concurrency: second sync run skipped gracefully
- Snapshot saved after each sync, old ones cleaned up
- Existing outbound tabs (Leads, Activities, etc.) still work
- `npm run build` passes

## Risk Assessment
- Google Sheets API rate limit: 100 req/100s — 2-way doubles calls. Mitigate: batch operations
- Snapshot table grows: ~1 row per 15 min = 96/day. Mitigate: cleanup >48h records each run
- Sheet structure change (user adds/removes columns): Mitigate: match by header name, not column index
- Lead auto-creation with fallback phone "000-0000-0000": may create orphan leads. Mitigate: flag these leads with source='google_sheet' for QL review
- Concurrent cron runs (Vercel edge case): Mitigate: sync_runs UNIQUE partial index is atomic; stale timeout (>10min) auto-clears stuck rows. Serverless-compatible.

## Security Considerations
- GOOGLE_SERVICE_ACCOUNT_KEY in env only (never committed)
- Sheet sync uses admin client (service_role) — no user context
- Cron auth: CRON_SECRET bearer token (fail-closed)
- Auto-created leads: source='google_sheet' clearly identifies origin, prevents confusion with manual leads
