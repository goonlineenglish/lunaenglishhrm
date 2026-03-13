# Phase 3: Backend Actions Refactor

## Context Links
- [plan.md](./plan.md) | [Phase 2](./phase-02-backend-services-refactor.md)
- `lib/actions/payroll-calculate-actions.ts` — exports `autoCalculatePayslips()`
- `lib/actions/payroll-payslip-actions.ts` — payslip CRUD, exports `updatePayslipManualFields()`
- `lib/actions/payroll-period-actions.ts` — exports `confirmPayrollPeriod()`, `undoPayrollPeriod()`

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Replace `autoCalculatePayslips()` with `initializePayslips()`. Add `batchUpdatePayslips()`. Ensure period totals update after every save operation.

## Critical: Transaction Semantics
All multi-step write operations (`initializePayslips`, `reinitializePayslips`, `batchUpdatePayslips`) MUST be wrapped in a Supabase RPC or use a single shared client with error rollback:
- If any step fails (payslip write, audit log, period total update), ALL changes must be reverted
- Use `supabase.rpc()` with a PostgreSQL function, or implement try-catch with manual cleanup
- This prevents partial state: period totals out of sync, is_reviewed flags stale, missing audit logs

## Architecture

```
payroll-calculate-actions.ts (MODIFY)
├── REMOVE: autoCalculatePayslips()
├── ADD: initializePayslips(periodId) → { success, payslipCount }
│   ├── Auth check (admin/accountant)
│   ├── Validate period status = draft
│   ├── For each employee: count sessions, fetch prefill, build init data
│   ├── Upsert payslips
│   └── Update period total_gross/total_net from SUM(payslips)
└── ADD: reinitializePayslips(periodId) → { success }
    ├── Re-compute auto-calc + prefill fields only
    ├── Preserve manual fields (bhxh, bhyt, bhtn, tncn, gross_pay, net_pay)
    └── Update period total_gross/total_net

payroll-payslip-actions.ts (MODIFY)
├── REMOVE/REPLACE: updatePayslipManualFields() → batchUpdatePayslips()
└── ADD: batchUpdatePayslips(periodId, updates[])
    ├── Validate period status = 'draft' (reject if confirmed or sent)
    ├── For each update: fetch old values, update, build audit entries
    ├── Bulk insert audit logs (via createAdminClient)
    └── Update period total_gross/total_net from SUM(payslips)

payroll-period-actions.ts (MODIFY)
├── KEEP: confirmPayrollPeriod() (locks period)
└── KEEP: undoPayrollPeriod() (reverts to draft)
```

## Critical: Period Totals Maintenance
After initialize, reinitialize, and batchUpdate:
```sql
UPDATE payroll_periods
SET total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM payslips WHERE payroll_period_id = $1),
    total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM payslips WHERE payroll_period_id = $1)
WHERE id = $1;
```
Extract as shared helper: `updatePeriodTotals(supabase, periodId)`.

## Related Code Files
- **Modify:** `lib/actions/payroll-calculate-actions.ts`
- **Modify:** `lib/actions/payroll-payslip-actions.ts`
- **Modify:** `lib/actions/payroll-period-actions.ts`
- **Modify:** `lib/actions/payroll-actions.ts` (barrel file — update re-exports for new action names)

## Implementation Steps

1. **Create helper `updatePeriodTotals(supabase, periodId)`**:
   - Query SUM(gross_pay), SUM(net_pay) from payslips where payroll_period_id = periodId
   - Update payroll_periods.total_gross and total_net
   - Can be added in payroll-calculate-actions.ts or extracted to a shared util

2. **`payroll-calculate-actions.ts`** — Replace autoCalculatePayslips:
   - `initializePayslips(periodId)`:
     - Auth check, validate period status = 'draft'
     - **Reject if payslips already exist for this period** (use `reinitializePayslips` instead)
     - Fetch active employees for branch
     - For each: count sessions (payroll-session-counter), fetch prefill (payroll-prefill-service), build init data (payroll-calculation-service)
     - Upsert payslips (onConflict: `payroll_period_id` + `employee_id`)
     - Call `updatePeriodTotals()`
     - revalidatePath
   - `reinitializePayslips(periodId)`:
     - Same flow but only update auto-calc + prefill columns
     - DO NOT overwrite manual fields
     - **Reset `is_reviewed = false` for all payslips** (require re-review after reinitialize)
     - Write audit logs for prefill field changes
     - Call `updatePeriodTotals()`

3. **`payroll-payslip-actions.ts`** — Add batch update:
   - `batchUpdatePayslips(periodId, updates: PayslipUpdate[])`:
     - Type: `{ payslip_id: string, fields: Partial<EditablePayslipFields> }`
     - EditablePayslipFields: kpi_bonus, allowances, deductions, penalties, other_pay, bhxh, bhyt, bhtn, tncn, gross_pay, net_pay, extra_notes
     - Validate auth + period status = 'draft' (reject if confirmed OR sent)
     - **Verify all payslip_ids belong to the given periodId** (reject mismatched ids)
     - For each: fetch old values, update, build audit entries
     - Bulk insert audit logs (via `insertAuditLogs()` using createAdminClient)
     - Call `updatePeriodTotals()`
     - revalidatePath
   - Remove or replace `updatePayslipManualFields()` (superseded by batch update)

4. **`payroll-period-actions.ts`** — Add completion gate:
   - Keep `confirmPayrollPeriod()` and `undoPayrollPeriod()` unchanged in structure
   - ADD `is_reviewed` boolean column to `payslips` table (default false) via migration
   - In `batchUpdatePayslips()`: set `is_reviewed = true` for any payslip included in the save batch (even if no fields changed — allows explicit review-only saves)
   - ADD `markPayslipsReviewed(periodId, payslipIds[])` action: sets `is_reviewed = true` without changing values (for unchanged rows accountant confirms as-is)
   - In `confirmPayrollPeriod()`: reject if any payslip has `is_reviewed = false` (not yet reviewed by accountant)
   - Return error message listing employee names with unreviewed payslips
   - Remove any reference to old `autoCalculatePayslips()` if present

5. **Update barrel file `lib/actions/payroll-actions.ts`**:
   - Re-export `initializePayslips`, `reinitializePayslips` from calculate-actions
   - Re-export `batchUpdatePayslips` from payslip-actions
   - Remove old `autoCalculatePayslips`, `updatePayslipManualFields` re-exports
   - Update all consumers (page.tsx, confirm-payroll-dialog.tsx) to use new names

6. **Compile and verify**

## Todo List
- [ ] Create `updatePeriodTotals()` helper
- [ ] Replace `autoCalculatePayslips()` with `initializePayslips()`
- [ ] Add `reinitializePayslips()`
- [ ] Add `batchUpdatePayslips()` with audit logging
- [ ] Replace/remove `updatePayslipManualFields()`
- [ ] Add PayslipUpdate and EditablePayslipFields types
- [ ] Update barrel file `lib/actions/payroll-actions.ts` with new exports
- [ ] Update all consumer imports (page.tsx, confirm-payroll-dialog.tsx)
- [ ] Add completion gate in `confirmPayrollPeriod()` (reject if payslips have `is_reviewed = false`)
- [ ] Set `is_reviewed = true` in `batchUpdatePayslips()` when saving
- [ ] Add payslip-period ownership validation in `batchUpdatePayslips()`
- [ ] Verify period totals update after every save
- [ ] Compile, verify no errors

## Success Criteria
- `initializePayslips()` creates payslips with correct auto-calc + prefill + zeroed manual fields
- `reinitializePayslips()` preserves manual fields
- `batchUpdatePayslips()` updates + writes audit logs
- Period totals (total_gross, total_net) always in sync with payslip sum
- All actions reject unauthorized users and non-draft periods (confirmed AND sent)
- `confirmPayrollPeriod`/`undoPayrollPeriod` still work

## Risk Assessment
- **autoCalculatePayslips() called from multiple places:** Search all usages, update callers
- **Race condition:** Single-user system; add optimistic locking later if needed
- **Period totals drift:** `updatePeriodTotals()` as post-save hook prevents this

## Next Steps
→ Phase 4 builds spreadsheet UI that calls these actions
