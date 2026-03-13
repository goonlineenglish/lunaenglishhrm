---
title: "Phase 1: Calendar Dates in Attendance Grid Header"
status: completed
priority: P2
effort: 10m
completed: 2026-03-14
---

# Phase 1: Calendar Dates in Attendance Grid Header

## Context Links

- **Brainstorm:** `plans/reports/brainstorm-260313-attendance-grid-ux-improvements.md` (Feature 1)
- **Target file:** `components/attendance/attendance-grid.tsx` (lines 130-132)
- **Helper:** `lib/utils/date-helpers.ts` — `getWeekDates()`, `toISODate()`

## Overview

Show actual calendar dates (DD/MM) below Vietnamese day names (T2, T3...) in the attendance grid header. Currently users must mentally calculate which date each column represents.

**Before:**
```
| T2  | T3  | T4  | T5  | T6  | T7  | CN  |
```

**After:**
```
| T2    | T3    | T4    | T5    | T6    | T7    | CN    |
| 10/03 | 11/03 | 12/03 | 13/03 | 14/03 | 15/03 | 16/03 |
```

## Key Insights

- `weekDates` is already computed at line 44: `const weekDates = getWeekDates(weekStart)`
- `DAYS = [1,2,3,4,5,6,7]` maps to `weekDates[0..6]` (index = day - 1)
- No new imports needed; `getWeekDates` already imported
- Formatting: use simple `DD/MM` via `date.getDate()` + `date.getMonth()+1` padded

## Requirements

**Functional:**
- Each `<th>` for T2-CN shows the day name on first line and DD/MM on second line
- DD/MM format (Vietnamese convention, zero-padded)

**Non-functional:**
- Column width stays at `w-10` (already sufficient for 2-line content)
- No new dependencies or imports

## Related Code Files

**Edit:**
- `components/attendance/attendance-grid.tsx` — lines 130-132
- `components/office-attendance/office-attendance-grid.tsx` — lines 99-101 (ISSUE-1 fix: identical header pattern)

## Implementation Steps

### Step 1: Format date as DD/MM

Inside the `DAYS.map()` block (line 130-132), compute the date from `weekDates`:

```tsx
// Current (lines 130-132):
{DAYS.map((d) => (
  <th key={d} className="px-1 py-2 text-center border w-10">{getDayName(d)}</th>
))}

// New:
{DAYS.map((d) => {
  const date = weekDates[d - 1]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return (
    <th key={d} className="px-1 py-2 text-center border w-10">
      <div className="leading-tight">
        <div>{getDayName(d)}</div>
        <div className="text-[10px] text-muted-foreground font-normal">{dd}/{mm}</div>
      </div>
    </th>
  )
})}
```

**Styling notes:**
- `text-[10px]` keeps the date small, subordinate to the day name
- `text-muted-foreground` distinguishes date from day name
- `font-normal` overrides the bold `<th>` default for the date line
- `leading-tight` reduces line height so the header stays compact

### Step 2: Apply same change to office attendance grid

**File:** `components/office-attendance/office-attendance-grid.tsx` (lines 99-101)

Same pattern — `DAYS.map((d) => <th>{getDayName(d)}</th>)`. Apply identical DD/MM formatting. `weekStart` prop already available.

### Step 3: Verify build

```bash
npm run build
```

Ensure no type errors, no layout breakage.

## Todo List

- [ ] Edit `attendance-grid.tsx` lines 130-132 to show DD/MM under day name
- [ ] Edit `office-attendance-grid.tsx` lines 99-101 same pattern (ISSUE-1 fix)
- [ ] Verify build passes
- [ ] Visual check: header compact, dates readable, no column overflow

## Validation Checklist

- [ ] Day names still show correctly (T2-CN)
- [ ] Dates match the selected week (change week via selector, verify dates update)
- [ ] Date format is DD/MM (zero-padded)
- [ ] No horizontal overflow on standard screen widths
- [ ] Mobile: table scrolls horizontally, dates still visible

## Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Column too narrow for 2-line content | LOW | `w-10` (2.5rem = 40px) is enough for "T2" + "10/03". If tight, increase to `w-12` |

## Success Criteria

- DD/MM dates visible under every day name in the attendance grid header
- Dates update when week selector changes
- Build passes with zero errors
