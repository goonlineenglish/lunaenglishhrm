# Phase 4: Spreadsheet UI Refactor

**Priority:** High
**Status:** ✅ completed
**Effort:** ~2h (actual: completed)
**Depends on:** Phase 3 (class_breakdown data must be populated)

## Context Links

- Spreadsheet: `components/payroll/payroll-spreadsheet.tsx` (227 lines)
- Row component: `components/payroll/payroll-spreadsheet-row.tsx` (166 lines)
- Types: `lib/types/database-payroll-types.ts` (ClassBreakdownEntry, EditablePayslipFields)
- Payroll page: `app/(dashboard)/payroll/[period]/page.tsx` (277 lines)

## Overview

Refactor spreadsheet from 1-row-per-employee to grouped layout: N class rows + optional KPI badge + summary row per employee. Maintain existing dirty state pattern (Map-based per payslip).

## UI Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ # │ Họ tên          │ Lớp   │ Buổi │ Đơn giá  │ Thành tiền             │
├────────────────────────────────────────────────────────────────────────────┤
│   │ Trần Thị Linh                                                       │  ← Employee header
│ 1 │                 │ BC01  │ 8    │ 75,000 ✏ │ 600,000                │  ← Class row
│ 2 │                 │ BC02  │ 10.5 │ 75,000 ✏ │ 787,500                │  ← Class row
│   │ ⭐ KPI: 8.5/10 → +425,000đ [base ✓]                                │  ← KPI badge (assistant only)
│   │ TỔNG LINH       │       │ 18.5 │          │ 1,387,500              │  ← Summary header
│   │   KPI │ Phụ cấp │ Khác+ │ Khấu trừ │ Phạt │ BHXH │ BHYT │ TNCN │ NET  ← Editable summary row
├────────────────────────────────────────────────────────────────────────────┤
│   │ John Smith                                                          │
│ 3 │                 │ TEEN01│ 12   │ 80,000 ✏ │ 960,000                │
│   │ TỔNG SMITH      │       │ 12   │          │ 960,000                │
│   │   ... editable columns ...                                          │
├────────────────────────────────────────────────────────────────────────────┤
│   │ Lê Thị Ngân (VP — no class breakdown)                               │
│   │ TỔNG NGÂN       │       │ 22   │ 100,000  │ 2,200,000              │
│   │   ... editable columns ...                                          │
└────────────────────────────────────────────────────────────────────────────┘
│ TỔNG               │       │      │          │ GROSS: X │ NET: Y       │  ← Footer
```

## File Changes

### 1. NEW: `components/payroll/payroll-class-row.tsx` (~80 lines)

Renders a single class row (read-only or inline edit mode).

```typescript
interface PayrollClassRowProps {
  entry: ClassBreakdownEntry
  index: number
  editing: boolean
  onEdit: (field: 'sessions' | 'rate', value: number) => void
}

export const PayrollClassRow = memo(function PayrollClassRow({
  entry, index, editing, onEdit
}: PayrollClassRowProps) {
  return (
    <tr className="border-b border-muted/30">
      <td className="px-2 py-1 text-xs text-muted-foreground text-center">{index}</td>
      <td className="px-2 py-1"></td> {/* Empty — name shown in header above */}
      <td className="px-2 py-1 text-sm">{entry.class_code}</td>
      <td className="px-2 py-1 text-sm text-right">
        {editing ? (
          <Input type="number" step="0.5" className="h-7 w-16 text-right"
            defaultValue={entry.sessions}
            onBlur={(e) => onEdit('sessions', parseFloat(e.target.value) || 0)} />
        ) : entry.sessions}
      </td>
      <td className="px-2 py-1 text-sm text-right">
        {editing ? (
          <Input type="number" className="h-7 w-20 text-right"
            defaultValue={entry.rate}
            onBlur={(e) => onEdit('rate', parseFloat(e.target.value) || 0)} />
        ) : formatVND(entry.rate)}
      </td>
      <td className="px-2 py-1 text-sm text-right font-medium">
        {formatVND(entry.amount)}
      </td>
      {/* Remaining columns empty for class rows */}
      <td colSpan={12}></td>
    </tr>
  )
})
```

### 2. EDIT: `components/payroll/payroll-spreadsheet.tsx` (MAJOR — grouped layout)

**Key changes:**

a) **Group payslips by employee** instead of flat map:

```typescript
// Group payslips + render grouped
{payslips.map((payslip) => {
  const breakdown = payslip.class_breakdown ?? []
  const hasClasses = breakdown.length > 0
  const isAssistant = payslip.employee_position === 'assistant'
  const localEdits = edits.get(payslip.id)
  const localBreakdown = localEdits?.class_breakdown ?? breakdown

  return (
    <Fragment key={payslip.id}>
      {/* Employee header row — name + code */}
      <tr className="bg-muted/20 border-b">
        <td></td>
        <td colSpan={5} className="px-2 py-1.5 font-medium text-sm">
          {payslip.employee_name}
          <span className="text-muted-foreground ml-1 font-normal">({payslip.employee_code})</span>
        </td>
        <td colSpan={12}>
          {hasClasses && (
            <Button variant="ghost" size="sm" onClick={() => toggleEdit(payslip.id)}>
              <Pencil className="h-3 w-3 mr-1" />Sửa
            </Button>
          )}
        </td>
      </tr>

      {/* Class rows */}
      {localBreakdown.map((entry, idx) => (
        <PayrollClassRow
          key={entry.class_code}
          entry={entry}
          index={classIndex++}
          editing={editingPayslips.has(payslip.id)}
          onEdit={(field, value) => handleClassEdit(payslip.id, idx, field, value)}
        />
      ))}

      {/* KPI badge row — assistant only */}
      {isAssistant && payslip.kpi_bonus > 0 && (
        <tr className="border-b border-muted/20">
          <td></td>
          <td colSpan={17} className="px-2 py-1">
            <Badge variant="secondary" className="text-xs">
              ⭐ KPI: {(payslip.kpi_bonus / 50000).toFixed(1)}/10 → +{formatVND(payslip.kpi_bonus)}
            </Badge>
          </td>
        </tr>
      )}

      {/* Summary row — existing PayrollSpreadsheetRow pattern */}
      <PayrollSpreadsheetRow ... />
    </Fragment>
  )
})}
```

b) **Table header** — add "Lớp" column:

Replace first 6 columns with: #, Họ tên, Lớp, Buổi, Đơn giá, Thành tiền

c) **Class edit handler:**

```typescript
function handleClassEdit(payslipId: string, entryIndex: number, field: 'sessions' | 'rate', value: number) {
  setEdits(prev => {
    const next = new Map(prev)
    const existing = next.get(payslipId) ?? {}
    const payslip = payslips.find(p => p.id === payslipId)!
    const currentBreakdown = [...(existing.class_breakdown ?? payslip.class_breakdown ?? [])]

    currentBreakdown[entryIndex] = {
      ...currentBreakdown[entryIndex],
      [field]: value,
      amount: field === 'sessions'
        ? value * currentBreakdown[entryIndex].rate
        : currentBreakdown[entryIndex].sessions * value,
    }

    // Recalc teaching_pay from breakdown sum
    const teachingPay = currentBreakdown.reduce((sum, e) => sum + e.amount, 0)
    const sessionsWorked = currentBreakdown.reduce((sum, e) => sum + e.sessions, 0)

    next.set(payslipId, {
      ...existing,
      class_breakdown: currentBreakdown,
      teaching_pay: teachingPay,
      sessions_worked: sessionsWorked,
    })
    return next
  })
}
```

d) **Editing toggle state:**

```typescript
const [editingPayslips, setEditingPayslips] = useState<Set<string>>(new Set())

function toggleEdit(payslipId: string) {
  setEditingPayslips(prev => {
    const next = new Set(prev)
    if (next.has(payslipId)) next.delete(payslipId)
    else next.add(payslipId)
    return next
  })
}
```

### 3. EDIT: `components/payroll/payroll-spreadsheet-row.tsx` (MODERATE)

**Modifications:**

- Remove `sessions_worked`, `rate_per_session`, `teaching_pay`, `substitute_sessions`, `substitute_pay` from `SPREADSHEET_COLUMNS` — these are now shown in class rows above
- Keep only the summary columns: kpi_bonus (assistant), allowances, other_pay, deductions, penalties, bhxh, bhyt, bhtn, tncn, gross_pay, net_pay, extra_notes
- Add "TỔNG" prefix to employee name in summary row
- Show `teaching_pay` as a read-only subtotal in the row (derived from class breakdown)
- Adjust `colSpan` for the summary row to span the class columns area

**Updated SPREADSHEET_COLUMNS** (~12 columns instead of 19):
```typescript
export const SUMMARY_COLUMNS = [
  { key: 'teaching_pay', label: 'Lương buổi', editable: false, numeric: true, minWidth: 100 },
  { key: 'substitute_pay', label: 'Dạy thay', editable: false, numeric: true, minWidth: 90 },
  { key: 'kpi_bonus', label: 'KPI', editable: true, numeric: true, minWidth: 90, showFor: ['assistant'] },
  { key: 'allowances', label: 'Phụ cấp', editable: true, numeric: true, minWidth: 90 },
  { key: 'other_pay', label: 'Khác (+)', editable: true, numeric: true, minWidth: 90 },
  { key: 'deductions', label: 'Khấu trừ', editable: true, numeric: true, minWidth: 90 },
  { key: 'penalties', label: 'Phạt', editable: true, numeric: true, minWidth: 80 },
  { key: 'bhxh', label: 'BHXH', editable: true, numeric: true, minWidth: 90 },
  { key: 'bhyt', label: 'BHYT', editable: true, numeric: true, minWidth: 80 },
  { key: 'bhtn', label: 'BHTN', editable: true, numeric: true, minWidth: 80 },
  { key: 'tncn', label: 'TNCN', editable: true, numeric: true, minWidth: 90 },
  { key: 'gross_pay', label: 'GROSS', editable: true, numeric: true, minWidth: 110 },
  { key: 'net_pay', label: 'NET', editable: true, numeric: true, minWidth: 110 },
  { key: 'extra_notes', label: 'Ghi chú', editable: true, numeric: false, minWidth: 70 },
]
```

- Summary row spans first 6 columns with "TỔNG {name}" + total sessions + total teaching_pay

### Backward Compatibility

If `class_breakdown` is empty (old payslips not yet re-initialized), fall back to current single-row display:
```typescript
const hasClasses = (payslip.class_breakdown ?? []).length > 0
// If no classes: skip header/class rows, render summary row only (old behavior)
```

## Implementation Steps

1. Create `components/payroll/payroll-class-row.tsx`
2. Extract grouped rendering into `components/payroll/payroll-employee-group.tsx` to keep spreadsheet.tsx < 200 lines (ISSUE-14 fix)
3. Refactor `payroll-spreadsheet.tsx` — use PayrollEmployeeGroup, grouped layout
4. Refactor `payroll-spreadsheet-row.tsx` — keep export name as `SPREADSHEET_COLUMNS` (re-export alias for backward compat), update to summary-only columns (ISSUE-15 fix)
5. Add class edit handler with `onChange` (not `onBlur`) to match existing row pattern (ISSUE-11 fix)
6. Use dynamic colSpan: `const TOTAL_COLS = CLASS_COLS + SUMMARY_COLUMNS.length; colSpan={TOTAL_COLS - usedCols}` (ISSUE-10 fix)
7. Compute row indices via flatMap + accumulator in useMemo (ISSUE-9 fix)
8. Ensure backward compat for empty class_breakdown
9. **ISSUE-4 FIX**: Update `app/(dashboard)/my-payslips/[id]/page.tsx` — render per-class rows when `class_breakdown.length > 0`, keep flat display for empty
10. **ISSUE-5 FIX**: Add reset button per class row that restores `default_sessions`/`default_rate` values
11. `npm run build` to verify

## Validation

- [ ] Teaching employees show N class rows + summary row
- [ ] Office/admin employees show summary row only (no class breakdown)
- [ ] KPI badge appears between last class row and summary (assistants only)
- [ ] Editing sessions/rate (via onChange, not onBlur) recalcs amount + teaching_pay in real-time (ISSUE-11)
- [ ] Dirty state badge (amber border) applies to edited payslips
- [ ] Old payslips (empty class_breakdown) render in legacy single-row mode
- [ ] Footer totals still correct (sum GROSS/NET across all payslips)
- [ ] Employee portal payslip detail shows per-class breakdown (ISSUE-4)
- [ ] Reset button restores default_sessions/default_rate (ISSUE-5)
- [ ] colSpan is dynamic, not hardcoded (ISSUE-10)
- [ ] Build passes
- [ ] All files stay under 200 lines (extracted PayrollEmployeeGroup helps) (ISSUE-14)
- [ ] Import name `SPREADSHEET_COLUMNS` unchanged for backward compat (ISSUE-15)

## Risk

| Risk | Mitigation |
|------|-----------|
| Major refactor breaks existing edit/save flow | Dirty state at payslip level unchanged; class edits merge into same Map |
| Spreadsheet.tsx exceeds 200 lines | Extract grouped rendering to PayrollEmployeeGroup component (ISSUE-14 fix) |
| Column alignment between class rows and summary rows | Dynamic colSpan derived from SUMMARY_COLUMNS.length (ISSUE-10 fix) |
| Performance with many class rows | PayrollClassRow is memo'd; payslips per branch rarely exceed 30 |
| Employee portal shows wrong rate display | Per-class rows in my-payslips/[id] (ISSUE-4 fix) |
