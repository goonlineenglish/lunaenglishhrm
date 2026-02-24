# Phase 06 — Zalo OA Messaging from Lead Card

## Context Links
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 01 DB](./phase-01-db-schema-stage-notes-activities.md)
- Existing: `lib/integrations/zalo-client.ts`, `lib/integrations/zalo-webhook-handler.ts`
- Existing table: `zalo_followers` (maps user_id ↔ zalo_uid)
- Existing component: `components/pipeline/lead-detail-zalo.tsx`
- Research: `research/researcher-02-zalo-email-comms.md`

## Overview
- **Priority**: P2
- **Status**: completed
- **Description**: Add "Gửi Zalo" button to lead card. Send template messages via Zalo OA to leads who are OA followers. Support stage-based message templates. Log sent messages as activities. Add scheduled reminder sending (e.g., 1 day before trial class).

## Key Insights
- **Constraint**: Can only send to leads who follow Zalo OA (need `zalo_uid` from `zalo_followers` table)
- Existing `zalo-client.ts` has `sendTextMessage(accessToken, userId, message)` — use this
- Zalo OA Template Messages require prior approval from Zalo (separate from CS messages)
- **MVP approach**: Use CS (Customer Service) messages (free-form text) for now — suitable since lead already messaged OA
- ZNS (for non-followers): requires registration + approval process (phase 06 stretch goal)
- Lead-Zalo connection: `zalo_followers.phone_number` ↔ `leads.parent_phone` for matching
- Existing `lead-detail-zalo.tsx` tab shows Zalo connection status

## Requirements

### Functional
1. "Gửi Zalo" button in lead detail — only active if lead has linked Zalo UID
2. Zalo message compose dialog:
   - Select template (stage-based from `zalo_message_templates`)
   - Preview message with lead vars substituted
   - Edit before sending
   - Send button
3. **Scheduled Zalo reminder**: when activity `schedule_to` is 1 day away and type='trial_class' → auto-send Zalo reminder to lead
4. Sent message logged as activity (type='message', metadata `{channel:'zalo'}`)
5. Show "Chưa kết nối Zalo" state if lead has no Zalo UID

### Non-functional
- Use existing message_queue for retry logic
- Graceful degradation if lead not linked to Zalo

## Architecture

### Zalo UID Lookup (FIXED per codex review)
```ts
// Step 1: Try direct lead_id match (most reliable)
let follower = await supabase
  .from('zalo_followers')
  .select('zalo_user_id')
  .eq('lead_id', leadId)
  .single()

// Step 2: Fallback to phone match (normalize +84/0 prefix)
if (!follower?.zalo_user_id && lead.parent_phone) {
  const normalized = normalizeVietnamesePhone(lead.parent_phone) // +84xxx
  follower = await supabase
    .from('zalo_followers')
    .select('zalo_user_id')
    .eq('phone_number', normalized)
    .single()
}
```

### Zalo Gating (FIXED per codex review)
```ts
// DO NOT gate by lead.source === 'zalo'
// Gate by: does lead have a zalo_followers record?
// A Facebook lead who later follows Zalo OA should still be sendable
const hasZaloConnection = !!follower?.zalo_user_id
```

### Server Action: `lib/actions/zalo-message-actions.ts` (new file)
```ts
'use server'

export async function sendZaloMessage(
  leadId: string,
  templateKey: string,
  customBody?: string
): Promise<{ success: boolean; error?: string }>

export async function getZaloTemplates(
  stage?: LeadStage
): Promise<{ data?: ZaloMessageTemplate[]; error?: string }>

export async function scheduleZaloReminder(
  activityId: string  // for trial_class activities
): Promise<{ success: boolean; error?: string }>
```

### Sending Flow
```
sendZaloMessage(leadId, templateKey)
  → Load lead (get parent_phone)
  → Lookup zalo_followers by lead_id first, then fallback phone_number
  → If no zalo_user_id → return { error: 'Lead chưa kết nối Zalo OA' }
  → Load OA access_token from integration_tokens
  → Render template with lead vars
  → Queue via existing message_queue (preferred for retry) or direct send
  → Log activity: { type:'message', content: renderedMessage, metadata: {channel:'zalo'} }
```

### Auto-Reminder for Trial Class (Cron Extension)
Extend `/api/cron/check-overdue-reminders/route.ts`:
```ts
// Find trial_class activities with schedule_to = tomorrow AND status='pending'
// For each: check if lead has zalo_uid → send reminder via Zalo OA
// Log as activity
// Mark reminder as sent in activity metadata
```

### Component: `send-zalo-dialog.tsx`
```tsx
// components/pipeline/send-zalo-dialog.tsx
"use client"

// Props: leadId, currentStage, hasZaloConnection (boolean)
// If !hasZaloConnection → show "Lead chưa follow Zalo OA" message + instruction
// If connected:
//   - Template selector (filtered by current stage)
//   - Preview rendered message
//   - Edit textarea
//   - Send button → sendZaloMessage() server action
//   - Success: toast + log shown in activities
```

### Zalo Message Templates (Seed)
```sql
INSERT INTO zalo_message_templates (name, template_key, stage, body_text, params) VALUES
('Xác nhận lịch học thử', 'confirm_trial_zalo', 'dat_lich_hoc_thu',
  'Chào phụ huynh {{parent_name}} 👋
Luna English xác nhận lịch học thử cho bé {{student_name}}:
📅 Ngày: {{trial_date}}
🕐 Giờ: {{trial_time}}
📍 Địa điểm: {{location}}
Vui lòng đến đúng giờ. Liên hệ nếu cần thay đổi lịch nhé!',
  '["parent_name", "student_name", "trial_date", "trial_time", "location"]'
),
('Nhắc nhở trước học thử', 'remind_trial_zalo', 'dang_hoc_thu',
  'Chào phụ huynh {{parent_name}} 👋
Nhắc nhở: Ngày mai {{trial_date}} lúc {{trial_time}} là buổi học thử của bé {{student_name}} tại Luna English.
Chúc bé học vui! 🌟',
  '["parent_name", "student_name", "trial_date", "trial_time"]'
),
('Chốt sau học thử', 'close_after_trial_zalo', 'cho_chot',
  'Chào phụ huynh {{parent_name}} 👋
Cảm ơn bé {{student_name}} đã tham gia buổi học thử tại Luna English!
Phụ huynh có hài lòng với buổi học không? Luna rất mong được đồng hành cùng bé 🎓
Liên hệ Luna để đăng ký chính thức nhé!',
  '["parent_name", "student_name"]'
);
```

## Related Code Files

### To Create
- `lib/actions/zalo-message-actions.ts` (~90 lines)
- `components/pipeline/send-zalo-dialog.tsx` (~130 lines)

### To Update
- `lib/integrations/zalo-client.ts` — already has `sendTextMessage` (may need minor extension)
- `components/pipeline/lead-detail-zalo.tsx` — **FIX: remove `source === 'zalo'` gating**, check `zalo_followers` record instead; add "Gửi tin" button
- `app/api/cron/check-overdue-reminders/route.ts` — add trial_class auto-reminder
- `lib/actions/activity-actions.ts` — update activity display to show Zalo icon
- `lib/actions/message-actions.ts` — existing `sendZaloMessage` uses `zalo_followers.lead_id` (correct); add phone fallback

## Implementation Steps

1. **Server action**: `zalo-message-actions.ts`
   - `getZaloTemplates(stage)`
   - `sendZaloMessage(leadId, templateKey, body?)`:
     - Lookup Zalo UID
     - Render template
     - Call `sendTextMessage` from zalo-client.ts
     - Log to lead_activities
     - On failure: add to message_queue
2. **Component**: `send-zalo-dialog.tsx`
3. **Integrate**: Add "Gửi tin Zalo" button to `lead-detail-zalo.tsx` tab
4. **Auto-reminder**: Extend cron to send trial reminders via Zalo 24h before
5. **Activity display**: Update activity icons to show Zalo logo for `metadata.channel=zalo`

## Todo List
- [x] Create zalo-message-actions.ts
- [x] Create send-zalo-dialog.tsx
- [x] Add Gui tin button to lead-detail-zalo.tsx
- [x] Extend cron for auto Zalo trial reminders
- [x] Update activity list icons for Zalo messages
- [ ] Test with real Zalo OA token

## Success Criteria
- Advisor can send Zalo template message to a linked lead
- "Chưa kết nối" state shown for unlinked leads with guidance
- Trial class auto-reminder sends 1 day before via Zalo
- Sent messages appear in activity timeline with Zalo icon
- Failed sends queued in message_queue for retry

## Risk Assessment
- **High**: Leads must be Zalo OA followers — many may not be. Need fallback flow (send SMS or call instead)
- **Medium**: Zalo OA access token expires (existing refresh cron handles this)
- **Low**: message_queue retry logic already implemented
- **Medium**: Zalo API rate limit — at 100/day scale, no issue; at 1000/day, need batching

## Security Considerations
- OA access_token loaded server-side only from `integration_tokens` (never exposed to client)
- `sendZaloMessage` validates UUID + lead ownership
- Message body sanitized before sending (no control characters)
- Failed message bodies NOT logged in error responses

## Unresolved Questions
1. ~~ZNS for non-followers~~: **Skipped for MVP** — revisit if many leads are non-followers
2. **Phone matching**: `zalo_followers.phone_number` format must match `leads.parent_phone` (normalize +84 vs 0xxx)
3. **Zalo personal**: Not feasible via official API (see research report)

## Next Steps
- After Phase 05+06 complete → update docs, run smoke test
- Consider ZNS registration if many leads are non-followers
- Consider adding communication tab to unify Email + Zalo in one panel
