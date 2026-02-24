# Research: Zalo OA & Email Communication Integration

**Date:** 2026-02-24
**Focus:** Zalo template messaging, ZNS, and email sending from Next.js

---

## 1. Zalo OA Template Messages (ZBS)

### Overview
- **Official name:** ZBS (Zalo Business Service) Template Message
- **Purpose:** Send pre-approved business templates to users (transactional, marketing, notifications)
- **Platform:** Zalo Official Account (OA) only, not personal accounts

### Registration & Templates
1. Register Zalo OA in Zalo workspace
2. Create app and get `app_id`, `app_secret`
3. Submit template via Zalo Developer Portal with:
   - Template name
   - Content (with `{{param}}` placeholders)
   - Category: notification/promotion/transactional
4. Await approval (can take 1-3 days)
5. Once approved, get template ID

### API Endpoint
```
POST https://api.zalo.me/v3/oa/message/template/send
Authorization: Bearer {access_token}

{
  "recipient_id": "user_uid",
  "template_id": "approved_template_id",
  "template_data": {
    "param_name": "value"
  }
}
```

### Constraints
- **Recipients:** Only users who follow/interact with OA (not arbitrary phone numbers)
- **Content:** Pre-approved templates only; cannot send custom text (security model)
- **Rate limit:** ~100,000 requests/day, 1,000/min, 100/sec per app
- **Cost:** Free tier included in Zalo OA; premium features have limits

---

## 2. Zalo Notification Service (ZNS)

### Overview
- **Purpose:** Send high-priority notifications to users (order confirmations, reminders, alerts)
- **Recipient field:** Both `user_id` AND phone numbers (more flexible than templates)
- **Approval:** Requires ZNS setup + template approval process

### Requirements & Approval
1. Request ZNS access from Zalo (contact developers@zalo.me)
2. Whitelist phone numbers or use follower UIDs
3. Create/register templates in Zalo workspace
4. Submit for approval (usually 1-2 days)
5. Get ZNS access token separate from OA token

### API Endpoint
```
POST https://api.zalo.me/v3/oa/message/template/send-zns
Authorization: Bearer {zns_access_token}

{
  "phone": "+84912345678",  // or "recipient_id": "uid"
  "template_id": "zns_template_id",
  "template_data": {
    "param": "value"
  }
}
```

### Key Limitations
- **Must be approved use case:** Order notifications, appointment reminders, payment receipts (NOT marketing)
- **Followers only:** Requires users to follow OA first (for non-phone-number recipients)
- **Rate limit:** Varies by tier; typically 10,000-100,000/day
- **Cannot send to:** Non-followers without phone number OR unverified accounts

**CRITICAL:** ZNS not suitable for "send to any number" scheduler. Need follower UIDs.

---

## 3. Zalo Personal Account API

### Status
- **Official API:** NO. Zalo does NOT provide official SDK/API for personal accounts
- **Why:** Personal accounts are user-facing, not business-facing; Zalo prevents automation abuse
- **Unofficial methods:** Exist but violate ToS; risk account suspension/ban

### Assessment
**VERDICT: NOT FEASIBLE** for production use. Build only with OA/ZNS.

---

## 4. Email from Next.js 16: Provider Comparison

| Provider | Setup | Cost Free Tier | npm Package | Notes |
|----------|-------|---|---|---|
| **Resend** | Simple API key | 100/day | `resend` | Modern, React-native, cleanest Next.js integration |
| **SendGrid** | API key | 100/day (30k/mo) | `@sendgrid/mail` | Industry standard, reliable |
| **Nodemailer** | SMTP config | Unlimited | `nodemailer` | DIY SMTP; need mailbox (Gmail, etc.) |
| **Mailgun** | API key | 300/day (10k/mo) | `mailgun-js` | Good for startups |
| **AWS SES** | AWS account | 62k/day (100k/mo) | `aws-sdk` | Cheapest at scale; more setup |

### Recommendation
**Resend** for Next.js server actions:
- Modern TypeScript support
- Built-in React email templates
- Server action friendly
- `npm install resend`
- **Free tier:** 100 emails/day (sufficient for prototype)

### Server Action Pattern
```typescript
'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminder(email: string, template: string) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@luna.com',
      to: email,
      subject: template.subject,
      html: template.html
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to send' };
  }
}
```

---

## 5. Email Template Pattern (Database-Driven)

### Architecture
Store templates in Supabase `email_templates` table:

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT UNIQUE,  -- e.g., "reminder-followup"
  stage TEXT NOT NULL,      -- 'development', 'staging', 'production'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,  -- with {{param}} placeholders
  params JSONB DEFAULT '{}', -- list of expected params
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Rendering Pattern
```typescript
function renderTemplate(template: EmailTemplate, data: Record<string, string>) {
  let html = template.body_html;
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return html;
}
```

### Stage Isolation
- Use `stage` column to distinguish dev/prod templates
- Load based on `process.env.NODE_ENV`
- No need for separate databases

---

## 6. Rate Limits Summary

| Service | Limit | Notes |
|---------|-------|-------|
| **Zalo OA Template** | 100k/day, 1k/min, 100/sec | Per app; follower-only |
| **ZNS** | 10k-100k/day (tier-dependent) | Phone OR follower UID |
| **Resend** | 100/day free; $20+/mo for more | Unlimited on paid |
| **SendGrid** | 100/day free; $14.95+/mo | 30k/mo free tier |

---

## Implementation Path (Priority)

1. **Email first** (easier, no approval): Resend + Supabase templates
2. **Zalo OA templates** (medium complexity): Register OA, create templates, integrate API
3. **ZNS** (hardest): Request access, phone whitelist, separate token
4. **Skip:** Personal account API (not official)

---

## Unresolved Questions

- Exact ZNS approval timeline for Luna CRM use case (need email to developers@zalo.me)
- Can ZNS send to phone numbers without follower UIDs? (docs unclear)
- Resend free tier stability for production (100/day very limited)
