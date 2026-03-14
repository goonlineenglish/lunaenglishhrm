# Phase 5: Save Logic + Excel Export

**Priority:** High
**Status:** ✅ completed
**Effort:** ~1h (actual: completed)
**Depends on:** Phase 4 (UI must render correctly first)

## Context Links

- Payslip save: `lib/actions/payroll-payslip-actions.ts`
- Excel export: `lib/utils/excel-payroll-export.ts` (137 lines)
- Types: `lib/types/database-payroll-types.ts` (EditablePayslipFields, ClassBreakdownEntry)

## Overview

Update save logic to persist `class_breakdown` JSONB. Update Excel export to expand per-class rows.

## File Changes

### 1. `lib/actions/payroll-payslip-actions.ts` (EDIT)

**Add `class_breakdown` to editable keys + validation:**

```typescript
const EDITABLE_KEYS = [
  'kpi_bonus', 'allowances', 'deductions', 'penalties', 'other_pay',
  'bhxh', 'bhyt', 'bhtn', 'tncn', 'gross_pay', 'net_pay', 'extra_notes',
  'class_breakdown', 'teaching_pay', 'sessions_worked', // NEW
] as const

// In sanitizeBatchFields():
// ISSUE-13 FIX: class_breakdown is JSONB — validate array + entries + recalc amount server-side
if (k === 'class_breakdown') {
  if (!Array.isArray(v)) return `class_breakdown phải là mảng.`
  if ((v as unknown[]).length > 50) return `class_breakdown quá lớn.`
  const validated = []
  for (const entry of v as ClassBreakdownEntry[]) {
    if (typeof entry.sessions !== 'number' || entry.sessions < 0) {
      return `class_breakdown: sessions không hợp lệ.`
    }
    if (typeof entry.rate !== 'number' || entry.rate < 0) {
      return `class_breakdown: rate không hợp lệ.`
    }
    if (typeof entry.class_code !== 'string' || !entry.class_code.trim()) {
      return `class_breakdown: class_code không hợp lệ.`
    }
    // Server-side recalculation — never trust client-sent amount
    validated.push({
      ...entry,
      amount: entry.sessions * entry.rate,
    })
  }
  safe[k] = validated
  continue
}

// teaching_pay and sessions_worked are numeric — already handled by NUMERIC_EDITABLE_KEYS
```

**Update NUMERIC_EDITABLE_KEYS:**
```typescript
const NUMERIC_EDITABLE_KEYS = new Set<string>([
  'kpi_bonus', 'allowances', 'deductions', 'penalties', 'other_pay',
  'bhxh', 'bhyt', 'bhtn', 'tncn', 'gross_pay', 'net_pay',
  'teaching_pay', 'sessions_worked', // NEW
])
```

### 2. `lib/utils/excel-payroll-export.ts` (EDIT — moderate)

**Change from 1-row-per-employee to per-class-rows for teaching staff.**

**Updated `buildSheetData()`:**

```typescript
function buildSheetData(payslips: PayslipWithEmployee[]): (string | number)[][] {
  const HEADERS = [
    'STT', 'Mã NV', 'Họ tên', 'Lớp', 'Số buổi', 'Đơn giá', 'Thành tiền',
    'Dạy thay', 'KPI', 'Phụ cấp', 'Khác (+)', 'GROSS',
    'BHXH', 'BHYT', 'BHTN', 'TNCN', 'Phạt', 'Khấu trừ', 'NET', 'Ghi chú',
  ]

  const rows: (string | number)[][] = [HEADERS]
  let stt = 1
  // Totals accumulators
  let totGross = 0, totNet = 0, totBHXH = 0, totBHYT = 0, totBHTN = 0, totTNCN = 0

  for (const p of payslips) {
    const breakdown = (p.class_breakdown ?? []) as ClassBreakdownEntry[]

    if (breakdown.length > 0) {
      // Per-class rows
      for (const cls of breakdown) {
        rows.push([
          stt++, p.employee_code, p.employee_name,
          cls.class_code, cls.sessions, cls.rate, cls.amount,
          '', '', '', '', '', '', '', '', '', '', '', '', '',
        ])
      }
      // Employee summary row (bold styling applied via cell formatting)
      rows.push([
        '', '', `TỔNG ${p.employee_name}`, '',
        p.sessions_worked ?? 0, '', p.teaching_pay ?? 0,
        p.substitute_pay ?? 0, p.kpi_bonus ?? 0,
        p.allowances ?? 0, p.other_pay ?? 0, p.gross_pay ?? 0,
        p.bhxh ?? 0, p.bhyt ?? 0, p.bhtn ?? 0, p.tncn ?? 0,
        p.penalties ?? 0, p.deductions ?? 0, p.net_pay ?? 0,
        p.extra_notes ?? '',
      ])
    } else {
      // Office/admin — single row (no class breakdown)
      rows.push([
        stt++, p.employee_code, p.employee_name, '',
        p.sessions_worked ?? 0, p.rate_per_session ?? 0, p.teaching_pay ?? 0,
        p.substitute_pay ?? 0, p.kpi_bonus ?? 0,
        p.allowances ?? 0, p.other_pay ?? 0, p.gross_pay ?? 0,
        p.bhxh ?? 0, p.bhyt ?? 0, p.bhtn ?? 0, p.tncn ?? 0,
        p.penalties ?? 0, p.deductions ?? 0, p.net_pay ?? 0,
        p.extra_notes ?? '',
      ])
    }

    totGross += p.gross_pay ?? 0
    totNet += p.net_pay ?? 0
    totBHXH += p.bhxh ?? 0
    totBHYT += p.bhyt ?? 0
    totBHTN += p.bhtn ?? 0
    totTNCN += p.tncn ?? 0
  }

  // Grand total row
  rows.push([
    '', '', 'TỔNG CỘNG', '', '', '', '',
    '', '', '', '', totGross,
    totBHXH, totBHYT, totBHTN, totTNCN,
    '', '', totNet, '',
  ])

  return rows
}
```

**Update column widths** to match new 20-column layout:
```typescript
const COL_WIDTHS = [
  { wch: 5 },   // STT
  { wch: 10 },  // Mã NV
  { wch: 22 },  // Họ tên
  { wch: 10 },  // Lớp (NEW)
  { wch: 8 },   // Số buổi
  { wch: 10 },  // Đơn giá
  { wch: 12 },  // Thành tiền
  { wch: 10 },  // Dạy thay
  { wch: 10 },  // KPI
  { wch: 10 },  // Phụ cấp
  { wch: 10 },  // Khác (+)
  { wch: 14 },  // GROSS
  { wch: 10 },  // BHXH
  { wch: 10 },  // BHYT
  { wch: 10 },  // BHTN
  { wch: 10 },  // TNCN
  { wch: 10 },  // Phạt
  { wch: 10 },  // Khấu trừ
  { wch: 14 },  // NET
  { wch: 20 },  // Ghi chú
]
```

### 3. `lib/services/payroll-audit-service.ts` (EDIT — minor)

Add class_breakdown to audit diff handling:

```typescript
// In buildPayslipDiff():
// class_breakdown is JSONB — use JSON.stringify for comparison
if (key === 'class_breakdown') {
  const normOld = JSON.stringify(oldVal ?? [])
  const normNew = JSON.stringify(newVal ?? [])
  if (normOld === normNew) continue
  diff.push({ field: key, old_value: normOld, new_value: normNew })
  continue
}
```

## Implementation Steps

1. Update `payroll-payslip-actions.ts`:
   a. Add class_breakdown/teaching_pay/sessions_worked to EDITABLE_KEYS
   b. Add JSONB validation with server-side amount recalculation (ISSUE-13 fix)
   c. **ISSUE-6 FIX**: Update the `.select()` in `batchUpdatePayslips` to include `class_breakdown, teaching_pay, sessions_worked` in the old-value fetch for audit diff
2. Update `payroll-audit-service.ts`:
   a. JSONB diff handling for class_breakdown
   b. **ISSUE-6 FIX**: Add `teaching_pay` and `sessions_worked` to `AUDITED_FIELDS` array
3. Update `excel-payroll-export.ts` — per-class row expansion, new column layout
4. `npm run build` to verify
5. Test: edit class sessions/rate → save → verify DB has updated class_breakdown
6. Test: export Excel → verify per-class rows with summary per employee
7. Test: verify audit log shows class_breakdown/teaching_pay/sessions_worked changes

## Validation

- [ ] batchUpdatePayslips persists class_breakdown JSONB correctly
- [ ] class_breakdown validation rejects non-array and invalid entries
- [ ] teaching_pay + sessions_worked save alongside class_breakdown
- [ ] Excel export shows per-class rows for teaching staff
- [ ] Excel shows single row for office/admin (no class breakdown)
- [ ] Excel summary row per employee shows totals
- [ ] Excel grand total row correct
- [ ] Audit log captures class_breakdown changes
- [ ] Build passes

## Risk

| Risk | Mitigation |
|------|-----------|
| JSONB size — many classes | Max ~10 classes per employee, negligible |
| Excel row count increase | At most 3x rows — still small per branch |
| Audit diff readability for JSONB | JSON.stringify comparison — shows before/after as strings |
