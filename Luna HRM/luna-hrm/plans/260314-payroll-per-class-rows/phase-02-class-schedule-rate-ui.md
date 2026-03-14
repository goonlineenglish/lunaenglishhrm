# Phase 2: Class Schedule Rate UI

**Priority:** High
**Status:** ✅ completed
**Effort:** ~45 min (actual: completed)
**Depends on:** Phase 1 (migration + types)

## Context Links

- Class schedule form: `components/class-schedules/class-schedule-form.tsx` (189 lines)
- CRUD actions: `lib/actions/class-schedule-mutation-actions.ts`
- Query actions: `lib/actions/class-schedule-query-actions.ts`
- Schedule types: `lib/types/database-schedule-types.ts`

## Overview

Add `teacher_rate` and `assistant_rate` fields to class schedule form. Optional (nullable) — when NULL, payroll falls back to `employees.rate_per_session`.

## File Changes

### 1. `components/class-schedules/class-schedule-form.tsx` (EDIT)

**FormState** — add 2 fields:
```typescript
interface FormState {
  // ... existing fields ...
  teacher_rate: string  // '' = null (use employee default)
  assistant_rate: string // '' = null
}
```

**Initial state** (edit mode) — populate from schedule data:
```typescript
teacher_rate: schedule?.teacher_rate?.toString() ?? ''
assistant_rate: schedule?.assistant_rate?.toString() ?? ''
```

**Form UI** — add 2 optional number inputs after employee selectors:
```tsx
{/* Rate per class (optional) */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <Label>Đơn giá GV (tùy chọn)</Label>
    <Input
      type="number"
      placeholder="Mặc định từ hồ sơ NV"
      value={form.teacher_rate}
      onChange={(e) => setForm(prev => ({ ...prev, teacher_rate: e.target.value }))}
    />
  </div>
  <div>
    <Label>Đơn giá TG (tùy chọn)</Label>
    <Input
      type="number"
      placeholder="Mặc định từ hồ sơ NV"
      value={form.assistant_rate}
      onChange={(e) => setForm(prev => ({ ...prev, assistant_rate: e.target.value }))}
    />
  </div>
</div>
```

**Save handler** — parse and pass to action:
```typescript
// ISSUE-17 FIX: Use .trim() !== '' instead of truthiness check.
// parseFloat('0') returns 0 which is falsy — a rate of 0 should be valid.
// Also add min={0} to Input elements above.
const payload = {
  // ... existing fields ...
  teacher_rate: form.teacher_rate.trim() !== '' ? parseFloat(form.teacher_rate) : null,
  assistant_rate: form.assistant_rate.trim() !== '' ? parseFloat(form.assistant_rate) : null,
}
```

### 2. `lib/actions/class-schedule-mutation-actions.ts` (EDIT)

**createClassSchedule / updateClassSchedule** — add `teacher_rate`, `assistant_rate` to insert/update payload:

```typescript
// In create payload:
teacher_rate: data.teacher_rate ?? null,
assistant_rate: data.assistant_rate ?? null,

// In update payload:
teacher_rate: data.teacher_rate ?? null,
assistant_rate: data.assistant_rate ?? null,
```

### 3. `lib/actions/class-schedule-query-actions.ts` (EDIT — minor)

Add `teacher_rate, assistant_rate` to SELECT columns:
```typescript
.select('id, class_code, class_name, shift_time, days_of_week, teacher_id, assistant_id, teacher_rate, assistant_rate, ...')
```

## Implementation Steps

1. Update form — add teacher_rate/assistant_rate inputs (optional, placeholder "Mặc định từ hồ sơ NV")
2. Update mutation actions — include new fields in insert/update
3. Update query actions — include new fields in SELECT
4. `npm run build` to verify

## Validation

- [ ] Class schedule form shows 2 optional rate inputs
- [ ] Empty rate → saves as NULL in DB
- [ ] Numeric rate → saves correctly
- [ ] Edit mode pre-fills existing rate values
- [ ] Query returns teacher_rate/assistant_rate
- [ ] Build passes

## Risk

| Risk | Mitigation |
|------|-----------|
| Form exceeds 200 lines | Currently 189 lines, adding ~15 → borderline. Extract rate section to sub-component if needed |
| Existing schedules have NULL rates | Expected — payroll init falls back to employee rate |
