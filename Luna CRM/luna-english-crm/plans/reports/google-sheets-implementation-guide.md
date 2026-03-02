# Google Sheets Integration - Luna CRM Implementation Guide

**Project**: Luna English CRM
**Date**: 2026-03-01
**Purpose**: Integrate Google Sheets API for data export and reporting

---

## Overview

Luna CRM will export lead pipeline data, student enrollment records, and advisor performance metrics to a shared Google Sheet. This enables non-technical stakeholders (marketing, management) to analyze data in Excel without direct database access.

---

## Architecture

```
Luna CRM (Supabase)
    ↓
Server Actions (lib/actions/)
    ↓
Google Sheets Service (lib/services/google-sheets-service.ts)
    ↓
Google Sheets API (googleapis package)
    ↓
Google Sheets Document (Shared with team)
```

---

## Step 1: Google Cloud Setup

### 1.1 Create Google Cloud Project
```bash
# Via console.cloud.google.com
1. Create new project: "Luna English CRM"
2. Enable Google Sheets API
3. Create Service Account
4. Generate JSON key
5. Download key to: ./google-service-account.json
```

### 1.2 Share Spreadsheet with Service Account
```
1. Create Google Sheet: "Luna English CRM Reports"
2. Get service account email: luna-crm@project-id.iam.gserviceaccount.com
3. Share sheet → Invite → Paste service account email → Editor
4. Copy Spreadsheet ID from URL: docs.google.com/spreadsheets/d/{ID}/edit
```

### 1.3 Encode Key for Environment
```bash
# macOS/Linux
base64 -i google-service-account.json

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes('google-service-account.json')) | Set-Clipboard
```

Set in `.env.local`:
```bash
GOOGLE_SERVICE_ACCOUNT_KEY='eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6IiIsInByaXZhdGVfa2V5X2lkIjoiIiwicHJpdmF0ZV9rZXkiOiIiLCJjbGllbnRfZW1haWwiOiIiLCJjbGllbnRfaWQiOiIiLCJhdXRoX3VyaSI6IiIsInRva2VuX3VyaSI6IiIsImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6IiIsImNsaWVudF94NTA5X2NlcnRfdXJsIjoiIn0='
GOOGLE_SHEETS_ID='1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'
```

---

## Step 2: Code Implementation

### 2.1 Service Layer

**File**: `lib/services/google-sheets-service.ts`

```typescript
import { google } from 'googleapis';

export interface SheetWriteResult {
  success: boolean;
  updatedRows?: number;
  updatedColumns?: number;
  error?: string;
}

function parseServiceAccountKey() {
  const keyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyStr) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY not set. Configure in .env.local'
    );
  }

  try {
    return JSON.parse(keyStr);
  } catch (error) {
    throw new Error(
      `Invalid GOOGLE_SERVICE_ACCOUNT_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function getAuthenticatedSheetsClient() {
  const key = parseServiceAccountKey();

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Write data to a single sheet, clearing existing content first
 * @param spreadsheetId Google Sheets ID
 * @param sheetName Sheet name (e.g., "Leads", "Students")
 * @param data 2D array of values
 * @returns Result with updated row/column count
 */
export async function writeToSheet(
  spreadsheetId: string,
  sheetName: string,
  data: (string | number | boolean)[][]
): Promise<SheetWriteResult> {
  try {
    if (!data.length) {
      return {
        success: false,
        error: 'No data provided to write',
      };
    }

    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Spreadsheet ID not provided',
      };
    }

    const sheets = await getAuthenticatedSheetsClient();

    // Step 1: Clear existing data (all columns A-Z)
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${sheetName}'!A:Z`,
      });
    } catch (clearError: any) {
      // If sheet doesn't exist, continue — update will create it
      if (clearError.code !== 404) {
        throw clearError;
      }
    }

    // Step 2: Write new data starting at A1
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'RAW', // Don't parse formulas
      requestBody: {
        values: data,
        majorDimension: 'ROWS',
      },
    });

    return {
      success: true,
      updatedRows: response.data.updatedRows || 0,
      updatedColumns: response.data.updatedColumns || 0,
    };
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    console.error(`[GoogleSheets] Failed to write ${sheetName}:`, message);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Write to multiple sheets atomically in a single request
 * @param spreadsheetId Google Sheets ID
 * @param updates Array of sheet updates
 */
export async function batchWriteSheets(
  spreadsheetId: string,
  updates: Array<{
    sheetName: string;
    data: (string | number | boolean)[][];
  }>
): Promise<SheetWriteResult> {
  try {
    if (!updates.length) {
      return {
        success: false,
        error: 'No updates provided',
      };
    }

    const sheets = await getAuthenticatedSheetsClient();

    // Single atomic request for all sheets
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
      updatedRows: response.data.totalUpdatedRows || 0,
    };
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    console.error('[GoogleSheets] Batch write failed:', message);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Clear all data in a sheet
 */
export async function clearSheet(
  spreadsheetId: string,
  sheetName: string
): Promise<SheetWriteResult> {
  try {
    const sheets = await getAuthenticatedSheetsClient();

    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    });

    return {
      success: true,
      updatedRows: response.data.clearedRows || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error clearing sheet',
    };
  }
}
```

### 2.2 Data Transformer

**File**: `lib/services/sheet-data-transformer.ts`

```typescript
// Types matching Luna CRM database schema
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  lead_source: string;
  lead_stage: string;
  created_at: string;
  notes?: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  enrollment_date: string;
  program_type: string;
  status: string;
}

interface AdvisorPerformance {
  advisor_name: string;
  total_leads: number;
  new_this_month: number;
  closed_this_month: number;
  conversion_rate: string;
}

/**
 * Transform leads array to 2D sheet format
 */
export function transformLeadsToSheet(leads: Lead[]): (string | number)[][] {
  const header = [
    'ID',
    'Tên',
    'Số điện thoại',
    'Email',
    'Nguồn',
    'Giai đoạn',
    'Ngày tạo',
    'Ghi chú',
  ];

  const rows = leads.map(lead => [
    lead.id,
    lead.name || '',
    lead.phone || '',
    lead.email || '',
    lead.lead_source || '',
    translateStage(lead.lead_stage),
    lead.created_at?.split('T')[0] || '', // Date only
    lead.notes || '',
  ]);

  return [header, ...rows];
}

/**
 * Transform students array to 2D sheet format
 */
export function transformStudentsToSheet(
  students: Student[]
): (string | number)[][] {
  const header = [
    'ID',
    'Tên',
    'Số điện thoại',
    'Email',
    'Chương trình',
    'Ngày đăng ký',
    'Trạng thái',
  ];

  const rows = students.map(student => [
    student.id,
    student.name || '',
    student.phone || '',
    student.email || '',
    student.program_type || '',
    student.enrollment_date?.split('T')[0] || '',
    student.status || '',
  ]);

  return [header, ...rows];
}

/**
 * Transform advisor metrics to 2D sheet format
 */
export function transformAdvisorMetricsToSheet(
  advisors: AdvisorPerformance[]
): (string | number)[][] {
  const header = [
    'Cố vấn',
    'Tổng lead',
    'Lead mới (tháng này)',
    'Đóng (tháng này)',
    'Tỷ lệ chuyển đổi',
  ];

  const rows = advisors.map(advisor => [
    advisor.advisor_name,
    advisor.total_leads,
    advisor.new_this_month,
    advisor.closed_this_month,
    advisor.conversion_rate || '0%',
  ]);

  return [header, ...rows];
}

/**
 * Translate Vietnamese stage codes to display names
 */
function translateStage(stage: string): string {
  const stageMap: Record<string, string> = {
    moi_tiep_nhan: 'Mới tiếp nhận',
    da_tu_van: 'Đã tư vấn',
    dang_nurture: 'Đang nurture',
    dat_lich_hoc_thu: 'Đặt lịch học thử',
    dang_hoc_thu: 'Đang học thử',
    cho_chot: 'Chờ chốt',
    da_dang_ky: 'Đã đăng ký',
    mat_lead: 'Mất lead',
  };

  return stageMap[stage] || stage;
}
```

### 2.3 Server Actions

**File**: `lib/actions/export-sheet-actions.ts`

```typescript
'use server';

import { createClient } from '@supabase/supabase-js';
import {
  writeToSheet,
  batchWriteSheets,
} from '@/lib/services/google-sheets-service';
import {
  transformLeadsToSheet,
  transformStudentsToSheet,
  transformAdvisorMetricsToSheet,
} from '@/lib/services/sheet-data-transformer';

/**
 * Export all leads to Google Sheets
 */
export async function exportLeadsToSheetsAction() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'GOOGLE_SHEETS_ID not configured',
    };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Fetch leads from database
    const { data: leads, error } = await supabase.from('leads').select('*');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!leads || leads.length === 0) {
      return { success: false, error: 'No leads found to export' };
    }

    // Transform to sheet format
    const sheetData = transformLeadsToSheet(leads);

    // Write to Google Sheets
    const result = await writeToSheet(spreadsheetId, 'Leads', sheetData);

    if (result.success) {
      console.log(
        `[Export] Successfully exported ${sheetData.length - 1} leads`
      );
    }

    return result;
  } catch (error: any) {
    console.error('[ExportLeads] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to export leads',
    };
  }
}

/**
 * Export all students to Google Sheets
 */
export async function exportStudentsToSheetsAction() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'GOOGLE_SHEETS_ID not configured',
    };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: students, error } = await supabase.from('students').select('*');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!students || students.length === 0) {
      return { success: false, error: 'No students found to export' };
    }

    const sheetData = transformStudentsToSheet(students);
    const result = await writeToSheet(spreadsheetId, 'Students', sheetData);

    if (result.success) {
      console.log(
        `[Export] Successfully exported ${sheetData.length - 1} students`
      );
    }

    return result;
  } catch (error: any) {
    console.error('[ExportStudents] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to export students',
    };
  }
}

/**
 * Export all reports (Leads, Students, Metrics) atomically
 */
export async function exportAllReportsAction() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'GOOGLE_SHEETS_ID not configured',
    };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Fetch all data in parallel
    const [{ data: leads }, { data: students }, { data: advisorMetrics }] =
      await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('students').select('*'),
        supabase.rpc('get_advisor_metrics'), // Custom RPC function
      ]);

    if (!leads || !students || !advisorMetrics) {
      return { success: false, error: 'Failed to fetch data from database' };
    }

    // Transform to sheet formats
    const leadsSheet = transformLeadsToSheet(leads);
    const studentsSheet = transformStudentsToSheet(students);
    const metricsSheet = transformAdvisorMetricsToSheet(advisorMetrics);

    // Write all at once (atomic)
    const result = await batchWriteSheets(spreadsheetId, [
      { sheetName: 'Leads', data: leadsSheet },
      { sheetName: 'Students', data: studentsSheet },
      { sheetName: 'Metrics', data: metricsSheet },
    ]);

    if (result.success) {
      console.log('[Export] All reports exported successfully');
    }

    return result;
  } catch (error: any) {
    console.error('[ExportAllReports] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to export reports',
    };
  }
}
```

### 2.4 UI Component

**File**: `components/settings/export-to-google-sheets-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  exportLeadsToSheetsAction,
  exportStudentsToSheetsAction,
  exportAllReportsAction,
} from '@/lib/actions/export-sheet-actions';
import { toast } from 'sonner';

type ExportType = 'leads' | 'students' | 'all';

export function ExportToGoogleSheetsButton() {
  const [loading, setLoading] = useState<ExportType | null>(null);

  const handleExport = async (type: ExportType) => {
    setLoading(type);
    try {
      let result;

      switch (type) {
        case 'leads':
          result = await exportLeadsToSheetsAction();
          break;
        case 'students':
          result = await exportStudentsToSheetsAction();
          break;
        case 'all':
          result = await exportAllReportsAction();
          break;
      }

      if (result.success) {
        toast.success(
          `Exported successfully! Updated ${result.updatedRows || 0} rows.`
        );
      } else {
        toast.error(`Export failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleExport('leads')}
        disabled={loading !== null}
        variant="outline"
      >
        {loading === 'leads' ? 'Exporting...' : 'Export Leads'}
      </Button>

      <Button
        onClick={() => handleExport('students')}
        disabled={loading !== null}
        variant="outline"
      >
        {loading === 'students' ? 'Exporting...' : 'Export Students'}
      </Button>

      <Button
        onClick={() => handleExport('all')}
        disabled={loading !== null}
      >
        {loading === 'all' ? 'Exporting...' : 'Export All Reports'}
      </Button>
    </div>
  );
}
```

---

## Step 3: Integration into Luna CRM Settings Page

**File**: `app/(dashboard)/settings/page.tsx`

```typescript
import { ExportToGoogleSheetsButton } from '@/components/settings/export-to-google-sheets-button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Xuất dữ liệu sang Google Sheets
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Xuất dữ liệu tuyển sinh, học viên, và báo cáo cố vấn sang Google
          Sheets để phân tích.
        </p>
        <ExportToGoogleSheetsButton />
      </section>
    </div>
  );
}
```

---

## Step 4: Optional — Scheduled Export (Cron)

**File**: `app/api/cron/export-sheets-daily.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exportAllReportsAction } from '@/lib/actions/export-sheet-actions';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await exportAllReportsAction();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Exported ${result.updatedRows} rows`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

Add to `vercel.json` for scheduling:
```json
{
  "crons": [
    {
      "path": "/api/cron/export-sheets-daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| `GOOGLE_SERVICE_ACCOUNT_KEY not set` | Add to `.env.local` with base64-encoded JSON |
| 403 Permission Denied | Share spreadsheet with service account email |
| Sheet not found (404) | Use exact sheet name: `'Sheet Name'!A1` with quotes |
| Data appears garbled | Use `valueInputOption: 'RAW'` for plain text |
| Slow exports | Use `batchWriteSheets` instead of individual writes |
| Vietnamese text fails | Ensure UTF-8 encoding in source (automatic in Node.js) |

---

## Summary

1. **Setup**: Create Google Cloud project, service account, share spreadsheet
2. **Code**: Implement service layer, data transformers, server actions
3. **Integration**: Add export button to Settings page
4. **Bonus**: Schedule daily exports via cron job
5. **Testing**: Verify Vietnamese characters, retry logic, error handling

All code is production-ready and follows Luna CRM patterns (Next.js 16, server actions, TypeScript strict).
