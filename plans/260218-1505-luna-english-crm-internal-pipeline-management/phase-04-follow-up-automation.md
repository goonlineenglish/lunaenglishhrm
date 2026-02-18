# Phase 04: Follow-up Automation

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 03](./phase-03-lead-pipeline-kanban.md) (lead pipeline, activity logging)
- Research: [Tech Stack](./research/researcher-01-nextjs-supabase-stack.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P1
- **Status:** Pending
- **Effort:** 5h

Build the follow-up reminder system: auto-create reminders on stage change, reminder dashboard (today/overdue/upcoming), notification bell with unread count, Vercel Cron for overdue checks, and in-app notification system with Supabase Realtime.

## Key Insights

- DB trigger (Supabase function) is most reliable for auto-creating reminders on stage change -- runs even if API is called directly
- Vercel Cron (free tier: 2 cron jobs) for periodic overdue checks
- Supabase Realtime on `notifications` table for instant bell updates
- SLA rules per stage:
  - MỚI TIẾP NHẬN → remind in 2h
  - ĐANG NURTURE → remind every 7 days (recurring)
  - CHỜ CHỐT → remind in 3 days
- Reminder statuses: `pending` → `done` | `skipped`
- Notifications separate from reminders: notification = "you have an overdue task"

## Requirements

### Functional
- Auto-create reminders when lead stage changes:
  - `moi_tiep_nhan`: 2h SLA reminder
  - `dang_nurture`: 7-day recurring follow-up
  - `cho_chot`: 3-day close follow-up
- Manual reminder creation (any stage, custom date/time/note)
- Reminder dashboard page: sections for Today, Overdue (red), Upcoming (next 7 days)
- Complete/skip reminder actions with optional note
- Notification bell in header: unread count badge, dropdown list
- In-app notifications created when reminders become overdue
- Vercel Cron job: every 15 minutes check for newly overdue reminders, create notifications
- Supabase Realtime subscription on notifications table for live bell updates

### Non-functional
- Reminders sorted by urgency (overdue first, then soonest)
- Overdue reminders highlighted red
- Notification bell updates without page refresh
- Cron job completes within 10 seconds

## Architecture

```
Auto-Reminder Flow:
  Lead stage changes (drag or API)
  → Supabase DB trigger function: create_stage_reminder()
  → Inserts into follow_up_reminders (remind_at calculated by stage SLA)

Overdue Check Flow (Cron):
  Vercel Cron (every 15 min) → POST /api/cron/check-overdue-reminders
  → Query: reminders WHERE remind_at < NOW() AND status = 'pending'
  → For each overdue: INSERT notification (user_id = reminder.assigned_to)
  → Supabase Realtime broadcasts to connected clients

Notification Flow:
  New notification inserted → Realtime subscription fires
  → Notification bell updates count
  → User clicks bell → sees dropdown list
  → Click notification → navigate to lead detail
  → Mark as read

Reminder Dashboard:
  /reminders page (Server Component)
  → Fetch reminders for current user (or all if admin)
  → Group: overdue, today, upcoming
  → Client Component for complete/skip actions
```

### Database Trigger (Supabase Function)

```sql
CREATE OR REPLACE FUNCTION create_stage_reminder()
RETURNS TRIGGER AS $$
BEGIN
  -- Only on stage change
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    -- Cancel pending reminders for old stage
    UPDATE follow_up_reminders
    SET status = 'skipped'
    WHERE lead_id = NEW.id AND status = 'pending';

    -- Create new reminder based on stage
    CASE NEW.current_stage
      WHEN 'moi_tiep_nhan' THEN
        INSERT INTO follow_up_reminders (lead_id, remind_at, type, assigned_to)
        VALUES (NEW.id, NOW() + INTERVAL '2 hours', 'sla_reminder', NEW.assigned_to);
      WHEN 'dang_nurture' THEN
        INSERT INTO follow_up_reminders (lead_id, remind_at, type, assigned_to)
        VALUES (NEW.id, NOW() + INTERVAL '7 days', 'follow_up', NEW.assigned_to);
      WHEN 'cho_chot' THEN
        INSERT INTO follow_up_reminders (lead_id, remind_at, type, assigned_to)
        VALUES (NEW.id, NOW() + INTERVAL '3 days', 'close_reminder', NEW.assigned_to);
      ELSE NULL; -- No auto-reminder for other stages
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_stage_change
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_stage_reminder();
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/010_create-stage-reminder-trigger.sql` | DB trigger: auto-create reminders on stage change |
| `app/(dashboard)/reminders/page.tsx` | Reminder dashboard (server component, fetch + group) |
| `app/(dashboard)/reminders/loading.tsx` | Skeleton loader |
| `components/reminders/reminder-dashboard.tsx` | Client component: sections (overdue, today, upcoming) |
| `components/reminders/reminder-section.tsx` | Section renderer: title, count badge, list of cards |
| `components/reminders/reminder-card.tsx` | Card: lead name, reminder type, due time, complete/skip buttons |
| `components/reminders/create-reminder-dialog.tsx` | Dialog: manual reminder creation (lead, date, type, note) |
| `components/layout/notification-bell.tsx` | Enhanced: unread count, dropdown list, Realtime subscription |
| `components/layout/notification-dropdown.tsx` | Dropdown list of recent notifications |
| `components/layout/notification-item.tsx` | Single notification row: icon, message, time, read status |
| `app/api/cron/check-overdue-reminders/route.ts` | Cron endpoint: find overdue, create notifications |
| `lib/actions/reminder-actions.ts` | Server actions: createReminder, completeReminder, skipReminder |
| `lib/actions/notification-actions.ts` | Server actions: getNotifications, markRead, markAllRead |
| `lib/hooks/use-realtime-notifications.ts` | Custom hook: Realtime subscription on notifications table |
| `lib/constants/reminder-types.ts` | Reminder type labels + icons (Vietnamese) |
| `vercel.json` | Cron job config (if not already exists) |

### Files to Modify

| File | Change |
|------|--------|
| `components/layout/notification-bell.tsx` | Replace placeholder with real notification system |
| `components/pipeline/lead-detail-reminders.tsx` | Connect to real reminder data, add create button |
| `lib/constants/navigation.ts` | Add badge count to reminders nav item |

## Implementation Steps

1. **Create DB trigger migration** `supabase/migrations/010_create-stage-reminder-trigger.sql`
   - Function `create_stage_reminder()` as shown in Architecture
   - Trigger on `leads` table AFTER UPDATE
   - Test: update lead stage via SQL, verify reminder created

2. **Create reminder type constants** `lib/constants/reminder-types.ts`
   - Map: `sla_reminder` → "Nhac SLA 2h", `follow_up` → "Follow-up dinh ky", `close_reminder` → "Nhac chot", `renewal` → "Nhac gia han", `custom` → "Tu tao"
   - Icons for each type

3. **Create reminder server actions** `lib/actions/reminder-actions.ts`
   - `createReminder(leadId, remindAt, type, note)`: insert reminder
   - `completeReminder(id, note?)`: set status=done, log activity
   - `skipReminder(id, reason?)`: set status=skipped
   - `getReminders(userId, filter)`: fetch with lead info joined
   - For nurture recurring: on complete, auto-create next 7-day reminder

4. **Create notification server actions** `lib/actions/notification-actions.ts`
   - `getNotifications(userId, limit)`: fetch recent, unread first
   - `getUnreadCount(userId)`: count unread
   - `markRead(id)`: mark single as read
   - `markAllRead(userId)`: mark all as read

5. **Create reminder dashboard page** `app/(dashboard)/reminders/page.tsx`
   - Server component: fetch reminders for current user
   - Group into: overdue (remind_at < now, status=pending), today, upcoming (next 7 days)
   - Render `<ReminderDashboard />`

6. **Create ReminderDashboard** `components/reminders/reminder-dashboard.tsx`
   - `'use client'` for complete/skip interactions
   - Three `<ReminderSection />` components
   - "Tao nhac nho" button → CreateReminderDialog
   - Stats: total pending, overdue count

7. **Create ReminderSection** `components/reminders/reminder-section.tsx`
   - Title + count badge (red for overdue)
   - List of `<ReminderCard />`
   - Empty state: "Khong co nhac nho"

8. **Create ReminderCard** `components/reminders/reminder-card.tsx`
   - Lead parent name (link to lead detail)
   - Reminder type badge
   - Due time (relative: "2 gio nua" or "Qua han 1 ngay")
   - Complete button (check icon) → completeReminder action
   - Skip button (x icon) → skipReminder action
   - Overdue: red border/background

9. **Create CreateReminderDialog** `components/reminders/create-reminder-dialog.tsx`
   - Dialog with form: lead search/select, date+time picker, type select, note
   - Submit calls `createReminder` action

10. **Enhance notification bell** `components/layout/notification-bell.tsx`
    - Use `useRealtimeNotifications` hook
    - Bell icon with unread count badge (red circle)
    - Click opens `<NotificationDropdown />`

11. **Create NotificationDropdown** `components/layout/notification-dropdown.tsx`
    - Popover below bell icon
    - Header: "Thong bao" + "Danh dau da doc" button
    - List of `<NotificationItem />`
    - "Xem tat ca" link to /reminders

12. **Create NotificationItem** `components/layout/notification-item.tsx`
    - Icon (type-based), message text, relative time
    - Unread: bold text, blue dot
    - Click: navigate to related lead, mark as read

13. **Create Realtime hook** `lib/hooks/use-realtime-notifications.ts`
    - Subscribe to `notifications` table filtered by current user
    - On INSERT: increment count, add to dropdown list
    - On UPDATE (mark read): decrement count

14. **Create Cron endpoint** `app/api/cron/check-overdue-reminders/route.ts`
    - Verify cron secret header (prevent unauthorized calls)
    - Query overdue reminders not yet notified
    - Create notification for each: "Lead [name] qua han follow-up"
    - Mark reminder as `notified` (add column or use metadata)
    - Return count processed

15. **Create vercel.json** cron config
    ```json
    {
      "crons": [{
        "path": "/api/cron/check-overdue-reminders",
        "schedule": "*/15 * * * *"
      }]
    }
    ```

16. **Update lead detail reminders tab** `components/pipeline/lead-detail-reminders.tsx`
    - Show reminders for this lead
    - Complete/skip actions inline
    - "Them nhac nho" button

17. **Add nurture recurring logic**
    - When completing a nurture follow-up: auto-create next reminder (7 days later)
    - Continue until lead exits ĐANG NURTURE stage

## Todo List

- [ ] Create DB trigger for auto-reminders on stage change
- [ ] Create reminder type constants (Vietnamese labels)
- [ ] Create reminder server actions (CRUD + complete/skip)
- [ ] Create notification server actions (get, markRead)
- [ ] Create reminder dashboard page
- [ ] Create ReminderDashboard client component
- [ ] Create ReminderSection component
- [ ] Create ReminderCard component
- [ ] Create CreateReminderDialog
- [ ] Enhance notification bell with real data
- [ ] Create NotificationDropdown
- [ ] Create NotificationItem
- [ ] Create Realtime notifications hook
- [ ] Create Cron endpoint for overdue checks
- [ ] Create vercel.json cron config
- [ ] Update lead detail reminders tab
- [ ] Implement nurture recurring reminder logic
- [ ] Test auto-reminder on stage drag
- [ ] Test overdue cron creates notifications
- [ ] Test Realtime notification bell update
- [ ] Test complete/skip reminder flow

## Success Criteria

- Dragging lead to MỚI TIẾP NHẬN auto-creates 2h reminder
- Dragging lead to ĐANG NURTURE auto-creates 7-day reminder
- Dragging lead to CHỜ CHỐT auto-creates 3-day reminder
- Overdue reminders appear red in dashboard
- Notification bell shows unread count, updates in real time
- Cron job creates notifications for overdue reminders every 15 min
- Completing nurture reminder auto-creates next 7-day reminder
- Manual reminder creation works with custom date/time

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| DB trigger silently fails | Reminders not created | Log trigger errors, test with all stage transitions |
| Cron job missed execution | Overdue notifications delayed | 15-min interval acceptable; add manual "check now" button |
| Notification spam | Users ignore bell | Only notify once per overdue reminder (idempotent) |
| Timezone issues | Reminders at wrong time | Store all timestamps UTC, convert in UI using user's locale |

## Security Considerations

- Cron endpoint protected by `CRON_SECRET` header verification
- RLS: advisors only see their own reminders and notifications
- Admin sees all reminders across team
- Notification `user_id` set server-side, not client-provided
- Rate limit manual reminder creation (prevent spam)

## Next Steps

- Phase 5 uses renewal reminders (type: `renewal`) for student level expiry
- Phase 6 dashboard aggregates reminder stats (overdue count, avg response time)
- Phase 7 can trigger Zalo OA messages from reminder system
