# Phase 05 — Email Communication from Lead Card

## Context Links
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 01 DB](./phase-01-db-schema-stage-notes-activities.md)
- Existing: `lib/actions/message-actions.ts`, `lib/integrations/` (Zalo/Facebook clients)
- Research: `research/researcher-02-zalo-email-comms.md`

## Overview
- **Priority**: P2
- **Status**: completed
- **Description**: Add "Send Email" button to lead card detail. Support stage-based email templates stored in DB. Track sent emails in activity log.

## Key Insights
- Use **Resend** as email provider (cleanest Next.js 16 integration, free 100/day)
- Email templates stored in `email_templates` table (seeded in Phase 01)
- Variable substitution: `{{parent_name}}`, `{{student_name}}`, `{{date}}`, `{{advisor_name}}`
- Sent email logged as `lead_activity` with type='message' and metadata `{channel: 'email'}`
- Luna English has ~5-10 staff → 100 emails/day free tier is sufficient initially
- Need RESEND_API_KEY and FROM_EMAIL env vars

## Requirements

### Functional
1. "Gửi Email" button in lead detail sheet
2. Email compose dialog:
   - Select template (filtered by current stage, or "custom")
   - Preview rendered template with lead data substituted
   - Edit subject + body before sending
   - Send button
3. Stage-based template suggestions (auto-select template matching current stage)
4. Sent email logged as activity (timeline entry with "Email" icon)
5. Admin can manage email templates in Settings (stretch goal for Phase 05)

### Non-functional
- Plain text + HTML emails (Resend supports both)
- No email tracking (open/click) required for MVP
- From: configured sender (e.g., `Luna English <noreply@luna.edu.vn>`)

## Architecture

### Email Provider: Resend
```bash
npm install resend
```
```
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```

### Server Action: `lib/actions/email-actions.ts` (new file)
```ts
'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendLeadEmail(
  leadId: string,
  templateKey: string,
  customSubject?: string,
  customBody?: string
): Promise<{ success: boolean; error?: string }>

export async function getEmailTemplates(
  stage?: LeadStage
): Promise<{ data?: EmailTemplate[]; error?: string }>
```

### Template Rendering (util)
```ts
// lib/utils/template-renderer.ts
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
```

### Component: `send-email-dialog.tsx`
```tsx
// components/pipeline/send-email-dialog.tsx
"use client"

// Props: leadId, currentStage, leadData (for preview)
// State: selectedTemplate, editedSubject, editedBody
// Flow:
//   1. Load templates for current stage
//   2. User selects template → preview rendered with lead data
//   3. User can edit before sending
//   4. Submit → sendLeadEmail() server action
//   5. Success → toast + close dialog
//   6. Email logged as activity automatically (inside server action)
```

### Email Templates (Seed in Phase 01)
```sql
INSERT INTO email_templates (name, template_key, stage, subject, body_html, params) VALUES
('Tư vấn ban đầu', 'tu_van_initial', 'moi_tiep_nhan',
  'Thông tin khóa học Luna English cho {{student_name}}',
  '<p>Kính gửi phụ huynh {{parent_name}},</p>
   <p>Cảm ơn bạn đã quan tâm đến khóa học của Luna English.</p>
   <p>Chúng tôi sẽ liên hệ trong thời gian sớm nhất để tư vấn chi tiết.</p>',
  ''["parent_name", "student_name"]''
),
('Xác nhận lịch học thử', 'confirm_trial', 'dat_lich_hoc_thu',
  'Xác nhận lịch học thử cho {{student_name}}',
  '<p>Kính gửi phụ huynh {{parent_name}},</p>
   <p>Buổi học thử của {{student_name}} đã được xác nhận vào <strong>{{trial_date}}</strong>.</p>
   <p>Địa điểm: {{location}}</p>',
  '["parent_name", "student_name", "trial_date", "location"]'
);
```

## Related Code Files

### To Create
- `lib/actions/email-actions.ts` (~80 lines)
- `lib/utils/template-renderer.ts` (~20 lines)
- `components/pipeline/send-email-dialog.tsx` (~140 lines)

### To Update
- `package.json` — add `resend` dependency
- `.env.local` / `.env.example` — add RESEND_API_KEY, EMAIL_FROM
- `components/pipeline/lead-detail-sheet.tsx` — add email button
- `components/pipeline/lead-detail-info.tsx` — or create communication panel

## Implementation Steps

1. **Install Resend**: `npm install resend`
2. **Add env vars**: RESEND_API_KEY, EMAIL_FROM
3. **Create `template-renderer.ts` util**
4. **Create `email-actions.ts`** server action:
   - `getEmailTemplates(stage)` — load from DB
   - `sendLeadEmail(leadId, templateKey, subject, body)`:
     - Load lead data
     - Render template with vars
     - Call Resend API
     - Log as activity in `lead_activities` (type='message', metadata `{channel:'email', subject}`)
5. **Create `send-email-dialog.tsx`** component
6. **Add email button** to lead detail sheet (Communication tab or within Info tab)
7. **Activity display**: update `lead-detail-activities.tsx` to show email icon for `metadata.channel=email`

## Todo List
- [x] npm install resend
- [x] Add env vars
- [x] Create template-renderer.ts
- [x] Create email-actions.ts
- [x] Create send-email-dialog.tsx
- [x] Add email button to lead-detail-sheet
- [x] Log sent emails as activities
- [x] Update activity list to show email entries

## Success Criteria
- Advisor can select template, preview with lead data, edit, and send
- Email delivers to parent_email (verified in dev with Resend test mode)
- Sent email appears in activity timeline with "Email" icon
- Stage-specific templates appear first in template selector
- Error toast if sending fails (lead has no email address, API error)

## Risk Assessment
- **Low**: Resend is simple REST API, no complex setup
- **Medium**: Domain verification required for production (use resend.dev domain in dev)
- **Low**: Template rendering is simple string replacement

## Security Considerations
- RESEND_API_KEY server-side only (never client-side)
- `sendLeadEmail` validates leadId UUID
- Only advisor assigned to lead or admin can send email
- Template body sanitized before DB storage (no JS execution risk in email)
- Rate limit: wrap Resend calls in try/catch, return generic error to client

## Next Steps
- Phase 06: Zalo OA messaging (parallel with Phase 05)
