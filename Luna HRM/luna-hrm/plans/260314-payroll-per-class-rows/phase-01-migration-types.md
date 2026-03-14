# Phase 1: Migration + Types

**Priority:** High (blocker for all other phases)
**Status:** ✅ completed
**Effort:** ~30 min (actual: completed)

## Context Links

- Brainstorm: `plans/reports/brainstorm-260314-payroll-per-class-rows.md`
- Existing migrations: `supabase/migrations/` (9 files: 000-008)
- Payroll types: `lib/types/database-payroll-types.ts` (174 lines)
- Class schedule type: `lib/types/database-schedule-types.ts`

## Overview

Create migration 009 for 2 schema changes + update TypeScript types to match.

## New Files

### 1. `supabase/migrations/009_payroll_class_breakdown.sql` (NEW)

```sql
-- Add per-class rate to class_schedules (NULL = fallback to employees.rate_per_session)
ALTER TABLE class_schedules
  ADD COLUMN IF NOT EXISTS teacher_rate NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assistant_rate NUMERIC DEFAULT NULL;

COMMENT ON COLUMN class_schedules.teacher_rate IS 'Override rate for teacher in this class. NULL = use employees.rate_per_session';
COMMENT ON COLUMN class_schedules.assistant_rate IS 'Override rate for assistant in this class. NULL = use employees.rate_per_session';

-- Add class breakdown snapshot to payslips
ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS class_breakdown JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN payslips.class_breakdown IS 'Per-class session/rate snapshot [{class_code, class_name, sessions, rate, amount, default_sessions, default_rate}]';
```

### 2. Update `lib/types/database-payroll-types.ts` (EDIT)

Add `ClassBreakdownEntry` interface and `class_breakdown` field to `Payslip`:

```typescript
/** Per-class session/rate snapshot stored in payslips.class_breakdown JSONB */
export interface ClassBreakdownEntry {
  class_code: string
  class_name: string
  sessions: number          // editable — default from attendance
  rate: number              // editable — default from schedule/employee
  amount: number            // computed: sessions × rate
  default_sessions: number  // original attendance count (for reset)
  default_rate: number      // original rate (for reset)
}
```

Add to `Payslip` type:
```typescript
class_breakdown: ClassBreakdownEntry[]
```

Add to `EditablePayslipFields`:
```typescript
class_breakdown?: ClassBreakdownEntry[]
```

### 3. Update `lib/types/database-schedule-types.ts` (EDIT)

Add `teacher_rate` and `assistant_rate` to `ClassSchedule` type:

```typescript
teacher_rate: number | null
assistant_rate: number | null
```

## Implementation Steps

1. Create migration file `supabase/migrations/009_payroll_class_breakdown.sql`
2. Run migration on Supabase Cloud via SQL Editor
3. Update `database-payroll-types.ts` — add `ClassBreakdownEntry` interface + field to `Payslip` and `EditablePayslipFields`
4. Update `database-schedule-types.ts` — add rate fields to `ClassSchedule`
5. `npm run build` to verify no type errors

## Validation

- [ ] Migration runs without errors on Supabase Cloud
- [ ] `ClassBreakdownEntry` type exported from database-payroll-types.ts
- [ ] `Payslip` type includes `class_breakdown: ClassBreakdownEntry[]`
- [ ] `EditablePayslipFields` includes optional `class_breakdown`
- [ ] `ClassSchedule` type includes `teacher_rate` and `assistant_rate`
- [ ] Build passes

## Risk

| Risk | Mitigation |
|------|-----------|
| Migration on production | `IF NOT EXISTS` prevents duplicate column errors |
| Existing payslips lack class_breakdown | Default `'[]'::jsonb` ensures empty array |
