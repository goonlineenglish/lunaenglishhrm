# Phase 07: Integrations -- Zalo OA + Facebook Lead Ads

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 02](./phase-02-auth-and-layout-shell.md) (auth, layout), [Phase 03](./phase-03-lead-pipeline-kanban.md) (lead creation)
- Research: [Zalo & Facebook Integration](./research/researcher-02-zalo-facebook-integration.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P2
- **Status:** Pending
- **Effort:** 5h

Build Zalo OA and Facebook Lead Ads webhook integrations: receive incoming leads/messages, send follow-up messages via Zalo, Facebook lead auto-import, integration settings page (admin), token management, webhook event logging, retry queue for failed messages.

## Key Insights

- **Zalo OA**: Premium tier (399k VND/month) recommended for full API access
  - 2-second webhook timeout → must return 200 immediately, process async
  - Signature verification: HMAC-SHA256 with OA Secret Key
  - Cannot message non-followers without ZNS (200-300 VND/msg)
  - OAuth refresh tokens for automated renewal
- **Facebook Lead Ads**: System User tokens (non-expiring) recommended
  - Webhook delivers `leadgen_id` only → need Graph API call to get actual data
  - App Review + Business Verification required for production
  - GET endpoint for webhook verification (hub.verify_token)
- **Architecture**: webhooks → webhook_events table → async processing → lead creation
- **Fallback**: manual CSV import if webhooks fail; in-app notifications if Zalo fails
- Zalo dominates VN education comms (85% market share, 77M users)

## Requirements

### Functional
- **Zalo OA Webhook Receiver**: API route, signature verification, async processing
- **Zalo OA Message Sender**: send follow-up messages to OA followers
- **ZNS Templates**: send structured notifications via phone number (paid)
- **Facebook Webhook Receiver**: verify endpoint (GET) + lead event handler (POST)
- **Facebook Lead Retrieval**: Graph API call to fetch lead data from leadgen_id
- **Integration Settings Page** (admin only):
  - Connect/disconnect Zalo OA (OAuth flow)
  - Connect/disconnect Facebook (System User token input)
  - View webhook status (last received, error count)
  - Test connection button
- **Token Storage**: encrypted in Supabase Vault
- **Token Refresh**: cron job for Zalo OAuth refresh
- **Webhook Event Logging**: all incoming webhooks logged with payload, status, processing result
- **Retry Queue**: failed message sends retried with exponential backoff
- **Lead Auto-Creation**: incoming Zalo message or Facebook form → auto-create lead (if new phone/email)

### Non-functional
- Webhook endpoint response < 500ms (return 200, process async)
- Token encryption at rest (Supabase Vault)
- Retry: max 5 attempts, backoff 1s → 5s → 30s → 5min → 1h
- Webhook events retained 30 days

## Architecture

```
Zalo OA Webhook Flow:
  Zalo Server → POST /api/webhooks/zalo
  → Verify X-Zalo-Signature (HMAC-SHA256)
  → Return 200 immediately
  → Insert into webhook_events (status: 'received')
  → Process async:
    - user_send_text → find/create lead by Zalo user_id → log activity
    - user_interested → create new follower record
  → Update webhook_events (status: 'processed' | 'error')

Facebook Lead Ads Webhook Flow:
  Meta Server → GET /api/webhooks/facebook?hub.verify_token=xxx
  → Return hub.challenge (verification)

  Meta Server → POST /api/webhooks/facebook
  → Validate payload
  → Return 200 immediately
  → Insert into webhook_events
  → Process async:
    - Extract leadgen_id
    - GET Graph API /{leadgen_id} with access token
    - Map field_data to lead schema
    - Create lead (source: 'facebook')
  → Update webhook_events

Zalo Message Send Flow:
  CRM action (advisor clicks "Gui tin nhan")
  → Server action: sendZaloMessage(oaFollowerId, message)
  → Fetch access token from integration_tokens
  → POST Zalo OA API /message
  → Log in lead_activities
  → On failure: insert into message_queue for retry

Token Refresh (Cron):
  Every 6 hours → POST /api/cron/refresh-tokens
  → Query integration_tokens WHERE expires_at < NOW() + 1 day
  → Call Zalo OAuth refresh endpoint
  → Update tokens in DB
```

### Database Additions

```sql
-- webhook_events (created in Phase 01 migration 008)
-- Already has: id, provider, event_type, payload, status, error_message, created_at

-- message_queue (retry queue)
CREATE TABLE public.message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'zalo' | 'zns'
  recipient_id TEXT NOT NULL, -- Zalo user_id or phone
  message_type TEXT NOT NULL, -- 'text' | 'zns_template'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  lead_id UUID REFERENCES public.leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_message_queue_status ON message_queue(status, next_retry_at);
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/api/webhooks/zalo/route.ts` | Zalo OA webhook: verify signature, log event, process async |
| `app/api/webhooks/facebook/route.ts` | Facebook webhook: verify GET + process POST |
| `app/(dashboard)/settings/page.tsx` | Settings page (admin only): integration config |
| `app/(dashboard)/settings/loading.tsx` | Skeleton loader |
| `components/settings/integration-settings.tsx` | Client component: Zalo + Facebook connection panels |
| `components/settings/zalo-connection-card.tsx` | Zalo OA connection: status, OAuth button, test button |
| `components/settings/facebook-connection-card.tsx` | Facebook connection: token input, test button |
| `components/settings/webhook-status-card.tsx` | Webhook health: last received, error count, log link |
| `components/settings/webhook-events-table.tsx` | Table of recent webhook events (expandable payload) |
| `lib/integrations/zalo-client.ts` | Zalo OA API client: sendMessage, refreshToken, verifySignature |
| `lib/integrations/zalo-webhook-handler.ts` | Process Zalo webhook events (user_send_text, user_interested) |
| `lib/integrations/facebook-client.ts` | Facebook Graph API client: fetchLead, verifyWebhook |
| `lib/integrations/facebook-webhook-handler.ts` | Process Facebook webhook events (leadgen) |
| `lib/integrations/message-queue-processor.ts` | Process retry queue: send pending messages |
| `lib/actions/integration-actions.ts` | Server actions: saveTokens, testConnection, getWebhookEvents |
| `lib/actions/message-actions.ts` | Server actions: sendZaloMessage, queueMessage |
| `app/api/cron/refresh-tokens/route.ts` | Cron: refresh expiring Zalo tokens |
| `app/api/cron/process-message-queue/route.ts` | Cron: process retry queue |
| `supabase/migrations/014_create-message-queue-table.sql` | Message queue table |
| `supabase/migrations/015_create-zalo-followers-table.sql` | Zalo follower mapping (zalo_id ↔ lead_id) |

### Files to Modify

| File | Change |
|------|--------|
| `vercel.json` | Add token refresh + message queue cron jobs |
| `lib/constants/navigation.ts` | Add settings nav item (admin only) |
| `components/pipeline/lead-detail-activities.tsx` | Show Zalo message activities with icon |
| `components/pipeline/lead-detail-info.tsx` | Show Zalo follower status, "Gui tin nhan" button |

## Implementation Steps

1. **Create message queue migration** `supabase/migrations/014_create-message-queue-table.sql`
   - Table as shown in Architecture
   - Index on status + next_retry_at for efficient queue processing

2. **Create Zalo followers table** `supabase/migrations/015_create-zalo-followers-table.sql`
   ```sql
   CREATE TABLE public.zalo_followers (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     zalo_user_id TEXT UNIQUE NOT NULL,
     lead_id UUID REFERENCES public.leads(id),
     display_name TEXT,
     avatar_url TEXT,
     followed_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Create Zalo API client** `lib/integrations/zalo-client.ts`
   - `verifySignature(body, signature, secret)`: HMAC-SHA256 verification
   - `sendTextMessage(accessToken, userId, message)`: POST to Zalo OA API
   - `sendZNS(accessToken, phone, templateId, data)`: POST ZNS API
   - `refreshAccessToken(refreshToken)`: OAuth refresh flow
   - `getFollowerProfile(accessToken, userId)`: get follower info
   - All methods return typed responses with error handling

4. **Create Zalo webhook handler** `lib/integrations/zalo-webhook-handler.ts`
   - `handleUserSendText(event)`: find lead by zalo_user_id → log activity → auto-reply if configured
   - `handleUserInterested(event)`: create zalo_followers record → try match to existing lead by name
   - `processEvent(event)`: router to handler by event type

5. **Create Zalo webhook route** `app/api/webhooks/zalo/route.ts`
   - POST handler:
     1. Read raw body for signature verification
     2. Verify `X-Zalo-Signature` header
     3. Return 200 immediately
     4. Insert into webhook_events (status: 'received')
     5. Call processEvent() (fire-and-forget with `waitUntil` if available, or Supabase Edge Function)
   - Error: return 200 anyway (Zalo retries on non-200)

6. **Create Facebook API client** `lib/integrations/facebook-client.ts`
   - `verifyWebhook(params)`: check hub.verify_token, return hub.challenge
   - `fetchLeadData(accessToken, leadgenId)`: GET Graph API lead data
   - `mapLeadFieldsToSchema(fieldData)`: map Facebook fields to CRM lead fields
   - Handle token expiry gracefully

7. **Create Facebook webhook handler** `lib/integrations/facebook-webhook-handler.ts`
   - `handleLeadgen(entry)`: extract leadgen_id → fetch from Graph API → create lead
   - Map form fields: name → parent_name, phone → parent_phone, email → parent_email
   - Set source = 'facebook', stage = 'moi_tiep_nhan'

8. **Create Facebook webhook route** `app/api/webhooks/facebook/route.ts`
   - GET handler: webhook verification (hub.mode, hub.verify_token, hub.challenge)
   - POST handler:
     1. Validate payload structure
     2. Return 200 immediately
     3. Log to webhook_events
     4. Process each entry async

9. **Create integration server actions** `lib/actions/integration-actions.ts`
   - `saveZaloTokens(accessToken, refreshToken, expiresAt)`: encrypt + store
   - `saveFacebookToken(token)`: encrypt + store
   - `testZaloConnection()`: call Zalo API, return status
   - `testFacebookConnection()`: call Graph API, return status
   - `getWebhookEvents(provider, limit)`: fetch recent events
   - `disconnectIntegration(provider)`: remove tokens

10. **Create message server actions** `lib/actions/message-actions.ts`
    - `sendZaloMessage(leadId, message)`: send via OA API or queue if fails
    - `queueMessage(provider, recipientId, payload, leadId)`: insert into message_queue
    - `retryFailedMessages()`: process queue, exponential backoff

11. **Create settings page** `app/(dashboard)/settings/page.tsx`
    - Server component: verify admin role, fetch connection statuses
    - Render `<IntegrationSettings />`

12. **Create IntegrationSettings** `components/settings/integration-settings.tsx`
    - `'use client'` component
    - Two cards: Zalo OA, Facebook Lead Ads
    - Webhook events table below

13. **Create ZaloConnectionCard** `components/settings/zalo-connection-card.tsx`
    - Status indicator (connected/disconnected)
    - Connected: OA name, token expiry, disconnect button
    - Disconnected: "Ket noi Zalo OA" button → OAuth redirect
    - Test connection button

14. **Create FacebookConnectionCard** `components/settings/facebook-connection-card.tsx`
    - Status indicator
    - Connected: page name, disconnect button
    - Disconnected: System User token input + save button
    - Test connection button
    - Note about App Review requirement

15. **Create WebhookStatusCard** `components/settings/webhook-status-card.tsx`
    - Per provider: last event time, events today count, error count
    - Link to webhook events table

16. **Create WebhookEventsTable** `components/settings/webhook-events-table.tsx`
    - DataTable: timestamp, provider, event type, status (badge), error message
    - Expandable row: full payload (JSON viewer)
    - Filter by provider, status

17. **Create message queue processor** `lib/integrations/message-queue-processor.ts`
    - `processQueue()`: fetch pending messages WHERE next_retry_at <= NOW()
    - For each: attempt send → update status (sent | failed)
    - On failure: increment attempts, calculate next_retry_at (exponential backoff)
    - On max_attempts reached: status = 'failed', create notification for admin

18. **Create token refresh cron** `app/api/cron/refresh-tokens/route.ts`
    - Verify CRON_SECRET
    - Query tokens expiring within 24 hours
    - Call provider refresh endpoints
    - Update tokens in DB
    - Log results

19. **Create message queue cron** `app/api/cron/process-message-queue/route.ts`
    - Verify CRON_SECRET
    - Call processQueue()
    - Return count processed

20. **Update vercel.json** with new cron jobs
    ```json
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/process-message-queue",
      "schedule": "*/5 * * * *"
    }
    ```

21. **Update lead detail** for Zalo features
    - Show Zalo follower status (if matched)
    - "Gui tin nhan qua Zalo" button (if follower)
    - Zalo message activities in timeline with Zalo icon

## Todo List

- [ ] Create message queue table migration
- [ ] Create Zalo followers table migration
- [ ] Create Zalo API client (send, verify, refresh)
- [ ] Create Zalo webhook handler
- [ ] Create Zalo webhook API route
- [ ] Create Facebook API client (fetch lead, verify)
- [ ] Create Facebook webhook handler
- [ ] Create Facebook webhook API route
- [ ] Create integration server actions
- [ ] Create message server actions
- [ ] Create settings page (admin only)
- [ ] Create IntegrationSettings component
- [ ] Create ZaloConnectionCard
- [ ] Create FacebookConnectionCard
- [ ] Create WebhookStatusCard
- [ ] Create WebhookEventsTable
- [ ] Create message queue processor
- [ ] Create token refresh cron
- [ ] Create message queue cron
- [ ] Update vercel.json with cron jobs
- [ ] Update lead detail for Zalo messaging
- [ ] Test Zalo webhook signature verification
- [ ] Test Facebook webhook verification flow
- [ ] Test lead auto-creation from Facebook form
- [ ] Test Zalo message send + retry on failure
- [ ] Test token refresh cron
- [ ] Test settings connect/disconnect flow

## Success Criteria

- Zalo OA webhook receives events, verifies signature, processes async < 2s
- Facebook webhook verification passes, lead forms auto-create CRM leads
- Zalo message send works for OA followers
- Failed messages queued and retried with exponential backoff
- Settings page shows connection status, allows connect/disconnect
- Token refresh cron keeps tokens valid without manual intervention
- Webhook events table shows full event history with expandable payloads
- Lead detail shows Zalo follower status and message button

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zalo OA not yet verified | Cannot send messages | Start OA verification early; use in-app only fallback |
| Facebook App Review delays | No auto-import | Manual CSV import as fallback |
| Token storage compromise | API access leak | Use Supabase Vault encryption; rotate tokens regularly |
| Webhook endpoint downtime | Lost events | Zalo/Facebook retry; webhook_events log for reconciliation |
| ZNS template rejected | Cannot send to non-followers | Prepare multiple template variations; manual phone call fallback |
| Vercel free tier: 2 cron limit | Can't run all 4 crons | Combine crons into single endpoint with branching logic |

## Security Considerations

- Webhook signatures verified on EVERY request (HMAC-SHA256 for Zalo)
- Tokens encrypted at rest via Supabase Vault
- Webhook endpoints don't require auth (but verify signatures)
- Integration settings page admin-only
- Token values never returned to client (only "connected" status)
- Webhook payloads may contain PII → webhook_events table RLS restricted to admin
- CRON_SECRET for all cron endpoints
- Facebook System User token stored server-side only

## Next Steps

- Future: Zalo Mini App for enrollment forms
- Future: WhatsApp Business API as secondary channel
- Future: SMS fallback via eSMS.vn for critical notifications
- Monitor Zalo API quota usage, upgrade OA plan if needed
