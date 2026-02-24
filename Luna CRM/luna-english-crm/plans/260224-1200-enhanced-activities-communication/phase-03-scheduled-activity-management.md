# Phase 03 — Scheduled Activity Management

## Context Links
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 01 DB](./phase-01-db-schema-stage-notes-activities.md)
- Existing component: `components/pipeline/add-activity-form.tsx`
- Existing component: `components/pipeline/lead-detail-activities.tsx`
- Existing actions: `lib/actions/activity-actions.ts`
- Research: `research/researcher-01-activity-reminders.md`

## Overview
- **Priority**: P1
- **Status**: completed
- **Description**: Upgrade activities from simple log entries to fully scheduled events with date ranges, participants, location, status. Add global "Upcoming Activities" view. Add reminder notifications when activity schedule_to approaches.

## Key Insights
- `lead_activities` already exists — we extend it (Phase 01 adds columns)
- `add-activity-form.tsx` exists — upgrade to include new fields
- Current activity types: call, message, meeting, note, stage_change, trial_booked
- New types from Phase 01: scheduled_call, trial_class, consultation
- Reminder for activity due date: use existing cron pattern (`/api/cron/check-overdue-reminders`)
- Extend cron to also check `lead_activities.schedule_to < NOW() AND status = 'pending'`

## Requirements

### Functional
1. **Add Activity button** on each lead card (visible in Kanban card + detail sheet)
2. **Activity form** with fields:
   - Title (text input)
   - Description (textarea, optional)
   - Type (select: Gọi điện / Học thử / Tư vấn / Gặp mặt / Follow-up / Ghi chú)
   - Participants (multi-select from users list)
   - Schedule From (date + time picker — displayed in Vietnam +7)
   - Schedule To (date + time picker — displayed in Vietnam +7)
   - Location (text input, optional)
   - **Recurrence** (radio: "Một lần" / "Hàng tuần — thứ X")
     - If weekly: show day-of-week select (Thứ 2 → Thứ 7 / CN)
     - On save: generate next 4 weekly instances automatically
3. **Activity list** in lead detail shows scheduled activities with status badge
4. **Global Activities page** — `/activities` route — list of all upcoming activities across all leads, sorted by date; filterable by type/advisor/stage
5. **Reminder system**: when `schedule_to` is within 24h and status=pending → create notification for assigned advisor

### Timezone Rules
- All pickers show Vietnam local time (+07:00)
- On submit: convert to UTC using `date-fns-tz` (`fromZonedTime(localDate, 'Asia/Ho_Chi_Minh')`)
- On display: convert from UTC using `toZonedTime(utcDate, 'Asia/Ho_Chi_Minh')`, format `dd/MM/yyyy HH:mm`
- Install if not present: `npm install date-fns-tz`

### Recurring Activity Logic (Weekly)
```
User picks: "Hàng tuần - Thứ 2, 9:00-10:00"
On save → create parent activity (recurrence_pattern='weekly', recurrence_day_of_week=1)
         + create 4 child activities for next 4 Mondays (parent_activity_id = parent.id)
Child status: each managed independently (can mark one done without affecting others)
Cancel all: delete parent + cascade deletes children
```

## Architecture

### Component Tree
```
LeadCard (kanban-board)
  └── [+ Activity] button → opens AddScheduledActivityDialog

LeadDetailSheet (Activities tab)
  └── LeadDetailActivities (existing)
      ├── AddScheduledActivityDialog (upgraded from add-activity-form)
      └── ScheduledActivityList (replaces current activity list)

/activities (new page)
  └── ActivitiesPage
      ├── ActivitiesFilterBar
      └── ActivitiesTable (date | type | lead | advisor | status)
```

### New/Upgraded Components

**`add-scheduled-activity-dialog.tsx`** (replaces `add-activity-form.tsx`)
```tsx
// Full dialog with all fields
// Reuses shadcn Dialog, Calendar, Popover, Select, Command (for participant search)
// On submit: calls createScheduledActivity() server action
```

**`scheduled-activity-list.tsx`** (replaces `lead-detail-activities.tsx`)
```tsx
// Shows activities sorted by schedule_from
// Status badge: Sắp tới (yellow) | Đã xong (green) | Quá hạn (red)
// "Mark as Done" button → calls updateActivityStatus()
```

**`activities-page-view.tsx`** (new page component)
```tsx
// Global list: all activities for all leads
// Columns: Ngày | Loại | Học sinh | Tư vấn | Trạng thái | Actions
// Filter: by date range, type, status, advisor
```

### Server Actions (extend `lib/actions/activity-actions.ts`)
```ts
// Upgrade existing
export async function createScheduledActivity(
  leadId: string,
  data: {
    title: string
    description?: string
    type: LeadActivityType
    scheduleFrom: string
    scheduleTo: string
    location?: string
    participantIds?: string[]
  }
): Promise<{ success: boolean; data?: LeadActivity; error?: string }>

// New
export async function updateActivityStatus(
  activityId: string,
  status: 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }>

export async function getUpcomingActivities(
  filters?: { advisorId?: string; type?: string; dateFrom?: string; dateTo?: string }
): Promise<{ data?: LeadActivity[]; error?: string }>
```

### Cron Extension (HTTP cron — NOT pg_cron)
Extend existing `/api/cron/check-overdue-reminders/route.ts`:
```ts
// Existing: check follow_up_reminders (keep as-is)
// Add section 2: check lead_activities where schedule_to < NOW() + 1 day AND status='pending'
//   → create notification for assigned advisor (via lead.assigned_to)
//   → skip if notification already exists for this activity (prevent duplicates)
// Strategy: single HTTP cron route handles both reminders + activity deadlines
// DO NOT use pg_cron — avoid double notification from two cron sources
```

### New Page Route
- `app/(dashboard)/activities/page.tsx` — global upcoming activities
- `app/(dashboard)/activities/layout.tsx` — optional

## Related Code Files

### To Create
- `components/pipeline/add-scheduled-activity-dialog.tsx` (~150 lines)
- `components/pipeline/scheduled-activity-list.tsx` (~100 lines)
- `components/pipeline/activities-page-view.tsx` (~150 lines)
- `app/(dashboard)/activities/page.tsx`

### To Update
- `lib/actions/activity-actions.ts` — upgrade createActivity, add updateActivityStatus, getUpcomingActivities
- `lib/types/leads.ts` — extend LeadActivity type (new fields)
- `components/pipeline/lead-detail-activities.tsx` — swap to use new scheduled activity list; **add new types to ACTIVITY_ICONS and ACTIVITY_LABELS maps** (scheduled_call, trial_class, consultation, checklist)
- `app/api/cron/check-overdue-reminders/route.ts` — add activity deadline check
- `lib/constants/navigation.ts` — add /activities nav item
- `components/pipeline/lead-card.tsx` — add "Thêm Activity" quick button

## Implementation Steps

1. **Types**: extend `LeadActivity` interface with new fields in `lib/types/leads.ts`
2. **Server actions**: upgrade `createActivity` + add `updateActivityStatus` + `getUpcomingActivities`
3. **Dialog component**: `add-scheduled-activity-dialog.tsx`
   - Form with all fields
   - Date range picker (shadcn Popover + Calendar)
   - Participant multi-select (reuse user search)
   - Submit → server action
4. **Activity list component**: `scheduled-activity-list.tsx`
   - Show activities sorted by schedule_from
   - Status color coding
   - Mark done/cancel buttons
5. **Global activities page**: `app/(dashboard)/activities/page.tsx`
   - Load via `getUpcomingActivities()` server action
   - Filter bar + table
6. **Add to nav**: update navigation.ts with /activities
7. **Extend cron**: update `check-overdue-reminders` to also check activity deadlines
8. **Add button to lead card**: quick "+" button on kanban card opens dialog

## Todo List
- [x] Extend LeadActivity type
- [x] Upgrade createActivity server action
- [x] Add updateActivityStatus server action
- [x] Add getUpcomingActivities server action
- [x] Create add-scheduled-activity-dialog.tsx
- [x] Create scheduled-activity-list.tsx
- [x] Create activities-page-view.tsx
- [x] Create app/(dashboard)/activities/page.tsx
- [x] Update lead-detail-activities.tsx
- [x] Add activity button to lead-card.tsx
- [x] Extend cron check-overdue-reminders
- [x] Add to navigation

## Success Criteria
- Advisor can schedule activity from lead card with all fields
- Activity appears in lead detail Activities tab with date/status
- Global /activities page shows all upcoming activities
- 24h before schedule_to → notification created for advisor
- Marking activity "Đã xong" updates status, removes from upcoming list
- After schedule_to passes without completion → notification prompts to close

## Risk Assessment
- **Medium**: `add-activity-form.tsx` is used in multiple places — need to replace cleanly
- **Low**: New page doesn't affect existing pages
- **Low**: Cron extension is additive

## Security Considerations
- UUID validation on all activity IDs in server actions
- `getUpcomingActivities` filters by `assigned_to = auth.uid()` for advisors (admin sees all)
- Participant IDs validated against `users` table

## Next Steps
- Phase 04: Smart Stage Reminders (uses activity data for next-step suggestions)
