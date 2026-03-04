# Code Review: Google Sheets Sync Feature

**Date:** 2026-03-02
**Reviewer:** code-reviewer
**Feature:** Google Sheets CRM data sync (cron-based, 5 tabs)

---

## Scope

| Item | Detail |
|------|--------|
| Files reviewed | 3 |
| `lib/integrations/google-sheets-sync.ts` | 170 LOC (sync service) |
| `app/api/cron/sync-google-sheets/route.ts` | 23 LOC (cron endpoint) |
| `vercel.json` | 25 LOC (updated cron config) |
| Focus | Security, error handling, pattern consistency, edge cases |
| Reference patterns | `process-message-queue/route.ts`, `check-overdue-reminders/route.ts` |

---

## Overall Assessment

Solid implementation. Cron endpoint exactly matches the established fail-closed auth pattern. Sync service is well-structured with per-tab error isolation, proper env var guards, and clean TypeScript. Vietnamese tab headers are correct. File stays under 200 lines. Two issues found -- one high priority (JSON.parse crash) and one medium priority (unbounded query).

**Verdict: APPROVED with 2 recommended fixes (non-blocking)**

---

## Critical Issues

None.

---

## High Priority

### H1. `JSON.parse` crash on malformed `GOOGLE_SERVICE_ACCOUNT_KEY` (line 27)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\integrations\google-sheets-sync.ts`

**Problem:** `sheetsClient()` calls `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)` without try-catch. If the env var contains malformed JSON (trailing comma, truncated paste, wrong encoding), this throws an unhandled `SyntaxError` that bypasses the graceful `SyncResult` error path and instead surfaces as a raw 500 from the cron route's outer catch.

The env var validation on line 128 only checks for *existence*, not *parsability*. The `!` non-null assertion on line 27 is safe because `sheetsClient()` is only called after the guard on line 128, but the parse itself is unguarded.

**Impact:** Cron returns generic "Unknown error" / "SyntaxError: Unexpected token" instead of actionable diagnostic. Difficult to debug in production logs.

**Fix:**

```typescript
// In syncAllToSheets(), after the env var existence check (line 132-133):
let sheets;
try {
  sheets = sheetsClient();
} catch (err) {
  return {
    success: false,
    error: `Invalid GOOGLE_SERVICE_ACCOUNT_KEY: ${err instanceof Error ? err.message : "parse error"}`,
  };
}
```

Alternatively, validate JSON parsability inside the existing guard:

```typescript
// Replace lines 128-129
try {
  JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
} catch {
  return { success: false, error: "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON" };
}
if (!process.env.GOOGLE_SHEET_ID) {
  return { success: false, error: "Missing GOOGLE_SHEET_ID" };
}
```

---

## Medium Priority

### M1. Unbounded `select("*")` on leads and students (lines 49, 62)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\integrations\google-sheets-sync.ts`

**Problem:** `leadsRows` and `studentsRows` fetch ALL rows with `select("*")` and no `.limit()`. Activities and reminders correctly apply `.limit(500)` and `.limit(300)` respectively. As the CRM grows, leads/students tables could reach thousands of rows, causing:
- Google Sheets API payload size limits (10MB per request)
- Supabase response timeouts on large datasets
- Memory pressure during the cron execution window

**Impact:** Works fine now (small dataset), will degrade over time.

**Fix:** Add reasonable limits or match the pattern of the other queries:

```typescript
// leadsRows - line 49
const { data } = await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(2000);

// studentsRows - line 62
const { data } = await sb.from("students").select("*").order("created_at", { ascending: false }).limit(1000);
```

### M2. `select("*")` fetches unnecessary columns

**Problem:** Lines 49 and 62 fetch all columns but only use ~8-10 fields each. This wastes bandwidth and memory, especially as tables gain columns over time.

**Fix:** Select only needed columns:

```typescript
// leadsRows
const { data } = await sb.from("leads")
  .select("student_name, parent_name, parent_phone, parent_email, source, current_stage, program_interest, notes, created_at, updated_at")
  .order("created_at", { ascending: false })
  .limit(2000);
```

---

## Low Priority

### L1. Single-letter utility function names (lines 22-23)

```typescript
const d = (v: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "\u2014");
const v = (x: unknown) => (x as string) || "\u2014";
```

`d` and `v` are not self-documenting. Since this file is 170 lines and these are used throughout, this is acceptable but could be improved:

```typescript
const fmtDate = (val: string | null) => (val ? new Date(val).toLocaleDateString("vi-VN") : "\u2014");
const fmtVal = (x: unknown) => (x as string) || "\u2014";
```

### L2. No Supabase error checking on data queries

Functions like `leadsRows`, `studentsRows` etc. destructure `{ data }` but ignore `{ error }`. If a query fails (RLS, network), `data` is `null` and the `?? []` fallback silently produces an empty tab. This is actually reasonable fail-safe behavior for a sync job, but logging the error would help debugging.

### L3. `writeTab` range `A:Z` limits to 26 columns

Line 39: `range: '${name}'!A:Z` clears columns A through Z. Currently the widest tab has 10 columns, so this is fine. If a tab ever exceeds 26 columns, the clear would miss columns AA+. Not a real concern for this use case.

---

## Edge Cases Analysis

| Edge Case | Handled? | Notes |
|-----------|----------|-------|
| Missing env vars | Yes | Line 128-129 returns early with descriptive error |
| Malformed JSON in service account key | **No** | H1 above -- JSON.parse will throw |
| Empty database (no leads/students) | Yes | `?? []` fallback produces header-only rows |
| Google API rate limit / 429 | Partial | Per-tab try-catch catches the error; tab marked as failed; other tabs continue |
| Google API auth failure (bad credentials) | Partial | First `writeTab` call will fail; error captured in details array |
| Sheet tab name mismatch (tab doesn't exist) | **No** | If a tab name in Google Sheets doesn't match (typo, renamed), the API will 400. Caught by per-tab try-catch but error message may be unclear |
| Concurrent cron executions | Safe | Read-then-overwrite pattern is idempotent; no race condition risk |
| Missing CRON_SECRET | Yes | Fail-closed: returns 401 |
| Large dataset (10k+ leads) | **No** | M1 above -- no limit on leads/students queries |

---

## Pattern Consistency

### Cron Route Pattern -- PASS

The `sync-google-sheets/route.ts` is a **carbon copy** of the `process-message-queue/route.ts` pattern:

| Aspect | Expected | Actual |
|--------|----------|--------|
| Import `NextRequest, NextResponse` | Yes | Yes |
| `GET(request: NextRequest)` | Yes | Yes |
| `request.headers.get("Authorization")` | Yes | Yes (capitalized, matches pattern) |
| `process.env.CRON_SECRET` | Yes | Yes |
| Fail-closed check | Yes | Yes |
| 401 response | Yes | `{ error: "Unauthorized" }` |
| try-catch around service call | Yes | Yes |
| 500 response on error | Yes | Yes |
| `err instanceof Error` check | Yes | Yes |

Note: `check-overdue-reminders/route.ts` uses lowercase `"authorization"` (line 6) while the other cron routes use `"Authorization"`. The new file correctly uses `"Authorization"` matching the majority pattern. HTTP headers are case-insensitive per spec, so both work.

### Integration Service Pattern -- PASS

| Aspect | Expected | Actual |
|--------|----------|--------|
| Uses `getAdminClient()` from centralized location | Yes | Yes (imports from `@/lib/supabase/admin`) |
| Typed return interface | Yes | `SyncResult` interface exported |
| Error isolation per operation | Yes | Per-tab try-catch |
| No secrets in responses | Yes | Only error messages, no keys |

Note: `message-queue-processor.ts` duplicates `getAdminClient()` internally (lines 5-10) instead of importing it. The new file correctly uses the centralized import -- this is actually better practice.

### Vercel Config -- PASS

New cron entry follows the exact same structure. `*/15 * * * *` schedule matches the overdue-reminders cron. No conflicts.

---

## Positive Observations

1. **Per-tab error isolation** (lines 153-160): If one Google Sheets tab fails, others continue. Partial sync is reported accurately in `details` array.
2. **Clean SyncResult interface**: Structured return with tabs_synced, total_rows, per-tab details. Good for monitoring and debugging.
3. **Parallel data fetching** (line 136): All 5 Supabase queries run via `Promise.all`, minimizing total query time.
4. **Vietnamese headers correct**: Tab names and column headers match the CRM's Vietnamese UI.
5. **File size discipline**: 170 lines for the service, 23 for the route. Both under the 200-line limit.
6. **Centralized admin client**: Uses the shared `getAdminClient()` rather than duplicating (better than message-queue-processor).
7. **Activities limited to 500, reminders to 300**: Prevents unbounded growth on high-volume tables.
8. **Idempotent writes**: Clear-then-write pattern means re-runs produce the same result.

---

## Security

| Check | Status |
|-------|--------|
| Cron auth fail-closed | PASS |
| No secrets in API responses | PASS |
| Service account key only read from env | PASS |
| Admin client used (bypasses RLS for full data export) | PASS -- intentional for cron |
| No user input in queries (injection risk) | PASS -- all data from DB |
| Generic error messages (no stack traces) | PASS |

---

## Recommended Actions (Priority Order)

1. **[High] Wrap `sheetsClient()` call in try-catch** to handle malformed `GOOGLE_SERVICE_ACCOUNT_KEY` JSON gracefully (H1)
2. **[Medium] Add `.limit()` to leads and students queries** to prevent unbounded growth (M1)
3. **[Medium] Select only needed columns** instead of `select("*")` for leads/students (M2)
4. **[Low] Rename `d`/`v` helpers** to `fmtDate`/`fmtVal` for readability (L1)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~95% (proper interfaces, typed returns, `unknown` catch) |
| Test Coverage | 0% (no tests exist for this feature) |
| Linting Issues | 0 (matches existing codebase style) |
| Pattern Compliance | 100% (cron route is exact match) |
| File Size Compliance | PASS (170 + 23 lines) |

---

## Unresolved Questions

1. Should the sync include a row count limit in the `SyncResult` to warn when approaching Google Sheets limits (10M cells per spreadsheet)?
2. Is `*/15 * * * *` the right frequency? Every 15 minutes means ~96 syncs/day. If data changes infrequently, `0 * * * *` (hourly) might be more appropriate and reduce API quota usage.
3. Should failed tab syncs trigger a notification to admins, or is the cron response log sufficient?
