# Phase 1: Google Cloud Setup (Manual)

**Effort**: 15 minutes
**Type**: Manual configuration — no code changes

## Steps

### 1.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create project: "Luna English CRM"
3. Enable **Google Sheets API** (APIs & Services → Enable APIs)

### 1.2 Create Service Account
1. IAM & Admin → Service Accounts → Create
2. Name: `luna-crm-sheets-sync`
3. No roles needed (Sheets access is via sharing, not IAM)
4. Create Key → JSON → Download

### 1.3 Create Google Sheet
1. Create new Google Sheet: "Luna English CRM Data"
2. Create 5 tabs (rename Sheet1 and add 4 more):
   - `Leads`
   - `Học viên`
   - `Hoạt động`
   - `Nhắc nhở`
   - `Tổng quan`
3. Copy Spreadsheet ID from URL: `docs.google.com/spreadsheets/d/{THIS_ID}/edit`

### 1.4 Share Sheet with Service Account
1. Click "Share" on the Google Sheet
2. Paste Service Account email: `luna-crm-sheets-sync@{project-id}.iam.gserviceaccount.com`
3. Set permission: **Editor**

### 1.5 Set Environment Variables
Add to `.env.local`:
```bash
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"...","token_uri":"..."}'
GOOGLE_SHEET_ID='1a2b3c4d...'
```

**Note**: The key is the full JSON content (not base64). Wrap in single quotes to preserve special chars.

### 1.6 Install googleapis package
```bash
npm install googleapis
```

## Verification
- [ ] Google Cloud project created
- [ ] Sheets API enabled
- [ ] Service Account created with JSON key
- [ ] Google Sheet created with 5 tabs
- [ ] Sheet shared with Service Account email (Editor)
- [ ] Env vars added to `.env.local`
- [ ] `googleapis` installed
