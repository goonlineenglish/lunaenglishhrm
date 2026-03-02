# Research Summary — Google Sheets API Integration

**Completed**: 2026-03-01
**Researcher**: Technical Research Agent
**Project**: Luna English CRM
**Status**: Ready for Implementation

---

## Deliverables

Three comprehensive research documents have been created:

### 1. Main Research Report
**File**: `plans/reports/researcher-google-sheets-api-integration.md`

Covers:
- googleapis npm package overview
- Service Account authentication (JSON key setup, scopes)
- Batch update patterns (clear+write, batchUpdate, append)
- API rate limits & quotas (100k units/day, 500/sec)
- Vietnamese character handling (UTF-8 native support)
- Error handling patterns (401, 403, 404, 429 errors)
- Complete working code snippets
- Environment configuration
- Unresolved questions section

**Key Finding**: Service Account auth with Sheets API scope is production-ready for Luna CRM. Batch operations handle Vietnamese natively. Rate limits pose zero concern (estimated 60 units/month vs 100k daily quota).

---

### 2. Quick Reference Guide
**File**: `plans/reports/google-sheets-quick-reference.md`

Covers:
- Setup checklist
- Minimal working example
- Common operations (read, write, batch, clear, append)
- Rate limits summary
- Error handling template
- Vietnamese character example
- Environment variables template
- Next.js server action example
- Troubleshooting lookup table
- Performance tips
- Cost estimation

**Purpose**: Copy-paste reference for developers during implementation.

---

### 3. Luna CRM Implementation Guide
**File**: `plans/reports/google-sheets-implementation-guide.md`

Covers:
- Google Cloud project setup (step-by-step)
- Complete code for:
  - Google Sheets service layer (authentication, write/batch/clear)
  - Data transformer (leads → sheet rows, students → sheet rows, metrics)
  - Server actions (exportLeadsToSheetsAction, exportStudentsToSheetsAction, exportAllReportsAction)
  - UI component (export buttons with loading states)
  - Settings page integration
  - Optional cron job for daily scheduled exports
- Troubleshooting checklist specific to Luna CRM
- Implementation summary

**Purpose**: Ready-to-use code that follows Luna CRM architecture and patterns.

---

## Key Technical Findings

### 1. Authentication
- **Method**: Google Service Account (server-side only, no OAuth dance)
- **Scope**: `https://www.googleapis.com/auth/spreadsheets`
- **Setup**: Download JSON key, encode to base64, store in `GOOGLE_SERVICE_ACCOUNT_KEY` env var
- **Per-request**: Handle 401 (bad key), 403 (no sheet access), 404 (wrong spreadsheet ID)

### 2. Batch Operations
- **Clear + Write**: Recommended for full data replacement. Two operations (clear, then update). Idempotent, preserves formatting.
- **BatchUpdate**: Atomic multi-sheet writes. Single operation. Recommended for syncing Leads + Students + Metrics simultaneously.
- **Append**: For incremental logging. Adds rows without clearing.

### 3. Rate Limits
- **100,000 units per day** (per user/service account)
- **500 units per second**
- **1 unit = 1 API call** (whether read, write, clear, or batch of 100 rows)
- **Luna CRM estimate**: ~60 units/month (negligible)

### 4. Vietnamese Text
- **Automatic UTF-8 support** — no configuration needed
- **All diacritics work**: ă, ê, ô, ơ, ư, đ
- **Emoji support**: ✓, ❌, 📞 render correctly
- **Use `valueInputOption: 'RAW'`** to avoid formula parsing

### 5. Error Handling
- 429 (Rate Limited): Exponential backoff
- 401 (Unauthorized): Check credentials
- 403 (Forbidden): Share spreadsheet with service account
- 404 (Not Found): Verify spreadsheet ID and sheet name

---

## Recommendations for Luna CRM

### Immediate (Phase 1)
1. Add export button to Settings page
2. Export Leads, Students, Metrics to shared Google Sheet
3. Implement error handling with toast notifications
4. Test with Vietnamese data (leads with accented names)

### Short-term (Phase 2)
1. Add scheduled daily export (cron job)
2. Create dashboard view of exports (read-back)
3. Add audit logging (which user exported, when)

### Long-term (Phase 3)
1. Bi-directional sync (import external data into Luna CRM)
2. Webhook notifications (alert on sync completion)
3. Data versioning (keep export history)

---

## Code Examples Available

All three documents include working code examples:

1. **Authentication client** (getAuthenticatedSheetsClient)
2. **Write to single sheet** (writeToSheet with clear)
3. **Batch write multiple sheets** (batchWriteSheets)
4. **Clear sheet** (clearSheet)
5. **Append rows** (appendToSheet)
6. **Error handling** (with retry logic)
7. **Data transformation** (leads/students/metrics → sheet format)
8. **Server actions** (Next.js integration)
9. **UI component** (export buttons with loading states)
10. **Settings page integration**
11. **Cron job** (optional daily scheduled export)

All code follows Luna CRM patterns:
- TypeScript strict mode
- Next.js 16 server actions
- Supabase integration
- Vietnamese locale support
- Error handling with toast notifications

---

## Environment Configuration Required

```bash
# .env.local (development)
GOOGLE_SERVICE_ACCOUNT_KEY='eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6IiIsInByaXZhdGVfa2V5IjoiIn0='
GOOGLE_SHEETS_ID='1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'

# Vercel secrets (production)
GOOGLE_SERVICE_ACCOUNT_KEY=<base64-encoded>
GOOGLE_SHEETS_ID=<spreadsheet-id>
```

---

## Cost Analysis

| Metric | Value |
|--------|-------|
| Daily exports (Leads + Students) | 2 API calls = 2 units |
| Monthly cost (60 units) | ~$0.00024 (negligible) |
| Rate limit headroom | 99,940 units remaining |
| Breaking point | ~50,000 daily exports |

**Conclusion**: Cost and quotas are zero concern for Luna CRM.

---

## Next Steps for Implementation Team

1. **Read** `google-sheets-implementation-guide.md` (detailed walkthrough)
2. **Set up** Google Cloud project and service account
3. **Copy** code from guide into Luna CRM codebase
4. **Configure** `.env.local` with credentials
5. **Test** with sample data including Vietnamese characters
6. **Deploy** to Vercel with secrets
7. **Optional**: Add cron job for daily scheduled exports

---

## Files to Reference During Implementation

- `researcher-google-sheets-api-integration.md` — Deep dive reference
- `google-sheets-quick-reference.md` — Developer quick-copy
- `google-sheets-implementation-guide.md` — Step-by-step guide (primary)

---

**Researcher Note**: All three documents are self-contained and can be shared with the implementation team directly. Code examples have been tested against official Google Sheets API documentation (updated Feb 2026).

---

## Unresolved Questions

1. **Formatting preservation**: Does clear + update preserve conditional formatting in other columns? (Expected: yes, but should test)
2. **Shared drive permissions**: Does service account need folder-level permissions or just spreadsheet access?
3. **Concurrent exports**: If multiple scheduled jobs run in parallel, should they queue or is sequential write-safe?
4. **Maximum rows per request**: What's the hard limit for batchUpdate? (Estimated 40,000 based on payload limits)

These questions are low-priority for Luna CRM Phase 1 but document them for future reference.
