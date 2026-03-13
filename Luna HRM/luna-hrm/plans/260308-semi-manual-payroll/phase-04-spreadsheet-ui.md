# Phase 4: Spreadsheet-like UI

## Context Links
- [plan.md](./plan.md) | [Phase 3](./phase-03-backend-actions-refactor.md)
- `app/(dashboard)/payroll/[period]/page.tsx` — period detail page (**client component**, `'use client'`)
- `components/payroll/payroll-table.tsx` — current payroll table
- `components/payroll/payslip-detail-panel.tsx` — current detail panel with `updatePayslipManualFields()`
- `components/payroll/confirm-payroll-dialog.tsx` — confirmation dialog

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Replace current payslip view with editable spreadsheet. Rows = employees, columns = payslip fields. Read-only for auto-calc, inline editable for manual fields. Batch save.

## Column Configuration

| Column | Key | Editable |
|--------|-----|----------|
| Employee | employee_name | No |
| Sessions | sessions_worked | No |
| Rate | rate_per_session | No |
| Teaching Pay | teaching_pay | No |
| Sub Sessions | substitute_sessions | No |
| Sub Rate | substitute_rate | No |
| Sub Pay | substitute_pay | No |
| KPI Bonus | kpi_bonus | Yes |
| Allowances | allowances | Yes |
| Deductions | deductions | Yes |
| Penalties | penalties | Yes |
| Other Pay | other_pay | Yes |
| BHXH | bhxh | Yes |
| BHYT | bhyt | Yes |
| BHTN | bhtn | Yes |
| TNCN | tncn | Yes |
| Gross | gross_pay | Yes |
| Net | net_pay | Yes |
| Notes | extra_notes | Yes (icon button → modal) |

## Related Code Files
- **Modify:** `app/(dashboard)/payroll/[period]/page.tsx`
- **Create:** `components/payroll/payroll-spreadsheet.tsx` (~150 lines)
- **Create:** `components/payroll/payroll-spreadsheet-row.tsx` (~80 lines)
- **Create:** `components/payroll/reinitialize-confirm-dialog.tsx` (~50 lines)
- **Remove/Retire:** `components/payroll/payslip-detail-panel.tsx` (superseded by spreadsheet inline editing)
- **Keep:** `components/payroll/confirm-payroll-dialog.tsx`
- **Modify:** `lib/utils/excel-payroll-export.ts` (update columns to match new spreadsheet model: add deductions, other_pay, extra_notes columns)

## Implementation Steps

1. **Create `payroll-spreadsheet.tsx`** (~150 lines):
   - Client component with state: `editedValues Map<payslipId, Record<field, number | string>>`
   - Column config array (editable flag per column)
   - `handleFieldChange(payslipId, field, value)` updates state
   - `handleSave()` calls `batchUpdatePayslips()`, clears dirty state, shows toast
   - isDirty = editedValues.size > 0
   - **When isDirty: disable Re-initialize, Confirm, and Export buttons** (show "Save changes first" tooltip)
   - Add "Mark All as Reviewed" button: calls `markPayslipsReviewed()` for all unreviewed rows (allows confirming unchanged payslips)
   - Show review status per row: checkbox/icon indicating `is_reviewed` state
   - Add router navigation guard when isDirty (prompt save/discard)
   - Render shadcn Table, disable editing when period status !== 'draft' (confirmed OR sent = read-only)
   - Footer: Save button + unsaved changes count

2. **Create `payroll-spreadsheet-row.tsx`** (~80 lines):
   - Read-only cells: formatted numbers, `bg-muted` style
   - Editable cells: `<Input type="number" step="any">`, white bg
   - Dirty cells: `border-l-2 border-l-amber-400`
   - Props: payslip, columns, editedValues, onFieldChange, isLocked
   - Notes column: icon button opens small modal/popover for text editing

3. **Create `reinitialize-confirm-dialog.tsx`** (~50 lines):
   - AlertDialog: "Re-initialize will overwrite pre-filled values. Manual entries preserved. Continue?"
   - Confirm triggers `reinitializePayslips()`

4. **Modify period page** (`payroll/[period]/page.tsx`):
   - Page is already a **client component** (`'use client'`) — keep that pattern
   - Replace `PayslipDetailPanel` usage with `PayrollSpreadsheet`
   - Remove import of `updatePayslipManualFields` (superseded by `batchUpdatePayslips`)
   - Action bar: Initialize (when no payslips) | Re-initialize | Confirm | Export
   - Render PayrollSpreadsheet component
   - Add beforeunload listener for unsaved changes

5. **Retire `payslip-detail-panel.tsx`**:
   - Remove or mark as deprecated (the single-payslip edit flow is replaced by spreadsheet batch edit)
   - Remove `updatePayslipManualFields` import from page if no longer needed

6. **Update Excel export** (`lib/utils/excel-payroll-export.ts`):
   - Add missing columns to match spreadsheet: deductions, other_pay, extra_notes
   - Ensure column order matches spreadsheet column configuration

7. **Styling**:
   - Editable: white bg, border on focus, min-w-[100px]
   - Read-only: bg-muted text-muted-foreground
   - Horizontal scroll for all columns

## Todo List
- [ ] Create `payroll-spreadsheet.tsx` with column config, state, save handler
- [ ] Create `payroll-spreadsheet-row.tsx` with editable/read-only cells
- [ ] Create `reinitialize-confirm-dialog.tsx`
- [ ] Modify period page to use spreadsheet component
- [ ] Add action buttons (Initialize, Re-initialize, Confirm, Export)
- [ ] Style read-only vs editable cells
- [ ] Add dirty state tracking + unsaved indicator
- [ ] Disable Re-initialize/Confirm/Export when dirty
- [ ] Add navigation guard when dirty
- [ ] Update `excel-payroll-export.ts` columns to match spreadsheet
- [ ] Add loading state for save
- [ ] Add toast notifications
- [ ] Test non-draft period (confirmed/sent) = fully read-only
- [ ] Test horizontal scroll
- [ ] Verify compilation

## Success Criteria
- Spreadsheet table shows all payslip fields correctly
- Auto-calc columns read-only, manual columns editable
- Save persists edits + shows success toast
- Initialize creates payslips with correct values
- Re-initialize warns then updates auto-calc + prefill only
- Confirmed periods fully read-only
- Dirty state indicator works

## Risk Assessment
- **Performance with 50+ rows:** Use React.memo on row component, local state
- **Tab close with unsaved changes:** beforeunload listener
- **Numeric parsing:** type="number" step="any", parseFloat with NaN→0 fallback

## Next Steps
→ Phase 5: testing and cleanup
