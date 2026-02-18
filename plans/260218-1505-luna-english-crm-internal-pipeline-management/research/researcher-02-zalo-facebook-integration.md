# Zalo OA API & Facebook Lead Ads Integration Research

**Date:** 2026-02-18
**Scope:** Vietnamese CRM app for education sector

---

## 1. Zalo Official Account (OA) API

### Registration & Verification
- Register on Zalo Developers portal, create app to get App ID/Secret
- Create Enterprise OA (required for API access)
- Link OA to app in "Official Account" section
- Domain verification required (3 methods):
  - HTML file upload to root directory
  - Meta tag in homepage `<head>`
  - DNS TXT record (preferred, up to 72h verification)
- Request API permissions: User Management, Message Management

### Core API Capabilities
**Message Types:**
- Consultation Messages: 2-way chat (7-day reply window from user's last message)
- Transaction Messages: Automated notifications (1-year window for users who interacted)
- Broadcast/Communication: Bulk promotional messages (frequency limited by plan)
- Zalo Notification Service (ZNS): Phone-based notifications (no OA follow required)

**Webhook Events:**
- `user_send_text`, `user_send_image`, `user_send_file`
- `oa_send_text` (confirmation)
- `user_interested` (new follower)

### Rate Limits & Pricing (2026)

**Subscription Tiers (monthly, VND):**
| Tier | Cost | Features |
|------|------|----------|
| Basic | Free | 1,000 contacts, 40 stranger responses/month, no ZNS API |
| Trial | 10,000 | Basic API, limited broadcast |
| Advanced | 59,000 | Higher broadcast limits, enhanced support |
| Premium | 399,000 | Full API access, priority delivery |
| Elite | 1,650,000 | 5,000 friends, 2,000 stranger searches |

**ZNS Pricing (pay-per-use):**
- OTP messages: 300 VND/message (24/7 allowed)
- Normal notifications: 200 VND/message (6am-10pm only)
- 71% cheaper than SMS (700 VND)

**Daily Quotas:**
- <10,000 followers: 500 messages/day
- >10,000 followers: 5% of total followers/day
- ZNS: 500/day for new accounts (scalable based on quality score)
- Broadcast: 1-6 messages/follower/month (plan-dependent)

### Authentication Flow
**OAuth 2.0:**
- Access tokens expire regularly
- Use refresh_token for automated renewal
- Store tokens securely in database

**Webhook Security:**
- `X-Zalo-Signature` header validation (HMAC-SHA256)
- Signature = HMAC(OA_Secret_Key, raw_request_body)
- Must verify on every request to prevent MITM attacks
- 2-second response timeout (return 200 immediately, process async)
- Retry enabled: 30s, 5min, 1h intervals

### Webhook Setup
- Configure endpoint in Zalo Developer Portal
- Must be HTTPS verified domain
- Enable specific events manually
- Implement signature verification before processing
- Async processing pattern required (2-second rule)

### Proactive Messaging Restrictions
**Critical Limitation:**
- Cannot send to non-followers via OA messages
- Can send via ZNS using phone numbers (paid service)
- Transaction messages allowed within 1-year interaction window
- Follow-up reminders require:
  1. User follows OA, OR
  2. ZNS with phone number (200-300 VND/message)

### Small Business Considerations
- Quality Score system: users report spam reduces quotas
- Template approval required for ZNS (must include variables)
- Advanced/Premium tiers recommended for CRM use (59k-399k VND/month)
- ZNS cost-effective for transactional notifications

---

## 2. Facebook Lead Ads Webhook Integration

### Lead Ads Form Mechanics
- Instant Forms pre-filled with Facebook profile data
- Privacy Policy link required (GDPR/CCPA compliance)
- Limited Data Use (LDU) parameter for US state regulations
- Test leads available via Facebook Testing Tool
- 8.78-9.21% average conversion rate

### Webhook Setup
**Prerequisites:**
- Business Manager Admin access required
- Meta Developer App with permissions: `leads_retrieval`, `ads_management`, `pages_show_list`, `pages_manage_ads`

**Configuration:**
1. Add Webhooks product to app
2. Subscribe to Page → `leadgen` field
3. Implement HTTPS endpoint:
   - GET: Verify `hub.verify_token`, return `hub.challenge`
   - POST: Receive `leadgen_id` payload

**Sample POST payload:**
```json
{
  "object": "page",
  "entry": [{
    "id": "PAGE_ID",
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": "1234567890",
        "form_id": "0987654321"
      }
    }]
  }]
}
```

### Graph API Lead Retrieval
**Endpoint:** `GET https://graph.facebook.com/v21.0/{leadgen_id}`
- Requires Long-Lived Page Access Token or System User Token
- User tokens expire every 60 days (breaks integration)
- Returns `field_data` array (map to CRM schema)
- Response within 15 seconds target for competitive conversion

### Required Permissions & Review
- App Review needed for production access
- Business verification required
- System User tokens (non-expiring) recommended over user tokens
- Monitor Transfer Rate and Latency metrics

### Rate Limits
- No explicit per-app limits documented for Lead Ads API (2026)
- Standard Graph API rate limits apply (200 calls/hour/user typical)
- Webhook retries if server fails to return 200 OK

---

## 3. Integration Architecture (Next.js + Supabase)

### Next.js API Routes Pattern
```
/pages/api/webhooks/
├── zalo.js          # Zalo OA webhook receiver
├── facebook.js      # FB Lead Ads webhook receiver
└── verify.js        # Common signature verification
```

**Implementation:**
- Verify signatures before processing
- Return 200 immediately (2-second rule for Zalo)
- Queue to background job (BullMQ, Inngest, or Supabase Edge Functions)
- Use `edge` runtime for low latency

### Token Storage (Supabase)
```sql
CREATE TABLE integration_tokens (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL, -- 'zalo' | 'facebook'
  account_id TEXT,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Use Supabase Vault for encryption at rest
- Refresh tokens via cron job (Supabase pg_cron or Vercel Cron)

### Queue/Retry Strategy
**Options:**
1. BullMQ (Redis-backed): Best for high volume, complex retry logic
2. Inngest: Declarative, serverless-friendly, built-in retries
3. Supabase pg_net + pg_cron: Native Postgres, simple setup

**Pattern:**
- Webhook receives event → insert to `webhook_events` table → trigger async job
- Exponential backoff: 1s, 5s, 30s, 5min, 1h
- Dead letter queue after 5 failures
- Alert on repeated failures

### Fallback Strategy
**Zalo unavailable:**
- Queue messages in Supabase `outbox` table
- Retry with exponential backoff
- Fallback to SMS (higher cost) for critical notifications (OTP, class reminders)
- Show "delayed delivery" status in CRM UI

**Facebook unavailable:**
- Manual CSV import option in CRM
- Poll Graph API periodically (not recommended, use webhooks)
- Alert admins to check Business Manager

---

## 4. Vietnamese Market Context

### Zalo OA for Parent Communication
**Highly Recommended:**
- 77M active users in Vietnam (85% market share)
- VUS case study: 4x lead quality increase (5% → 20%), engagement 15% → 41%
- Parents prefer Zalo over additional apps (zero-friction adoption)
- 79% users prefer Zalo for transactional notifications vs SMS/email
- 2.5x higher response rate than email

**Best Practices:**
- Zalo Mini Apps for enrollment forms, placement tests, games
- ZNS for class reminders, payment confirmations (200-300 VND/message)
- OA for 1-on-1 consultations, after-sales care
- Send between 8-10pm (peak parent engagement time)
- Permission-based auto-fill for forms (GDPR-aligned)

**Risks (2025-2026):**
- Dec 2025: Zalo mandated expanded data collection (ID, location) → backlash
- Jan 2026: VND 810M fine for violating consumer rights
- Users cannot opt-out without losing access (monopoly concerns)
- Quality Score system: spam reports reduce API quotas

### Alternative Channels
**Secondary Options:**
- Facebook Messenger: Lower penetration in education sector
- SMS: 3.5x more expensive than ZNS, lower engagement
- Email: Very low open rates among Vietnamese parents
- WhatsApp: Minimal adoption in Vietnam

**Recommendation:** Zalo OA + ZNS primary, SMS as fallback only.

---

## Unresolved Questions
1. Zalo ZNS template approval timeframe (days/weeks)?
2. Facebook Lead Ads webhook retry policy (max attempts, intervals)?
3. Zalo API quota increase process for scaling beyond 500/day?
4. Cost comparison: Zalo Premium (399k VND) + ZNS vs SMS-only at scale?
5. Supabase Realtime vs polling for webhook event processing latency?
