# Research Report: Activity Management & Reminder Systems for Next.js + Supabase

**Date**: 2026-02-24
**Scope**: Scheduled reminders, activity scheduling UI, stage-based workflows, real-time notifications
**Target**: Luna English CRM homeserver (no Vercel)

## 1. Scheduled Reminders: Approach Selection

### Current Implementation (Luna CRM)
- **Cron route**: `GET /api/cron/check-overdue-reminders` (every 15min via external scheduler)
- **Trigger**: Finds pending reminders where `remind_at < NOW()`, creates notifications
- **Limitation**: Requires external service (no Vercel, must run locally or self-host)

### Option 1: Supabase pg_cron (Database Layer)
**Recommendation: BEST for homeserver**

Pros:
- Decoupled from app runtime (survives crashes)
- No external scheduler dependency
- Native PostgreSQL, built into Supabase Cloud
- Supports cron expressions (e.g., `0 8 * * *`)

Cons:
- Limited to SQL operations (no direct HTTP calls without webhook)
- Cannot invoke Next.js server actions directly

**Pattern**:
```sql
SELECT pg_cron.schedule('check-reminders', '*/15 * * * *', $$
  SELECT notify_overdue_reminders();
$$);
```

Then use Supabase realtime or polling to deliver notifications.

### Option 2: Vercel Cron (Not viable for homeserver)
- Requires Vercel deployment
- Deploy once, cron works globally
- Simple but incompatible with self-hosted requirement

### Option 3: Client-side Polling (Fallback)
For development/demo only. Polling `/api/reminders/check` every 60s from browser—unreliable, high bandwidth.

**Decision**: Use pg_cron for production, optional Vercel cron as fallback if deployed later.

---

## 2. Activity Scheduling UI Patterns

### Existing Pattern (Luna CRM CreateReminderDialog)
✓ Strengths:
- Simple date/time inputs (HTML5 native)
- Lead search via searchLeads() server action
- Reminder type select (REMINDER_TYPES enum)

✗ Gaps for enhancement:
- No date range picker (single date only)
- No calendar visualization
- No batch/recurring pattern UI
- No participant multi-select

### shadcn/ui Recommended Components

**Date Range Picker**: Use `Popover` + `Calendar` from shadcn/ui
```tsx
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/button"

// Pattern: Range selection via date-fns
const [dateRange, setDateRange] = useState({ from: null, to: null })
// Toggle mode: single/range/recurring
```

**Multi-Select Participants**: Extend existing Lead search
```tsx
// Add checkboxes to lead results, store selected[] in state
// Pass to server action: createActivity(..., participantIds: string[])
```

**Calendar View**: Recharts already in stack, integrate with calendar-utils
```tsx
import { getDaysInMonth, startOfMonth } from "date-fns"
// Build mini calendar view to show existing reminders
```

### Recommended UI Enhancement
- **Date picker**: Replace `<input type="date">` with shadcn Popover + Calendar (better UX, date range support)
- **Recurrence**: Add Select dropdown: "Once" | "Daily" | "Weekly" | "Monthly"
- **Participants**: Keep lead search but add checkbox list below results
- **Template buttons**: Quick "Set for 2 days from now", "Next Monday 9am", etc.

---

## 3. Supabase pg_cron for Reminders

### Setup Requirement
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Pattern 1: Notification Creation (Current)
```sql
-- Migration: create function to notify overdue reminders
CREATE OR REPLACE FUNCTION public.notify_overdue_reminders()
RETURNS TABLE(notified_count INT) AS $$
DECLARE
  notification_count INT;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT
    r.assigned_to,
    'Reminder overdue: ' || l.student_name,
    'Follow-up due on ' || r.remind_at::text,
    'reminder'::text,
    '/reminders'::text
  FROM public.follow_up_reminders r
  JOIN public.leads l ON r.lead_id = l.id
  WHERE r.status = 'pending' AND r.remind_at < NOW();

  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN QUERY SELECT notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule every 15 minutes
SELECT pg_cron.schedule('notify_reminders_15min', '*/15 * * * *',
  'SELECT public.notify_overdue_reminders();'
);
```

### Pattern 2: Stage-Based Auto-Reminders (Existing)
Luna CRM already uses trigger on `leads.current_stage` change:
- Automatically creates follow-up reminders when stage moves to `dang_nurture` (+7 days)
- Creates `close_reminder` for `cho_chot` stage (+3 days)

**Best Practice**: Triggers handle state transitions; cron handles overdue notifications.

### Pattern 3: Webhook Delivery (for future Slack/email)
```sql
-- Future: add webhook dispatch after notification creation
INSERT INTO public.message_queue (type, recipient, payload, status)
SELECT 'slack', u.email, json_build_object(
  'reminder_id', r.id, 'lead_name', l.parent_name
), 'pending'
FROM follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id
JOIN public.users u ON r.assigned_to = u.id
WHERE r.status = 'pending' AND r.remind_at < NOW()
  AND r.remind_at > NOW() - INTERVAL '5 minutes';
```

---

## 4. Stage-Based Workflow Reminders (Triggers)

### Current Pattern (Migration 010)
Trigger fires on `leads.current_stage` UPDATE:
```sql
CASE NEW.current_stage
  WHEN 'moi_tiep_nhan' THEN -- +2 hours
    INSERT INTO follow_up_reminders (lead_id, remind_at, type, assigned_to)
    VALUES (NEW.id, NOW() + INTERVAL '2 hours', 'follow_up', NEW.assigned_to);

  WHEN 'dang_nurture' THEN -- +7 days
    INSERT INTO follow_up_reminders (lead_id, remind_at, type, assigned_to)
    VALUES (NEW.id, NOW() + INTERVAL '7 days', 'follow_up', NEW.assigned_to);
END CASE;
```

### Enhancement: Next-Step Checklist Pattern
Extend to create activity checklist on stage transition:
```sql
-- After reminder creation, auto-create activities for guidance
INSERT INTO public.lead_activities (lead_id, type, content, created_by)
VALUES
  (NEW.id, 'checklist', 'Initial contact: Explain program benefits', NULL),
  (NEW.id, 'checklist', 'Discuss trial class schedule', NULL),
  (NEW.id, 'checklist', 'Send trial booking link', NULL);
```

### Risk Mitigation
- Add `IF NOT EXISTS` check to prevent duplicate reminders
- Log trigger execution for audit trail
- Set `RETURNS NULL` vs `RETURNS NEW` carefully (affects update behavior)

---

## 5. Real-Time Notifications: Supabase Realtime Pattern

### Architecture
```
PostgreSQL trigger
    ↓
Insert into notifications table
    ↓
Supabase Realtime broadcast (if RLS allows user to see row)
    ↓
Client subscribed to user's notifications channel
    ↓
In-app toast/badge update (Sonner)
```

### Implementation (Hook Pattern)
```tsx
// lib/hooks/use-notifications.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types/notifications'

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to user's notification channel (RLS enforces access)
    const channel = supabase
      .channel(`notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
          // Optional: toast.success(payload.new.title)
        }
      )
      .subscribe()

    return () => supabase.removeAllChannels()
  }, [userId, supabase])

  return notifications
}
```

### Client-Side Usage
```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const notifications = useNotifications(user.id)

  return (
    <div>
      <Header notificationCount={notifications.length} />
      {children}
    </div>
  )
}
```

### RLS Policy Required
```sql
CREATE POLICY "Users see own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 6. Activity Management DB Patterns

### Current Schema
- `lead_activities`: type, content, created_by, lead_id, created_at
- `follow_up_reminders`: remind_at, assigned_to, status, type

### Enhancement: Scheduled Activities
Add `scheduled_date` and `participants[]` array:
```sql
ALTER TABLE public.lead_activities ADD COLUMN scheduled_date TIMESTAMPTZ;
ALTER TABLE public.lead_activities ADD COLUMN participant_ids UUID[] DEFAULT '{}';
ALTER TABLE public.lead_activities ADD COLUMN recurrence_pattern VARCHAR(20); -- 'once', 'daily', 'weekly'
```

### Trigger Pattern: Auto-Cascade Activities
When creating high-priority activity (type='followup'), auto-create related reminder:
```sql
CREATE OR REPLACE FUNCTION create_reminder_from_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'followup' AND NEW.scheduled_date IS NOT NULL THEN
    INSERT INTO public.follow_up_reminders (
      lead_id, remind_at, type, note, assigned_to
    ) VALUES (
      NEW.lead_id, NEW.scheduled_date, 'follow_up', NEW.content, NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_activity_create_reminder
AFTER INSERT ON public.lead_activities
FOR EACH ROW
EXECUTE FUNCTION create_reminder_from_activity();
```

---

## 7. Homeserver Deployment Considerations

### Cron Execution Without Vercel
**Option A: Self-hosted pg_cron (Supabase Cloud)**
✓ Runs reliably in Supabase managed DB
✓ No external HTTP calls needed initially
✗ Cannot trigger Next.js directly; must use notifications table as queue

**Option B: Systemd timer on homeserver**
```bash
# /etc/systemd/system/luna-cron.timer
[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```
Calls `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-overdue-reminders`

**Option C: node-cron package (In-process)**
```ts
import cron from 'node-cron'
// Runs inside Next.js app, survives restarts only if server stays up
cron.schedule('*/15 * * * *', async () => {
  await checkOverdueReminders()
})
```

**Recommendation**: Prefer Option A (pg_cron) + polling notifications table. Most reliable for 24/7 operation.

---

## 8. Security Considerations

1. **Reminder Access**: RLS on `follow_up_reminders` (advisors see only assigned reminders)
2. **Cron Secret**: Protect `/api/cron/` routes with `CRON_SECRET` env var (existing pattern)
3. **Notification Privacy**: RLS on notifications (user sees only own; pg_cron uses SECURITY DEFINER function)
4. **Participant Data**: Validate participant UUIDs server-side before inserting into `participant_ids[]`

---

## Key Decisions Matrix

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Scheduler | Supabase pg_cron | No external service, 24/7 reliability |
| Notification delivery | Supabase Realtime | Real-time, zero latency, built-in |
| UI date picker | shadcn/ui Popover + Calendar | Matches design system, date-range support |
| Multi-select UX | Extend lead search with checkboxes | Minimal complexity, proven pattern |
| Activity scheduling | Store in DB, trigger on create | Enables recurrence, audit trail |
| Stage-based rules | PostgreSQL triggers (existing) | Atomic, DB-enforced, no race conditions |

---

## Unresolved Questions

1. **Recurring activities**: Should Luna support "repeat every Monday 3pm"? Requires recurrence_pattern parsing (consider `rrule` library).
2. **Notification channels**: Email, SMS, in-app only, or all three?
3. **Batch participants**: If creating activity for 5 students, create 5 separate records or 1 with array?
4. **Override reminders**: If advisor marks lead "do not contact", how to suppress auto-reminders?
5. **Timezone awareness**: Currently UTC only; support Vietnam timezone (+7)?
