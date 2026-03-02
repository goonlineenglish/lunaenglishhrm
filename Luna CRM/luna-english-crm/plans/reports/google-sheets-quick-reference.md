# Google Sheets API Quick Reference

**Location**: Luna CRM Research Report
**Date**: 2026-03-01

---

## Quick Setup Checklist

- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Create Service Account with JSON key
- [ ] Set `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local`
- [ ] Set `GOOGLE_SHEETS_ID` (spreadsheet ID)
- [ ] Share spreadsheet with service account email
- [ ] Install: `npm install googleapis`

---

## Minimal Working Example

```typescript
// lib/services/google-sheets-service.ts
import { google } from 'googleapis';

async function getAuthenticatedSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

export async function writeToSheet(
  spreadsheetId: string,
  sheetName: string,
  data: string[][]
) {
  const sheets = await getAuthenticatedSheetsClient();

  // Clear
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!A:Z`,
  });

  // Write
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: data },
  });

  return { success: true, updatedRows: res.data.updatedRows };
}
```

---

## Common Operations

### Read Data
```typescript
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: 'sheet-id',
  range: 'Sheet1!A1:D10',
});
console.log(response.data.values);
```

### Write Single Range
```typescript
await sheets.spreadsheets.values.update({
  spreadsheetId: 'sheet-id',
  range: 'Sheet1!A1',
  valueInputOption: 'RAW',
  requestBody: {
    values: [
      ['Name', 'Email', 'Phone'],
      ['Nguyễn Văn A', 'nguyenvana@example.com', '0938123456'],
    ],
  },
});
```

### Batch Write Multiple Tabs
```typescript
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: 'sheet-id',
  requestBody: {
    valueInputOption: 'RAW',
    data: [
      {
        range: 'Leads!A1',
        values: [[...], [...]], // Leads data
      },
      {
        range: 'Students!A1',
        values: [[...], [...]], // Students data
      },
    ],
  },
});
```

### Clear Sheet
```typescript
await sheets.spreadsheets.values.clear({
  spreadsheetId: 'sheet-id',
  range: 'Sheet1!A:Z',
});
```

### Append Rows
```typescript
await sheets.spreadsheets.values.append({
  spreadsheetId: 'sheet-id',
  range: 'Sheet1!A1',
  valueInputOption: 'USER_ENTERED',
  requestBody: {
    values: [['New', 'Row', 'Data']],
  },
});
```

---

## Rate Limits Summary

| Metric | Limit |
|--------|-------|
| Daily quota | 100,000 units |
| Per second | 500 units |
| Per minute | 1,000 units |
| Per hour | 1,000 units |
| Cost per million units | ~$4 |

**Each operation costs 1 unit** (get, update, clear, append, batchUpdate)

---

## Error Handling Template

```typescript
try {
  const result = await sheets.spreadsheets.values.update({...});
  return { success: true, data: result.data };
} catch (error: any) {
  if (error.code === 429) {
    // Rate limited — retry with exponential backoff
  } else if (error.code === 401) {
    // Auth failed — check credentials
  } else if (error.code === 403) {
    // Permission denied — share spreadsheet with service account
  } else if (error.code === 404) {
    // Not found — verify spreadsheet ID
  }
  return { success: false, error: error.message };
}
```

---

## Vietnamese Character Support

Works natively — no special configuration:

```typescript
const vietnameseData = [
  ['Tên', 'Ghi chú', 'Trạng thái'],
  ['Nguyễn Văn A', 'Học thử tuần này', 'Đang nurture'],
  ['Trần Thị B', 'Đã đăng ký', '✓ Hoàn tất'],
];

// Just write normally — UTF-8 handled automatically
```

---

## Environment Variables

```bash
# .env.local
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
GOOGLE_SHEETS_ID='1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o'
```

---

## Next.js Server Action Example

```typescript
// app/actions/export-sheets.ts
'use server';

import { writeToSheet } from '@/lib/services/google-sheets-service';

export async function exportLeadsAction(leads: Lead[]) {
  const data = [
    ['ID', 'Tên', 'Số điện thoại', 'Giai đoạn'],
    ...leads.map(l => [l.id, l.name, l.phone, l.stage]),
  ];

  return writeToSheet(
    process.env.GOOGLE_SHEETS_ID!,
    'Leads',
    data
  );
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check `GOOGLE_SERVICE_ACCOUNT_KEY` format and validity |
| 403 Forbidden | Share spreadsheet with service account `client_email` |
| 404 Not Found | Verify `GOOGLE_SHEETS_ID` matches spreadsheet URL |
| 429 Rate Limited | Implement exponential backoff retry logic |
| UTF-8 garbled | Ensure `valueInputOption: 'RAW'` not `USER_ENTERED` for non-formula data |
| Sheet name not found | Use exact name in quotes: `'Sheet Name'!A1` (with spaces if needed) |

---

## Performance Tips

1. **Use batchUpdate** for multiple sheet writes (1 request instead of N)
2. **Clear + write atomically** for full data replacement
3. **Don't read before write** — assume state is correct
4. **Log operations** for debugging — include spreadsheetId, range, row count
5. **Cache auth client** (Google client handles token refresh internally)

---

## Cost Estimation for Luna CRM

- **Daily export**: 2 operations (Leads + Students) = 2 units
- **Monthly**: ~60 units
- **Annual**: ~720 units
- **Cost at $4/million**: < $0.01/year

Negligible expense.
