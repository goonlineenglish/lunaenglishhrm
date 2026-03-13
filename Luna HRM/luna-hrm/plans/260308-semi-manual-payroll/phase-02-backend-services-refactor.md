# Phase 2: Backend Services Refactor

## Context Links
- [plan.md](./plan.md) | [Phase 1](./phase-01-database-migration.md)
- `lib/services/payroll-calculation-service.ts` — exports `calculatePayslip()` and `compareNetPay()`
- `lib/services/payroll-session-counter.ts` — session counting (keep as-is)
- `lib/services/payroll-data-fetcher.ts` — data retrieval (keep as-is)
- `lib/services/audit-log-service.ts` — existing audit pattern using `createAdminClient()`
- `lib/types/database-payroll-types.ts` — DB type aliases

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Refactor calculation service to remove full auto-calc. Add prefill service and audit service.

## Architecture

```
payroll-calculation-service.ts (MODIFY)
├── REMOVE: calculatePayslip() (full auto-calc function)
├── KEEP: compareNetPay() (month-to-month comparison, used in preview)
├── ADD: calculateTeachingPay(sessions, rate) → number
├── ADD: calculateSubstitutePay(sessions, rate) → number
└── ADD: initializePayslipData(employee, attendance, prefillData) → PayslipInitData

payroll-prefill-service.ts (NEW, <100 lines)
└── fetchPrefillData(supabase, employeeId, periodStart, periodEnd) → PrefillData
    ├── kpi_bonus ← kpi_evaluations
    ├── allowances ← salary_components (component_type='allowance', is_recurring=true)
    ├── deductions ← salary_components (component_type='deduction', is_recurring=true)
    ├── penalties ← employee_weekly_notes (type=penalty)
    └── other_pay ← employee_weekly_notes (type=bonus|extra_job)

payroll-audit-service.ts (NEW, <80 lines)
├── buildAuditLogEntries(payslipId, oldVals, newVals, changedBy) → AuditEntry[]
└── insertAuditLogs(entries[]) → void
    └── Uses createAdminClient() (service_role) matching audit-log-service.ts pattern
```

## Related Code Files
- **Modify:** `lib/services/payroll-calculation-service.ts`
- **Create:** `lib/services/payroll-prefill-service.ts`
- **Create:** `lib/services/payroll-audit-service.ts`
- **Modify:** `lib/types/database-payroll-types.ts` (add PayslipInitData, PrefillData, AuditEntry types)
- **No change:** `lib/services/payroll-session-counter.ts`, `lib/services/payroll-data-fetcher.ts`

## Implementation Steps

1. **Update types** (`lib/types/database-payroll-types.ts`):
   - Add `PayslipInitData`: all payslip fields with auto-calc, prefill, and zero fields
   - Add `PrefillData`: { kpi_bonus, allowances, deductions, penalties, other_pay }
   - Add `EditablePayslipFields`: { kpi_bonus, allowances, deductions, penalties, other_pay, bhxh, bhyt, bhtn, tncn, gross_pay, net_pay, extra_notes }
   - Add `AuditEntry`: { payslip_id, field_name, old_value, new_value, changed_by }

2. **Refactor `payroll-calculation-service.ts`**:
   - Remove `calculatePayslip()` (the full auto-calc function)
   - Keep `compareNetPay()` (used by payroll preview comparison)
   - Add `calculateTeachingPay(sessions, rate)` and `calculateSubstitutePay(sessions, rate)`
   - Add `initializePayslipData(employee, attendance, prefillData)`:
     - Auto-calc: sessions_worked, rate, teaching_pay, substitute fields
     - Prefill: kpi_bonus, allowances, deductions, penalties, other_pay from prefillData
     - Zero: bhxh=0, bhyt=0, bhtn=0, tncn=0, gross_pay=0, net_pay=0

3. **Create `payroll-prefill-service.ts`**:
   - `fetchPrefillData(supabase, employeeId, periodStart, periodEnd)`:
     - Query kpi_evaluations → bonus_amount
     - Query salary_components (component_type='allowance', is_recurring=true) → sum
     - Query salary_components (component_type='deduction', is_recurring=true) → sum
     - Query employee_weekly_notes (penalties) → sum
     - Query employee_weekly_notes (bonus/extra_job) → sum
     - Return PrefillData, default 0 for missing data

4. **Create `payroll-audit-service.ts`**:
   - `buildAuditLogEntries()`: compare editable fields, return entries for changed ones only
   - `insertAuditLogs()`: use `createAdminClient()` for service_role insert (matching `audit-log-service.ts` pattern), bulk insert, skip if empty

5. **Verify compilation** with lint/tsc

## Todo List
- [ ] Add types to `lib/types/database-payroll-types.ts`
- [ ] Refactor `payroll-calculation-service.ts`
- [ ] Create `lib/services/payroll-prefill-service.ts`
- [ ] Create `lib/services/payroll-audit-service.ts`
- [ ] Verify compilation, no errors

## Success Criteria
- `initializePayslipData()` returns correct auto-calc, prefilled, zeroed fields
- `buildAuditLogEntries()` correctly diffs old/new values
- `fetchPrefillData()` returns aggregated values from source tables
- All files under 200 lines
- No compilation errors

## Risk Assessment
- **Removed functions referenced elsewhere:** Search usages before removing; Phase 3 updates callers
- **Pre-fill returns unexpected data:** Add null guards, default to 0

## Next Steps
→ Phase 3 uses these service functions in server actions
