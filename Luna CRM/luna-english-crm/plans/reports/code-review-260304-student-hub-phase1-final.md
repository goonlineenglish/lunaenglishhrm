# Code Review — Student Data Hub Phase 1 Final
**Date:** 2026-03-04
**Reviewer:** code-reviewer subagent
**Scope:** Student Hub Phase 1 implementation (all new/modified files)

---

## Scope

**Files reviewed (17 total, ~840 LOC):**
- `lib/types/student-hub-types.ts` (98 lines)
- `lib/constants/student-hub-constants.ts` (52 lines)
- `lib/actions/student-crud-actions.ts` (162 lines)
- `lib/actions/student-status-actions.ts` (131 lines)
- `lib/actions/student-import-actions.ts` (67 lines)
- `lib/actions/student-learning-actions.ts` (101 lines)
- `lib/actions/student-actions.ts` (17 lines — barrel)
- `lib/integrations/google-sheets-sync-utils.ts` (219 lines — OVER 200)
- `lib/integrations/google-sheets-inbound-sync.ts` (182 lines)
- `lib/integrations/google-sheets-outbound-sync.ts` (169 lines)
- `lib/integrations/google-sheets-sync.ts` (124 lines)
- `app/api/cron/sync-google-sheets/route.ts` (23 lines)
- `components/students/student-learning-path-tab.tsx` (140 lines)
- `components/students/student-attendance-tab.tsx` (74 lines)
- `components/students/student-scores-tab.tsx` (82 lines)
- `components/students/student-detail-sheet.tsx` (90 lines)
- `components/students/student-detail-info.tsx` (209 lines — OVER 200)
- `components/students/student-columns.tsx` (192 lines)
- `supabase/migrations/034_student-hub-phase1-gaps.sql` (84 lines)

**Build status:** PASS (Next.js 16.1.6 production build clean)
**Linting:** 1 error, 1 warning (see below)

---

## Overall Assessment

Solid Phase 1 implementation. The architecture is well-modularized, security baseline is good (UUID validation on all ID params, auth checks on every server action, RLS enforced on all new tables, cron secret fail-closed). The Google Sheets 2-way sync is the most complex piece and is well-structured. Two lint issues need fixing before merge. One dead UI tab (orphan TabsContent). Two files exceed the 200-line project rule. No critical security issues.

**Score: 9.0/10** (not auto-approved — 1 linter error + 1 medium issue block)

---

## Critical Issues

None.

---

## High Priority

### 1. Lint error: `let` should be `const` in google-sheets-sync.ts
**File:** `lib/integrations/google-sheets-sync.ts:71`
**Issue:** ESLint `prefer-const` error — `let currentSheetRows` is never reassigned.
```ts
// Current (line 71):
let currentSheetRows = await readSheetTab(sheets, sheetId, "Học viên");
// Fix:
const currentSheetRows = await readSheetTab(sheets, sheetId, "Học viên");
```
**Impact:** ESLint error blocks clean CI. Must fix before merge.

### 2. Unused import warning: `diffRows` in google-sheets-inbound-sync.ts
**File:** `lib/integrations/google-sheets-inbound-sync.ts:13`
**Issue:** `diffRows` is imported but not used in this module (it is used in the orchestrator). This is a lint warning but indicates the import was added by mistake — the inbound module receives pre-computed diffs, it does not compute them itself.
```ts
// Remove this line from the import:
  diffRows,
```
**Impact:** Misleading — suggests inbound module does diffing when it does not. ESLint warning.

---

## Medium Priority

### 3. Orphan TabsContent "lead" in student-detail-sheet.tsx
**File:** `components/students/student-detail-sheet.tsx:64`
**Issue:** There is a `<TabsContent value="lead">` block but no corresponding `<TabsTrigger value="lead">` in the TabsList. The lead info content is inaccessible in the UI — it is dead code.

The 4 triggers are: `info`, `path`, `attendance`, `scores`. The `lead` content at line 64 is unreachable.

**Options:**
- A. Remove the orphan `TabsContent value="lead"` block entirely (lead data is already shown in the `info` tab via `student-detail-info.tsx`)
- B. Add a 5th `TabsTrigger value="lead"` if lead details are intentionally separate

This is a UX dead zone and would confuse future developers.

### 4. google-sheets-sync-utils.ts exceeds 200-line limit
**File:** `lib/integrations/google-sheets-sync-utils.ts` (219 lines)
**Issue:** Project rule: files must stay under 200 lines. This file is 19 lines over.
The `acquireSyncLock`, `releaseSyncLock`, `cleanupOldRecords` functions (lines 177-219) could be extracted to `google-sheets-sync-lock.ts`.
**Impact:** Low severity — file is well-organized even at 219 lines. Flag for next iteration.

### 5. student-detail-info.tsx exceeds 200-line limit
**File:** `components/students/student-detail-info.tsx` (209 lines)
**Issue:** 9 lines over the 200-line limit. `FieldRow` helper could be extracted to a shared `field-row.tsx` or the file is borderline acceptable. Low priority.

### 6. Inbound sync: auto-created lead gets empty parent_phone on insert
**File:** `lib/integrations/google-sheets-inbound-sync.ts:98`
**Issue:** When auto-creating a lead for a new sheet row with no phone:
```ts
parent_phone: (phone ?? "").trim(),
```
This inserts an empty string `""` into `parent_phone`, which is a NOT NULL column. This works at DB level (empty string ≠ null) but is semantically incorrect — it will show as an empty phone in the pipeline and won't match future phone lookups.

Consider: `parent_phone: phone?.trim() ?? "Chưa có SĐT"` or a placeholder that is visibly invalid.

---

## Low Priority

### 7. `sheetsClient()` called without error wrapping in inbound/outbound
**File:** `lib/integrations/google-sheets-sync.ts:63-66`
**Issue:** `sheetsClient()` JSON.parse error is already caught at the orchestrator level — this is handled correctly. However, `readSheetTab`, `writeSheetTab` errors from the Google API are not individually logged with tab names in the inbound path (only in outbound per-tab loop). Minor observability gap.

### 8. `buildLeadsTab` does a SELECT * on leads
**File:** `lib/integrations/google-sheets-outbound-sync.ts:59`
**Issue:** `select("*")` on leads table fetches all columns including potentially sensitive fields (notes, internal data). Only 8 columns are mapped in the output. Recommend explicit column selection for defense-in-depth. Low severity since this runs server-side only via admin client.

### 9. `PROGRAM_CONFIGS` includes deprecated `secondary` key
**File:** `lib/constants/student-hub-constants.ts:39`
**Issue:** `secondary: { label: "THCS (Deprecated)", ... }` is kept for backward compat which is correct per migration 034's note. Label "THCS (Deprecated)" is clear. No action needed — documented intent.

### 10. Date parsing: `parseSheetDate` trusts user-controlled strings
**File:** `lib/integrations/google-sheets-sync-utils.ts:149-158`
**Issue:** Date strings from the Sheet are split by `/` without length/value validation. A malformed date like `"99/99/9999"` would produce `"9999-99-99"` which PostgreSQL would reject at insert time (not a silent failure). Acceptable for a controlled internal tool — DB will reject bad dates. Note for future hardening.

---

## Edge Cases Found by Scouting

1. **Snapshot diff on first run:** Correctly handled — `previousRows.length === 0` triggers full-row processing. Good.
2. **Concurrent sync runs:** UNIQUE partial index on `sync_runs WHERE status='running'` correctly prevents double execution. Stale lock timeout (10 min) is reasonable.
3. **Backfill code collision in migration 034:** The CTE uses `NOT EXISTS` check but row numbering is computed globally — if two students both get the same generated code (impossible given ROW_NUMBER), the NOT EXISTS guard catches it. Pattern is safe.
4. **student_code NOT NULL after backfill:** Migration correctly backfills before adding NOT NULL. Safe ordering.
5. **Bulk status change partial failure:** `bulkChangeStudentStatus` correctly uses per-ID update loop for transition validation, then single `.in()` update for eligible IDs. Race condition risk: between individual status-read and bulk update, a student could be updated externally. Severity: Low (internal admin tool).
6. **upsertLearningPath `onConflict: "student_id"`:** Requires a UNIQUE constraint on `learning_paths(student_id)`. Verify migration 031 has this constraint — if absent, upsert behaves as insert and creates duplicates. Not visible in reviewed files.
7. **Attendance tab fetches direct via client-side Supabase:** `student-attendance-tab.tsx` and `student-scores-tab.tsx` query Supabase directly from the client (not via server actions). This is consistent with the project's pattern for read-only client queries (RLS protects the data). Acceptable but means these tabs do not benefit from server-side caching.
8. **`importStudentsCSV`: N+1 inserts in a loop** — for large CSV files, this is slow (one DB round-trip per row). For Phase 1 with ~200 students this is acceptable. Future: use bulk insert.

---

## Positive Observations

- UUID validation regex (`UUID_RE`) consistently applied to all ID params across all 4 action modules.
- Every server action checks `supabase.auth.getUser()` before proceeding — never uses `getSession()`.
- `ensureUserProfile()` called on all mutating actions.
- RLS-aware error handling: `error.code === "42501"` explicitly caught and returns Vietnamese error message.
- `getAdminClient()` used only in the sync orchestrator — not duplicated.
- Sync lock mechanism (partial UNIQUE index) is elegant and atomic.
- Barrel export (`student-actions.ts`) preserves backward compatibility cleanly.
- Vietnamese labels are complete and accurate throughout constants and UI.
- `PROGRAM_CONFIGS` matches CLAUDE.md program spec exactly.
- Migration 034 is careful: checks constraint existence before adding, comments deprecated enum value.
- `student-detail-sheet.tsx` correctly passes `studentId` (not the full object) to tab components — good separation.
- `buildOverviewTab` uses `count: "exact", head: true` — no data transfer for count-only queries.

---

## Recommended Actions (Ordered)

1. **Fix linter error** — change `let currentSheetRows` to `const` in `lib/integrations/google-sheets-sync.ts:71`
2. **Remove unused import** — remove `diffRows` from `lib/integrations/google-sheets-inbound-sync.ts:13`
3. **Fix orphan tab** — remove `<TabsContent value="lead">` from `student-detail-sheet.tsx` or add its trigger
4. **Verify migration 031** has UNIQUE constraint on `learning_paths(student_id)` before deploying
5. Consider fixing empty phone fallback in `resolveLeadId` (issue 6)
6. Track file size violations for next refactor cycle (issues 4 & 5)

---

## Metrics

| Metric | Value |
|---|---|
| Build | PASS |
| TypeScript | Clean (strict mode, no TS errors) |
| ESLint errors | 1 (`prefer-const`) |
| ESLint warnings | 1 (unused import) |
| Files over 200 lines | 2 (`sync-utils.ts` 219, `detail-info.tsx` 209) |
| Critical security issues | 0 |
| UUID validation coverage | 100% of ID params |
| Auth check coverage | 100% of server actions |
| Test coverage | 0% (no unit tests — known existing gap) |

---

## Score

**9.0 / 10**

Not auto-approved due to:
- 1 ESLint error (prefer-const) — blocks clean CI
- 1 medium UX issue (orphan tab content)

Both fixes are trivial (< 5 min). After fixing, implementation is production-ready for Phase 1.

---

## Unresolved Questions

1. Does migration 031 (`create-learning-path-tables.sql`) include `UNIQUE (student_id)` on `learning_paths`? If not, `upsertLearningPath` will create duplicates instead of updating.
2. Is the intentional Sheet-wins conflict resolution documented anywhere for the operations team? If CRM edits get silently overwritten by the next sync, staff may be confused.
3. `buildLeadsTab` selects all lead columns — confirm no sensitive internal fields (stage notes, internal activity logs) are being exported to the Google Sheet unintentionally.
