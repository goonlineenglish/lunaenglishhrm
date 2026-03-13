# Phase 3: Mount ở 3 Vị Trí

**Priority:** High
**Status:** ✅ completed
**Effort:** ~45 min (actual: completed)

## Context Links
- Attendance page: `app/(dashboard)/attendance/page.tsx` (currently no tabs, `'use client'`)
- Payroll period page: `app/(dashboard)/payroll/[period]/page.tsx` (~267 lines)
- My attendance page: `app/(dashboard)/my-attendance/page.tsx` (server component)
- Shared component: `components/attendance/attendance-summary-cards.tsx` (Phase 2)

## File Changes

### 1. `app/(dashboard)/attendance/page.tsx` (EDIT)

**Current state**: Single view — grid + summary + notes. No tabs.

**Change**: Add `Tabs` wrapper with 2 tabs: "Chấm công" (existing grid) + "Tổng hợp" (new summary cards).

**ISSUE-7 NOTE**: Accountants cannot access `/attendance` — they see the summary via `/payroll/[period]` only. Do NOT modify the existing role guard.

**ISSUE-8 FIX**: Do NOT use `forceMount` on the summary tab. shadcn `TabsContent` only mounts content when active by default — this prevents unnecessary data fetching when the grid tab is visible.

```
Before:
  <AttendanceLegend />
  <AttendanceGrid ... />
  <AttendanceSummary ... />
  <AttendanceNotesPanel ... />

After:
  <Tabs defaultValue="grid">
    <TabsList>
      <TabsTrigger value="grid">Chấm công</TabsTrigger>
      <TabsTrigger value="summary">Tổng hợp</TabsTrigger>
    </TabsList>
    <TabsContent value="grid">
      <AttendanceLegend />
      <AttendanceGrid ... />
      <AttendanceSummary ... />
      <AttendanceNotesPanel ... />
    </TabsContent>
    <TabsContent value="summary">
      <AttendanceSummaryTab branchId={branchId} weekStart={weekStart} />
    </TabsContent>
  </Tabs>
```

**`AttendanceSummaryTab` inner component** (~30 lines, inline in page):
- `useEffect` → call `getAttendanceSummary(branchId, toISODate(weekStart), month, year)` when tab mounts
- Derive `month` from `weekStart.getMonth() + 1`, `year` from `weekStart.getFullYear()`
- Pass data to `<AttendanceSummaryCards items={data.items} />`
- Loading state via `<AttendanceSummaryCards loading />`
- Reuses existing `AttendanceWeekSelector` from parent (shared state)
- Only fetches when TabsContent mounts (no forceMount → lazy render)

### 2. `components/payroll/payroll-attendance-summary.tsx` (NEW — extracted component)

**ISSUE-11 FIX**: Extract to separate component file (payroll page already 267 lines). Self-contained: own fetch + UI.

```tsx
'use client'

interface Props {
  branchId: string
  month: number
  year: number
}

export function PayrollAttendanceSummary({ branchId, month, year }: Props) {
  // useState for summary data, loading
  // useEffect → getAttendanceSummary(branchId, weekStartOfMonth, month, year)
  // Render <AttendanceSummaryCards items={data.items} compact />
}
```

### 3. `app/(dashboard)/payroll/[period]/page.tsx` (EDIT — minimal)

Add collapsible panel ABOVE spreadsheet tabs. Import `PayrollAttendanceSummary`.

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PayrollAttendanceSummary } from '@/components/payroll/payroll-attendance-summary'

// After header, before Tabs:
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm">
      <ClipboardCheck className="h-4 w-4 mr-1" />Tổng hợp công ▾
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2">
    <PayrollAttendanceSummary branchId={period.branch_id} month={period.month} year={period.year} />
  </CollapsibleContent>
</Collapsible>
```

### 4. `app/(dashboard)/my-attendance/page.tsx` (EDIT)

**Current state**: Server component. Shows calendar + summary counts.

**ISSUE-9 FIX**: Pass `month` and `year` explicitly (not weekStart).

```tsx
// Server component — call action directly with explicit month/year
const summaryResult = await getMyAttendanceSummary(month, year)
const summaryItems = summaryResult.data?.items ?? []

// After summary card:
{summaryItems.length > 0 && summaryItems[0]?.classes.length > 0 && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Công theo lớp — Tháng {month}/{year}</CardTitle>
    </CardHeader>
    <CardContent>
      {summaryItems[0].classes.map((cls) => (
        <div key={cls.class_code} className="flex justify-between py-1 border-b last:border-0">
          <span className="text-sm">{cls.class_code} ({cls.class_name})</span>
          <span className="text-sm font-medium">{cls.sessions} công</span>
        </div>
      ))}
      <div className="flex justify-between pt-2 font-bold text-sm">
        <span>Tổng tháng</span>
        <span>{summaryItems[0].total_month} công</span>
      </div>
    </CardContent>
  </Card>
)}
```

**Note**: VP staff (office/admin) will show only total (empty classes[]) — the conditional `classes.length > 0` handles this. VP employees see the total in the existing summary card.

## Implementation Order

1. Extract `PayrollAttendanceSummary` to separate component file
2. Edit `/attendance` page — add Tabs + summary tab
3. Edit `/payroll/[period]` page — add collapsible panel (minimal, uses extracted component)
4. Edit `/my-attendance` page — add class breakdown card

## Validation

- [x] `/attendance` → "Tổng hợp" tab shows all employees by class
- [x] `/attendance` → switching to "Tổng hợp" tab triggers fetch; switching back does NOT re-fetch grid
- [x] `/attendance` → week selector changes data in both tabs (but only fetches for active tab)
- [x] `/attendance` → admin must select branch first (existing guard reused)
- [x] `/payroll/[period]` → collapsible "Tổng hợp công" shows monthly totals
- [x] `/my-attendance` → employee sees own class breakdown with correct month/year
- [x] VP staff shows total only (no class breakdown)
- [x] Build passes (`npm run build`)
- [x] Payroll page stays under 280 lines (extracted component)
- [x] No forceMount on summary tab (lazy render confirmed)

## Risk

| Risk | Mitigation |
|------|------------|
| `/attendance` page exceeds 200 lines | Extract `AttendanceSummaryTab` to component file if >200 |
| Payroll page already 267 lines | PayrollAttendanceSummary is a separate component — minimal edit |
| `/my-attendance` is SSR — hydration issues | No client interactivity needed — pure server render |
