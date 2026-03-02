# Phase 2: Sheets Sync Service + Cron Route

**Effort**: 45 minutes
**Type**: Code — 2 new files, additive only
**Depends on**: Phase 1 complete (env vars set, googleapis installed)

## File 1: `lib/integrations/google-sheets-sync.ts`

### Purpose
- Authenticate with Google Sheets API via Service Account
- Transform Supabase data → 2D arrays with Vietnamese headers
- Write to individual sheet tabs (clear + write pattern)
- Run full sync across all 5 tabs

### Implementation Details

#### Auth Pattern
```typescript
import { google } from "googleapis";

function getSheetsClient() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}
```
- Parse JSON key from env var (not base64)
- Scope: `spreadsheets` (read+write)
- Lazy init — only called when sync runs

#### Write Pattern (per tab)
```
1. Clear range 'TabName'!A:Z
2. Write new data starting at A1 with valueInputOption: RAW
```
- `RAW` prevents Sheets from interpreting formulas in user data
- Clear first to handle rows that were deleted in DB

#### Data Transformers
Use existing `PIPELINE_STAGES` constant for stage label mapping.
Use existing types from `lib/types/leads.ts`.

**Leads tab columns:**
```
Tên học sinh | Tên phụ huynh | SĐT | Email | Nguồn | Giai đoạn | Chương trình | Ghi chú | Ngày tạo | Cập nhật
```

**Học viên tab columns:**
```
Tên | SĐT phụ huynh | Email | Chương trình | Trạng thái | Ngày đăng ký | Ngày hết hạn | Mã giới thiệu
```

**Hoạt động tab columns (last 500):**
```
Lead | Loại | Tiêu đề | Nội dung | Trạng thái | Ngày tạo
```

**Nhắc nhở tab columns (pending/recent):**
```
Lead | Loại | Thời gian nhắc | Trạng thái | Ghi chú | Ngày tạo
```

**Tổng quan tab:**
```
Row 1: "Tổng quan Luna English CRM"
Row 2: "Cập nhật lúc: {timestamp}"
Row 3: empty
Row 4: "Chỉ số" | "Giá trị"
Row 5: "Tổng leads" | count
Row 6: "Đã đăng ký" | count
Row 7: "Tỷ lệ chuyển đổi" | percentage
Row 8: "Tổng học viên" | count
Row 9: empty
Row 10: "Leads theo giai đoạn"
Row 11+: stage | count (from lead_funnel view)
Row N: empty
Row N+1: "Leads theo nguồn"
Row N+2+: source | count (from lead_source_breakdown view)
```

#### Sync orchestrator
```typescript
export async function syncAllToSheets(): Promise<SyncResult> {
  // 1. Query all data from Supabase (admin client, parallel)
  // 2. Transform each dataset → 2D array
  // 3. Write each tab sequentially (avoid rate limits)
  // 4. Return summary { tabs_synced, total_rows, errors }
}
```

- Use `getAdminClient()` from `lib/supabase/admin.ts` — bypasses RLS
- Fetch all tables in parallel with `Promise.all()`
- Write tabs sequentially to stay well within rate limits
- Log each tab result for debugging

### Error Handling
- Missing env vars → return `{ error: "..." }`, don't crash
- Google API errors → catch, log, include in result
- Partial failure → continue syncing other tabs, report which failed
- Empty tables → write header row only (no error)

### Size Limit
- File must be under 200 lines
- Keep transformers inline (simple map functions)
- Reuse `PIPELINE_STAGES` for label lookups

---

## File 2: `app/api/cron/sync-google-sheets/route.ts`

### Purpose
Cron endpoint — called every 15 minutes by external scheduler.

### Pattern
Follow exact same pattern as `app/api/cron/process-message-queue/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { syncAllToSheets } from "@/lib/integrations/google-sheets-sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllToSheets();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- Fail-closed auth (deny if CRON_SECRET missing)
- Delegates to `syncAllToSheets()`
- Returns JSON summary

### Cron Scheduling
For homeserver deployment, add to crontab:
```bash
*/15 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-google-sheets
```

For Vercel, add to `vercel.json`:
```json
{ "path": "/api/cron/sync-google-sheets", "schedule": "*/15 * * * *" }
```

---

## Verification Checklist
- [ ] `npm run build` passes with no errors
- [ ] Cron endpoint returns 401 without auth header
- [ ] Cron endpoint returns 401 with wrong secret
- [ ] With valid auth + env vars: syncs all 5 tabs
- [ ] Vietnamese characters display correctly in Sheet
- [ ] Empty tables produce header-only rows (no crash)
- [ ] Missing GOOGLE_SERVICE_ACCOUNT_KEY returns error (doesn't crash)
- [ ] Missing GOOGLE_SHEET_ID returns error (doesn't crash)
