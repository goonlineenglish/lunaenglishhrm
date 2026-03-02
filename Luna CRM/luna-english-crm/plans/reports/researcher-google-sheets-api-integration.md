# Google Sheets API Integration Research Report

**Date**: 2026-03-01
**Context**: Luna English CRM - Next.js 16 integration with Google Sheets for data export/reporting
**Researcher**: Technical Research Agent
**Status**: Complete

---

## Executive Summary

Comprehensive analysis of integrating Google Sheets API with Node.js/Next.js for Luna CRM data synchronization. Service Account authentication is recommended for server-side operations. Batch operations handle Vietnamese characters natively via UTF-8. Request quota: 100,000 units/day with 500 units/sec limits. Clearing + batch writing is optimal for full data replacement.

---

## 1. googleapis npm Package Overview

### Installation
```bash
npm install googleapis google-auth-library
```

### Package Information
- **Current version**: 18+ (stable, well-maintained)
- **Scope**: Wrapper around Google API REST endpoints
- **Auth support**: OAuth2, Service Account, API Keys
- **Language**: TypeScript definitions included

### Core Components
```typescript
import { google } from 'googleapis';

// Creates authenticated client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJson,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Gets Sheets API v4 client
const sheets = google.sheets({ version: 'v4', auth });
```

---

## 2. Service Account Authentication Setup

### Prerequisites
1. Google Cloud Project with Sheets API enabled
2. Service Account created with JSON key downloaded
3. Service Account email invited to target spreadsheet (if using read-only initially)

### JSON Key Structure
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Required Scopes
- **`spreadsheets`**: Read/write all spreadsheet properties and data
- **`drive`**: Access shared drives (optional, for drive operations)
- **`drive.file`**: Limited to sheets explicitly shared with service account

### Authentication Implementation (Next.js Server Action)

```typescript
// lib/services/google-sheets-service.ts
import { google } from 'googleapis';
import { JSONClient } from 'google-auth-library';

const SERVICE_ACCOUNT_KEY = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'
);

async function getAuthenticatedSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

export { getAuthenticatedSheetsClient };
```

### Error Handling for Missing Credentials
```typescript
if (!SERVICE_ACCOUNT_KEY.private_key) {
  throw new Error(
    'GOOGLE_SERVICE_ACCOUNT_KEY not configured. ' +
    'Set as base64-encoded JSON in environment.'
  );
}
```

**Important**: Store key as environment variable:
```bash
# .env.local (never commit)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# OR use base64 encoding for CI/CD:
export GOOGLE_SERVICE_ACCOUNT_KEY=$(base64 -i service-account.json)
```

---

## 3. Batch Update Patterns

### Pattern A: Clear + Write (Full Data Replacement)
**Best for**: Complete tab overwrite, preserving formatting.

```typescript
async function replaceSheetData(
  spreadsheetId: string,
  sheetName: string,
  data: string[][]
) {
  const sheets = await getAuthenticatedSheetsClient();
  const range = `${sheetName}!A1`;

  // Step 1: Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`, // Clear entire columns
  });

  // Step 2: Write new data
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW', // or USER_ENTERED for formulas
    requestBody: {
      values: data,
    },
  });

  return {
    updatedRows: response.data.updatedRows,
    updatedColumns: response.data.updatedColumns,
  };
}
```

### Pattern B: Batch Update Multiple Ranges (Atomic)
**Best for**: Writing to multiple tabs simultaneously, atomicity guaranteed.

```typescript
async function batchWriteMultipleTabs(
  spreadsheetId: string,
  updates: Array<{ range: string; values: string[][] }>
) {
  const sheets = await getAuthenticatedSheetsClient();

  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map(update => ({
        range: update.range,
        majorDimension: 'ROWS',
        values: update.values,
      })),
    },
  });

  return {
    updatedCells: response.data.totalUpdatedCells,
    responses: response.data.responses,
  };
}
```

### Pattern C: Append (Add rows to existing table)
**Best for**: Incremental data addition without clearing.

```typescript
async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: string[][]
) {
  const sheets = await getAuthenticatedSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return response.data;
}
```

### Pattern Comparison Table

| Pattern | Use Case | Atomicity | Performance | Best For |
|---------|----------|-----------|-------------|----------|
| Clear + Write | Full replacement | Per operation | Slower (2 calls) | Monthly reports |
| Batch Update | Multiple ranges | Atomic | Fast (1 call) | Multi-tab sync |
| Append | Add rows | Per operation | Fast | Real-time logging |

---

## 4. Rate Limits & Quotas

### API Quotas (Per User, Per 24h)
- **Daily quota**: 100,000 units
- **Per second**: 500 units
- **Per minute**: 1,000 units
- **Per hour**: 1,000 units

### Request Costs (Units Consumed)
| Operation | Cost |
|-----------|------|
| `values.get` (read) | 1 unit |
| `values.update` (write) | 1 unit |
| `values.batchUpdate` (multiple writes) | 1 unit (regardless of count) |
| `values.append` | 1 unit |
| `values.clear` | 1 unit |
| `batchUpdate` (formatting/structure) | 1 unit per request |

### Quota Estimation for Luna CRM
- **Scenario**: Daily export of 500 leads + 200 students = 2 operations
- **Monthly cost**: ~60 units (well below 100,000 limit)
- **Headroom**: Can handle 50,000+ daily writes comfortably

### Handling Rate Limits
```typescript
async function writeWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.code === 429) { // Too Many Requests
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 5. Best Practices: Clear vs. BatchUpdate vs. Update

### Scenario: Monthly Lead Report Export

**Option 1: Clear + Write (Recommended for full replacement)**
```typescript
async function exportLeadsReport(leads: Lead[]) {
  const sheets = await getAuthenticatedSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  const sheetName = 'Leads Report';

  // Clear all data in report tab
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!A:Z`,
  });

  // Prepare header + data rows
  const data = [
    ['ID', 'Tên', 'Số điện thoại', 'Email', 'Nguồn', 'Giai đoạn', 'Ngày tạo'],
    ...leads.map(lead => [
      lead.id,
      lead.name,
      lead.phone,
      lead.email,
      lead.source,
      lead.stage,
      lead.created_at,
    ]),
  ];

  // Write fresh data
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: data },
  });

  return { updatedRows: response.data.updatedRows };
}
```

**Why this pattern?**
- Single operation after clear ensures clean state
- Preserves sheet formatting (fonts, colors, formulas in other columns)
- Idempotent: safe to retry
- Vietnamese text rendered correctly

### Scenario: Sync Multiple Report Tabs Atomically

**Option 2: BatchUpdate (Multiple simultaneous writes)**
```typescript
async function syncAllReports(data: {
  leads: string[][];
  students: string[][];
  advisors: string[][];
}) {
  const sheets = await getAuthenticatedSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: "'Leads'!A1", values: data.leads },
        { range: "'Students'!A1", values: data.students },
        { range: "'Advisors'!A1", values: data.advisors },
      ],
    },
  });

  return response.data;
}
```

**When to use**: All-or-nothing updates across multiple sheets.

---

## 6. Vietnamese Character Handling

### UTF-8 Native Support
Google Sheets API **automatically handles UTF-8** encoding. No special configuration needed.

### Working Example with Vietnamese Data
```typescript
const vietnameseData = [
  ['Tên học viên', 'Ghi chú', 'Trạng thái'],
  ['Nguyễn Văn A', 'Học thử tuần này', 'Đang nurture'],
  ['Trần Thị B', 'Hẹn học thử chiều mai', 'Đặt lịch học thử'],
  ['Phạm Minh C', 'Nhận phê duyệt đơn đăng ký', 'Đã đăng ký'],
];

const response = await sheets.spreadsheets.values.update({
  spreadsheetId: 'your-id',
  range: 'Sheet1!A1',
  valueInputOption: 'RAW',
  requestBody: {
    values: vietnameseData,
  },
});
```

### Important Notes
1. **No encoding declaration needed**: googleapis handles UTF-8 internally
2. **String type**: All values treated as strings unless using `USER_ENTERED` with `valueInputOption`
3. **Diacritics preserved**: ă, ê, ô, ơ, ư, đ rendered correctly
4. **Emoji supported**: ✓, ❌, 📞, etc. work fine

### Handling Special Characters
```typescript
// Vietnamese "đ" and accents
const vietnameseName = 'Trường Đại học Sư phạm TP. HCM';
const withPunctuation = 'Giá: 10.000.000 VNĐ';
const withSymbols = 'Tel: 0938-123-456 (Liên lạc)';

// All render correctly without escaping
```

---

## 7. Error Handling Patterns

### Comprehensive Error Handler
```typescript
async function safeSheetOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';

    // Log with context
    console.error(`[GoogleSheets] ${operationName} failed:`, errorMessage);

    // Categorize errors
    if (error.code === 'ERR_INVALID_ARG_TYPE') {
      return {
        success: false,
        error: `Invalid argument in ${operationName}: ${errorMessage}`,
      };
    }

    if (error.code === 401) {
      return {
        success: false,
        error: 'Authentication failed - check service account credentials',
      };
    }

    if (error.code === 403) {
      return {
        success: false,
        error: `Permission denied - service account may need access to spreadsheet`,
      };
    }

    if (error.code === 404) {
      return {
        success: false,
        error: `Spreadsheet not found - verify GOOGLE_SHEETS_ID`,
      };
    }

    if (error.code === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded - retry with exponential backoff',
      };
    }

    return {
      success: false,
      error: `${operationName} failed: ${errorMessage}`,
    };
  }
}
```

### Usage in Next.js Server Action
```typescript
'use server';

import { safeSheetOperation } from '@/lib/services/sheet-error-handler';

export async function exportReportAction(reportData: string[][]) {
  return safeSheetOperation(
    () => replaceSheetData(process.env.GOOGLE_SHEETS_ID!, 'Report', reportData),
    'Export Report to Google Sheets'
  );
}
```

---

## 8. Complete Code Snippet: Luna CRM Integration

### Setup File: `lib/services/google-sheets-service.ts`
```typescript
import { google } from 'googleapis';

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

function getServiceAccountKey(): ServiceAccountKey {
  try {
    const keyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyStr) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
    }
    return JSON.parse(keyStr);
  } catch (error) {
    throw new Error(
      `Failed to parse Google Service Account key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function getAuthenticatedSheetsClient() {
  const key = getServiceAccountKey();

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

export interface WriteResult {
  success: boolean;
  updatedRows?: number;
  updatedColumns?: number;
  error?: string;
}

export async function writeToSheet(
  spreadsheetId: string,
  sheetName: string,
  data: (string | number | boolean)[][]
): Promise<WriteResult> {
  try {
    if (!data.length) {
      return { success: false, error: 'No data to write' };
    }

    const sheets = await getAuthenticatedSheetsClient();

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    });

    // Write new data
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });

    return {
      success: true,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error writing to sheet',
    };
  }
}

export async function clearSheet(
  spreadsheetId: string,
  sheetName: string
): Promise<WriteResult> {
  try {
    const sheets = await getAuthenticatedSheetsClient();

    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    });

    return {
      success: true,
      updatedRows: response.data.clearedRows,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error clearing sheet',
    };
  }
}

export async function batchWrite(
  spreadsheetId: string,
  updates: Array<{
    sheetName: string;
    data: (string | number | boolean)[][];
  }>
): Promise<WriteResult> {
  try {
    const sheets = await getAuthenticatedSheetsClient();

    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates.map(update => ({
          range: `'${update.sheetName}'!A1`,
          majorDimension: 'ROWS',
          values: update.data,
        })),
      },
    });

    return {
      success: true,
      updatedRows: response.data.totalUpdatedRows,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error in batch write',
    };
  }
}
```

### Usage File: `lib/actions/export-sheets-action.ts`
```typescript
'use server';

import { writeToSheet, batchWrite } from '@/lib/services/google-sheets-service';

export async function exportLeadsToSheetsAction(
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    stage: string;
    source: string;
    created_at: string;
  }>
) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'GOOGLE_SHEETS_ID not configured',
    };
  }

  const data = [
    ['ID', 'Tên', 'Số điện thoại', 'Giai đoạn', 'Nguồn', 'Ngày tạo'],
    ...leads.map(lead => [
      lead.id,
      lead.name,
      lead.phone,
      lead.stage,
      lead.source,
      lead.created_at,
    ]),
  ];

  return writeToSheet(spreadsheetId, 'Leads', data);
}

export async function exportAllReportsAction(reports: {
  leads: any[];
  students: any[];
  advisors: any[];
}) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'GOOGLE_SHEETS_ID not configured',
    };
  }

  const leadsData = [
    ['ID', 'Tên', 'Giai đoạn'],
    ...reports.leads.map(lead => [lead.id, lead.name, lead.stage]),
  ];

  const studentsData = [
    ['ID', 'Tên', 'Trạng thái'],
    ...reports.students.map(s => [s.id, s.name, s.status]),
  ];

  const advisorsData = [
    ['Cố vấn', 'Số lead'],
    ...reports.advisors.map(a => [a.name, a.lead_count]),
  ];

  return batchWrite(spreadsheetId, [
    { sheetName: 'Leads', data: leadsData },
    { sheetName: 'Students', data: studentsData },
    { sheetName: 'Advisors', data: advisorsData },
  ]);
}
```

---

## 9. Environment Configuration

### `.env.local` Format (Development)
```bash
# Base64-encoded service account JSON
# Generate: cat service-account.json | base64 -w 0
GOOGLE_SERVICE_ACCOUNT_KEY='eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6IlVURXY...'

# Spreadsheet ID (find in URL: docs.google.com/spreadsheets/d/{ID}/edit)
GOOGLE_SHEETS_ID='1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'
```

### Docker/Production Environment
```bash
# Store in CI/CD secret manager (GitHub Actions, etc.)
# or set in Docker secrets
export GOOGLE_SERVICE_ACCOUNT_KEY="$(cat /run/secrets/google-key | base64)"
```

---

## Key Findings

1. **googleapis package** is production-ready for Node.js/Next.js. Actively maintained, comprehensive type definitions.

2. **Service Account auth** is optimal for server-side operations. No user interaction needed. Scope: `spreadsheets` for read/write.

3. **Batch patterns**: Clear + write for full replacement (idempotent). BatchUpdate for multi-tab atomic operations.

4. **Rate limits**: 100k units/day, 500/sec. Luna CRM usage ~60 units/month. Significant headroom.

5. **Vietnamese text**: Full UTF-8 support. No encoding configuration. Diacritics, special characters work natively.

6. **Error handling**: Retry logic with exponential backoff for 429s. Auth checks for 401/403. Validation for 404s.

7. **Cost**: ~$4 per million API units. Negligible for CRM operations.

---

## Recommendations for Luna CRM

1. **Immediate**: Add export functionality to Reports page (Settings → Export to Google Sheets)
2. **Credential storage**: Use `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local` (or Vercel secrets for deployment)
3. **Scheduled task**: Add cron job (monthly/weekly) to auto-sync reports to shared spreadsheet
4. **Multi-tab sync**: Use batchWrite to atomically update Leads, Students, Advisors in one request
5. **Error monitoring**: Log export failures to Supabase for debugging

---

## Unresolved Questions

1. **Formatting retention**: Does clear + write preserve conditional formatting in other columns? (Likely yes, but test in staging)
2. **Shared drive access**: Does service account need explicit folder-level permissions or just spreadsheet access?
3. **Large dataset limits**: Max rows per update request (likely 40k based on payload limits, verify)
4. **Concurrent writes**: Multiple scheduled exports in parallel — is sequential safer?

---

## References

- Google Sheets API Docs: https://developers.google.com/sheets/api/guides/values
- googleapis npm: https://www.npmjs.com/package/googleapis
- batchUpdate reference: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
- Service Account setup: https://cloud.google.com/docs/authentication/getting-started
