# Phase 5: Testing & Cleanup

## Context Links
- [plan.md](./plan.md) | All prior phases
- Existing tests: `tests/payroll-calculation.test.ts`

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Update existing tests, add tests for new services, remove dead code, update docs.

## Related Code Files
- **Modify:** `tests/payroll-calculation.test.ts`
- **Create:** `tests/payroll-prefill-service.test.ts`
- **Create:** `tests/payroll-audit-service.test.ts`
- **Modify:** `docs/system-architecture.md`, `docs/codebase-summary.md`

## Implementation Steps

1. **Update `tests/payroll-calculation.test.ts`**:
   - Remove tests for removed `calculatePayslip()` function
   - Add tests for `initializePayslipData()`:
     - Rate 200k × 20 sessions = 4M teaching_pay
     - Prefill kpi_bonus passed through
     - Manual fields all start at 0
     - `deductions` field prefilled correctly
   - Add tests for `calculateTeachingPay()` and `calculateSubstitutePay()`
   - Keep `compareNetPay()` tests if they exist

2. **Create `tests/payroll-audit-service.test.ts`**:
   - No changes → empty array
   - One field changed → 1 entry with correct old/new
   - Multiple changes → N entries
   - Correct payslip_id and changed_by

3. **Create `tests/payroll-prefill-service.test.ts`**:
   - Returns PrefillData shape
   - No KPI → default 0
   - Multiple salary_components summed

4. **Dead code cleanup**:
   - Remove unused imports, deprecated functions
   - Remove `payslip-detail-panel.tsx` if fully retired
   - Remove old `updatePayslipManualFields` import references
   - Clean up `autoCalculatePayslips` references across codebase

5. **Update docs**:
   - `docs/system-architecture.md`: new payroll flow
   - `docs/codebase-summary.md`: new service files

6. **Manual integration test**: Create period → initialize → edit → re-initialize → confirm

## Todo List
- [ ] Update `tests/payroll-calculation.test.ts`
- [ ] Create `tests/payroll-audit-service.test.ts`
- [ ] Create `tests/payroll-prefill-service.test.ts`
- [ ] Run `npx vitest`, all pass
- [ ] Remove dead code
- [ ] Update system-architecture.md
- [ ] Update codebase-summary.md
- [ ] Manual integration test

## Success Criteria
- All tests pass
- New tests cover: initializePayslipData, buildAuditLogEntries, fetchPrefillData
- No dead code in modified files
- Documentation reflects new architecture
- Full flow works end-to-end

## Risk Assessment
- **Fragile Supabase mocks:** Focus unit tests on pure functions
- **Docs drift:** Update docs immediately after verifying implementation
