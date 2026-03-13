# Phase 3: Payroll Calculation Engine

## Context Links

- [Brainstorm V3 — Payroll Formulas](../reports/brainstorm-260305-v3-payroll-formulas-ui.md) — 3 formulas, KPI scoring, UI mockups
- [Brainstorm — 18 Optimizations](../reports/brainstorm-optimizations.md) — Optimizations G-L
- [UI Mockups](../visuals/hrm-ui-mockups-attendance-payroll.md) — Screens 5-8
- [System Architecture](../../docs/system-architecture.md) — Payroll engine, TNCN brackets, payslip schema
- [Code Standards](../../docs/code-standards.md) — payroll-calculation.ts, tax-calculator.ts patterns
- [Excel Template](../Bảng lương + đánh giá trợ giảng.xlsx) — Real salary sheet to match

## Overview

- **Priority:** P0 (Core business logic)
- **Status:** Pending
- **Effort:** 3-4 days
- **Description:** 3 salary formulas (Office/Teacher/Teaching Assistant), insurance calculations (BHXH/BHYT/BHTN), progressive tax (TNCN 7 brackets), payroll period management, auto-calculate from attendance, 3-tab payroll UI, payslip detail panel, month comparison, alerts, email dispatch, undo, comprehensive unit tests.

## Key Insights

- Salary = session-based, NOT monthly fixed. Sessions counted from attendance tables.
- 3 formulas differ only in KPI bonus: only Teaching Assistants get KPI×50k
- Insurance conditional on `has_labor_contract` flag (many foreign teachers don't have it)
- TNCN uses 7 progressive brackets after 11M personal deduction + 4.4M per dependent
- Payroll reads from TWO attendance tables: `attendance` (GV/TG) and `office_attendance` (VP)
- BM notes (employee_weekly_notes) become accountant's checklist for substitute/extra pay
- Rate snapshot: lock rate_per_session at calculation time to prevent retroactive changes
- 24h undo: re-open confirmed payroll within 24 hours
- **[ISSUE-7 fix]** `payslips.sessions_worked` and `substitute_sessions` must be NUMERIC (not INT) to support 0.5 attendance
- **[ISSUE-8 fix]** Payroll reads BOTH recurring allowances AND recurring deductions from `salary_components`
- **[ISSUE-6 fix]** Only `employee_weekly_notes` feeds payroll adjustments. `employee_evaluations.bonus_impact` does NOT auto-feed payroll — it's informational only. If BM wants evaluation bonus reflected, they create an employee_weekly_note of type 'bonus'.
- **[ISSUE-10 scope]** Insurance calculations are an internal payroll approximation for small English language centers. Not certified for large-enterprise or multi-nationality tax compliance.

## Requirements

### Functional
1. **Payroll calculation service** — Pure functions for all 3 formulas + tax + insurance
2. **Tax calculator** — 7-bracket progressive TNCN with personal deduction
3. **Payroll period CRUD** — Create month/year period, select existing period
4. **Auto-calculate** — Button generates payslips for all active employees from attendance data
5. **3-tab payroll view** — Tabs: Tro Giang | Giao Vien | Van Phong (Teaching Asst | Teacher | Office)
6. **Payslip detail panel** — Slide-out panel showing full breakdown per employee
7. **Month-over-month comparison** — Show previous month NET alongside current
8. **>20% salary change alert** — Yellow warning badge on payslips with large changes
9. **BM notes checklist** — Display employee_weekly_notes for accountant to tick as processed
10. **Rate snapshot** — Freeze rate_per_session in payslip at calculation time
11. **Double confirm dialog** — "Xac nhan luong cho 16 NV? Tong: 48,967,000 VND"
12. **24-hour undo** — Revert confirmed payroll within 24h (set status back to draft)
13. **Email payslip** — Send individual payslip summaries via Resend
14. **Export Excel** — Download payroll as .xlsx (Phase 7 detail, basic CSV here)
15. **Unit tests** — 100% coverage on payroll-calculation.ts and tax-calculator.ts

### Non-Functional
- 50+ payslips calculated in < 5s
- Zero discrepancies vs Excel template
- Tax calculation matches Vietnamese TNCN brackets (internal payroll approximation — not certified for multi-nationality/large enterprise)

## Architecture

### Payroll Calculation Flow
```
1. Accountant creates payroll_period (month/year, branch)
2. Clicks "Tinh tu dong" (Auto-calculate)
3. System:
   a. Fetch active employees for branch
   b. For each employee:
      - Count sessions from attendance/office_attendance tables
      - Fetch substitute sessions from employee_weekly_notes
      - Fetch salary_components (recurring allowances/deductions)
      - Fetch KPI bonus from kpi_evaluations (if assistant)
      - Snapshot rate_per_session
      - Calculate GROSS, insurance, tax, NET
      - Insert payslip record
   c. Update payroll_period totals
4. Accountant reviews 3-tab table
5. Double-confirm → status = 'confirmed'
6. Send emails → status = 'sent'
```

### Session Counting Logic
```typescript
// Teachers + Assistants: count from `attendance` table
const classAttendance = await supabase
  .from('attendance')
  .select('status')
  .eq('employee_id', employeeId)
  .gte('date', periodStart)
  .lte('date', periodEnd)
  .in('status', ['1', '0.5'])

sessionsWorked = sum of: 1 for status='1', 0.5 for status='0.5'

// Office staff: count from `office_attendance` table
const officeAttendance = await supabase
  .from('office_attendance')
  .select('status')
  .eq('employee_id', employeeId)
  .gte('date', periodStart)
  .lte('date', periodEnd)
  .in('status', ['1', '0.5'])

daysWorked = sum of: 1 for status='1', 0.5 for status='0.5'
```

### TNCN Progressive Tax (7 Brackets)
```
Bracket 1: 0 - 5M          at 5%
Bracket 2: 5M - 10M        at 10%
Bracket 3: 10M - 18M       at 15%
Bracket 4: 18M - 32M       at 20%
Bracket 5: 32M - 52M       at 25%
Bracket 6: 52M - 80M       at 30%
Bracket 7: > 80M           at 35%

taxableIncome = GROSS - BHXH - BHYT - BHTN - 11,000,000 - (4,400,000 × dependents)
if taxableIncome <= 0: TNCN = 0
else: apply brackets progressively
```

## Related Code Files

### Files to Create

**Routes:**
- `app/(dashboard)/payroll/page.tsx` — Payroll periods list
- `app/(dashboard)/payroll/[period]/page.tsx` — Payroll detail (3-tab view)

**Components:**
- `components/payroll/payroll-period-list.tsx` — Period management table
- `components/payroll/payroll-period-form.tsx` — Create period dialog
- `components/payroll/payroll-tabs.tsx` — 3-tab container (TG/GV/VP)
- `components/payroll/payroll-table.tsx` — Data table for each tab
- `components/payroll/payslip-detail-panel.tsx` — Slide-out payslip breakdown
- `components/payroll/payroll-comparison.tsx` — Month-over-month comparison column
- `components/payroll/payroll-alert-badge.tsx` — >20% change warning
- `components/payroll/notes-checklist.tsx` — BM notes as accountant checklist
- `components/payroll/confirm-payroll-dialog.tsx` — Double confirm
- `components/payroll/email-dispatch-dialog.tsx` — Send emails confirmation

**Server Actions:**
- `lib/actions/payroll-actions.ts` — Period CRUD, auto-calculate, confirm, undo, email

**Services:**
- `lib/services/payroll-calculation-service.ts` — Pure calculation functions (3 formulas)
- `lib/services/payroll-session-counter.ts` — Count sessions from attendance tables
- `lib/services/payroll-email-service.ts` — Format + send payslip emails

**Utils:**
- `lib/utils/tax-calculator.ts` — Progressive tax function
- `lib/utils/number-format.ts` — VND currency formatter, percentage formatter

**Types:**
- `lib/types/payroll.ts` — Payslip, PayrollPeriod, PayslipCalculationInput

**Tests:**
- `tests/unit/payroll-calculation-service.test.ts` — All 3 formulas
- `tests/unit/tax-calculator.test.ts` — All 7 brackets + edge cases

## Implementation Steps

### Step 1: Tax Calculator
1. Create `lib/utils/tax-calculator.ts`:
   ```typescript
   const TAX_BRACKETS = [
     { limit: 5_000_000, rate: 0.05 },
     { limit: 10_000_000, rate: 0.10 },
     { limit: 18_000_000, rate: 0.15 },
     { limit: 32_000_000, rate: 0.20 },
     { limit: 52_000_000, rate: 0.25 },
     { limit: 80_000_000, rate: 0.30 },
     { limit: Infinity, rate: 0.35 },
   ]
   export function calculateProgressiveTax(taxableIncome: number): number
   ```
2. Write `tests/unit/tax-calculator.test.ts` — test all 7 brackets, boundary values, negative income, zero

### Step 2: Number Formatter
1. Create `lib/utils/number-format.ts`:
   - `formatVND(amount: number)` — e.g., "1,730,000 VND"
   - `formatCompact(amount: number)` — e.g., "1,730k" or "1.73M"
   - `formatPercent(value: number)` — e.g., "8%"

### Step 3: Payroll Calculation Service
1. Create `lib/services/payroll-calculation-service.ts`:
   ```typescript
   interface PayslipInput {
     position: 'teacher' | 'assistant' | 'office'
     sessionsWorked: number        // NUMERIC — can be 16.5 (half sessions from 0.5 attendance)
     ratePerSession: number
     substituteSessions: number    // NUMERIC — can be fractional
     substituteRate: number
     otherPay: number
     allowances: number     // from salary_components (recurring allowances)
     deductions: number     // from salary_components (recurring deductions) — [ISSUE-8 fix]
     kpiBonus: number       // from kpi_evaluations (0 for non-assistants)
     hasLaborContract: boolean
     dependentCount: number
     penalties: number
   }

   export function calculatePayslip(input: PayslipInput): PayslipResult {
     const teachingPay = input.sessionsWorked * input.ratePerSession
     const substitutePay = input.substituteSessions * input.substituteRate
     const gross = teachingPay + substitutePay + input.otherPay
                 + input.allowances + input.kpiBonus

     const bhxh = input.hasLaborContract ? Math.round(gross * 0.08) : 0
     const bhyt = input.hasLaborContract ? Math.round(gross * 0.015) : 0
     const bhtn = input.hasLaborContract ? Math.round(gross * 0.01) : 0

     const deductible = 11_000_000 + (4_400_000 * input.dependentCount)
     const taxableIncome = gross - bhxh - bhyt - bhtn - deductible
     const tncn = calculateProgressiveTax(Math.max(0, taxableIncome))

     // NET includes recurring deductions from salary_components [ISSUE-8 fix]
     const net = gross - bhxh - bhyt - bhtn - tncn - input.deductions - input.penalties
     return { teachingPay, substitutePay, gross, bhxh, bhyt, bhtn, tncn, net, ... }
   }
   ```
   **Recalculation behavior [ISSUE-8 fix]:**
   - Auto-calculate PRESERVES manual fields (`other_pay`, `penalties`, `extra_notes`) if payslip already exists
   - Auto-calculate RESETS calculated fields (`sessions_worked`, `teaching_pay`, `gross`, `net`, etc.)
   - After `status='confirmed'`, payslip is IMMUTABLE (no recalculation allowed)
   - `getRecurringAllowances` AND `getRecurringDeductions` both read from `salary_components`
   ```
2. Write `tests/unit/payroll-calculation-service.test.ts`:
   - Test assistant with KPI bonus (from brainstorm V3 example: E02 16 sessions×75k, KPI 9/10)
   - Test teacher with labor contract (insurance deducted)
   - Test teacher without labor contract (no insurance)
   - Test office staff (no KPI)
   - Test high-income teacher hitting tax brackets
   - Test zero sessions (employee on leave)
   - Test with dependents (reduces taxable income)
   - Test with penalties (deducted from NET)

### Step 4: Session Counter Service
1. Create `lib/services/payroll-session-counter.ts`:
   - `countTeachingSessions(employeeId, startDate, endDate)` — query `attendance` table
   - `countOfficeDays(employeeId, startDate, endDate)` — query `office_attendance` table
   - `getSubstituteInfo(employeeId, startDate, endDate)` — query `employee_weekly_notes` where note_type='substitute'
   - `getRecurringAllowances(employeeId)` — query `salary_components` where component_type='allowance' AND is_recurring=true
   - `getRecurringDeductions(employeeId)` — query `salary_components` where component_type='deduction' AND is_recurring=true [ISSUE-8 fix]
   - `getKpiBonus(employeeId, month, year)` — query `kpi_evaluations`, return bonus_amount

### Step 5: Payroll Actions
1. Create `lib/actions/payroll-actions.ts`:
   - `createPayrollPeriod(branchId, month, year)` — insert payroll_period (status='draft')
   - `getPayrollPeriods(branchId)` — list all periods
   - `getPayrollPeriod(periodId)` — single period with payslips
   - `autoCalculatePayslips(periodId)`:
     a. Get period (branch, month, year)
     b. Fetch all active employees for branch
     c. For each employee: count sessions, get notes, get KPI, calculate payslip
     d. Upsert payslips
     e. Update period totals
   - `confirmPayrollPeriod(periodId)` — set status='confirmed', lock payslips
   - `undoPayrollPeriod(periodId)` — if within 24h of confirmed_at, revert to 'draft'
   - `getPayslipDetail(payslipId)` — full breakdown
   - `sendPayslipEmail(payslipId)` — send via Resend
   - `sendAllPayslipEmails(periodId)` — batch send

### Step 6: Payroll Types
1. Create `lib/types/payroll.ts`:
   - `PayrollPeriod`, `Payslip`, `PayslipCalculationInput`, `PayslipResult`
   - `PayrollTabType = 'assistant' | 'teacher' | 'office'`

### Step 7: Payroll Period UI
1. Create `app/(dashboard)/payroll/page.tsx` — list periods, create new
2. Create `components/payroll/payroll-period-list.tsx` — table with status badges
3. Create `components/payroll/payroll-period-form.tsx` — select month/year, create button

### Step 8: 3-Tab Payroll View
1. Create `app/(dashboard)/payroll/[period]/page.tsx` — main payroll page
2. Create `components/payroll/payroll-tabs.tsx`:
   - shadcn Tabs: "Tro giang (8)" | "Giao vien (5)" | "Van phong (3)"
   - Filter payslips by position for each tab
   - Summary cards: total employees, total GROSS, total NET
3. Create `components/payroll/payroll-table.tsx`:
   - Columns: #, Ma, Ten, Buoi, Don gia, Luong buoi, Day thay, Khac, KPI(TG only), GROSS, BH, Thue, NET
   - Click row → open detail panel
   - Comparison column: show previous month NET, highlight >20% change
4. Create `components/payroll/payroll-comparison.tsx` — fetch previous period, calculate delta
5. Create `components/payroll/payroll-alert-badge.tsx` — yellow badge for >20% change

### Step 9: Payslip Detail Panel
1. Create `components/payroll/payslip-detail-panel.tsx`:
   - shadcn Sheet (slide from right)
   - Full breakdown: THU NHAP section, KHAU TRU section, NET
   - KPI breakdown (if assistant)
   - Employee notes for the period
   - Edit manual fields: other_pay, penalties, extra_notes

### Step 10: Notes Checklist
1. Create `components/payroll/notes-checklist.tsx`:
   - Display employee_weekly_notes for the period's month
   - Grouped by week
   - Checkbox: accountant ticks when processed (calls markNoteProcessed)

### Step 11: Confirm + Undo + Email
1. Create `components/payroll/confirm-payroll-dialog.tsx`:
   - Show totals: "Xac nhan luong cho 16 NV? Tong GROSS: X, Tong NET: Y"
   - Confirm button → calls confirmPayrollPeriod
2. Undo logic: if `confirmed_at` within 24 hours, show "Hoan tac" button
3. Create `components/payroll/email-dispatch-dialog.tsx`:
   - Show list of employees to email
   - Checkboxes (select all / individual)
   - Send button → calls sendAllPayslipEmails
4. Create `lib/services/payroll-email-service.ts`:
   - Format payslip HTML template
   - Send via Resend API

### Step 12: Verify & Test
1. Run all unit tests: `npm test`
2. Cross-check calculation with Excel template values
3. Test auto-calculate with real attendance data
4. Test confirm → undo within 24h
5. Test email dispatch
6. Run `npm run build`

## Todo List

- [ ] Implement tax calculator with 7 brackets
- [ ] Write tax calculator unit tests (all brackets + edge cases)
- [ ] Implement VND number formatter
- [ ] Implement payroll calculation service (3 formulas)
- [ ] Write payroll calculation unit tests (all scenarios)
- [ ] Implement session counter service
- [ ] Implement payroll actions (CRUD, auto-calculate, confirm, undo)
- [ ] Create payroll types
- [ ] Build payroll period list page
- [ ] Build 3-tab payroll view
- [ ] Build payroll data table with comparison column
- [ ] Build payslip detail slide-out panel
- [ ] Build >20% change alert badge
- [ ] Build notes-to-checklist component
- [ ] Build double-confirm dialog
- [ ] Build 24h undo mechanism
- [ ] Build email dispatch (Resend integration)
- [ ] Cross-verify with Excel template
- [ ] `npm run build` passes
- [ ] All unit tests pass

## Success Criteria

- Payslip matches Excel template exactly (zero discrepancies)
- BHXH = GROSS x 8% when has_labor_contract=true, 0 otherwise
- TNCN calculated correctly per all 7 brackets
- KPI bonus appears correctly for assistants (0-500k)
- 50+ payslips calculated in < 5s
- Month-over-month comparison shows correct deltas
- >20% change alert fires correctly
- Notes checklist displays and processes correctly
- 24h undo works (revert confirmed → draft)
- Email sends successfully
- Unit tests: 100% of payroll logic covered, all pass

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tax calculation errors | High | Cross-check every bracket with Excel, test boundary values |
| Rounding errors | Medium | Use Math.round() consistently, round each component |
| Concurrent payroll edits | Low | Only accountant can calculate, single user per branch typically |
| Email delivery failures | Medium | Retry logic, log failed sends, show status per employee |
| Rate change during month | Medium | Snapshot rate at calculation time, store in payslip |

## Security Considerations

- Payroll CRUD: accountant + admin only (RLS)
- Payslip view: employee sees own only (RLS)
- Email: contains salary data, sent to employee's email only
- Rate snapshot prevents retroactive manipulation
- Confirm action logged for audit trail

## Next Steps

- Phase 4: KPI form feeds bonus into payroll calculation
- Phase 7: Excel export in proper format
