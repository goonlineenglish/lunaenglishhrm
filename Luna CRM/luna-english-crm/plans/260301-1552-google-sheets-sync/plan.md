# Google Sheets Sync — 1-Way (Supabase → Sheets)

**Status**: pending
**Created**: 2026-03-01
**Scope**: Additive only — no changes to existing code

## Problem

Nhân viên Luna English muốn xem data CRM trực tiếp trên Google Sheets mà không cần đăng nhập app. Hiện tại data chỉ xem được qua web app.

## Solution

Cron job chạy mỗi 15 phút, query Supabase → ghi đè lên Google Sheet. Giữ Supabase làm source of truth.

```
Supabase DB ──(cron /15min)──→ Google Sheets API ──→ 5 tabs
```

## Sheet Tabs

| Tab | Source Table | Columns |
|-----|-------------|---------|
| `Leads` | leads | Tên HS, Tên PH, SĐT, Email, Nguồn, Giai đoạn, Chương trình, Cố vấn, Ngày tạo |
| `Học viên` | students | Tên, SĐT PH, Email, Chương trình, Trạng thái, Ngày ĐK, Hết hạn |
| `Hoạt động` | lead_activities | Lead, Loại, Nội dung, Người tạo, Ngày |
| `Nhắc nhở` | follow_up_reminders | Lead, Loại, Thời gian, Trạng thái, Ghi chú |
| `Tổng quan` | aggregated | KPI summary: tổng leads, conversion, by stage, by source |

## New Files (4 files)

1. `lib/integrations/google-sheets-sync.ts` — Google Sheets client + data transformers
2. `app/api/cron/sync-google-sheets/route.ts` — Cron endpoint
3. `.env.local` additions — 2 new env vars

## Phases

| # | Phase | Files | Effort |
|---|-------|-------|--------|
| 1 | Google Cloud Setup (manual) | docs only | 15min |
| 2 | Sheets sync service + cron route | 2 files | 45min |
| 3 | Test & verify | manual | 15min |

## Env Vars (new)

```
GOOGLE_SERVICE_ACCOUNT_KEY=<JSON string of service account key>
GOOGLE_SHEET_ID=<spreadsheet ID from URL>
```

## Dependencies

- `googleapis` npm package (~2MB)
- Google Cloud project with Sheets API enabled
- Service Account with Editor access to the Sheet

## Risks

- Google Sheets API quota: 300 req/min — sync uses ~12 req per run (5 clear + 5 write + overhead). No risk.
- Sheet data is 15min behind real-time — acceptable for read-only view
- If someone edits Sheet manually, next sync overwrites their changes
