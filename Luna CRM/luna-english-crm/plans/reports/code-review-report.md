# Code Review Report - Luna English CRM

**Date:** 2026-02-22
**Reviewer:** code-reviewer agent
**Scope:** Critical infrastructure files (auth, middleware, actions, webhooks, cron)

---

## Scope

| File | LOC | Focus |
|------|-----|-------|
| `lib/supabase/server.ts` | 27 | Server Supabase client |
| `lib/supabase/client.ts` | 8 | Browser Supabase client |
| `lib/supabase/middleware.ts` | 52 | Session management middleware |
| `middleware.ts` | 19 | Next.js middleware entry |
| `lib/actions/auth-actions.ts` | 28 | Sign in / sign out |
| `lib/actions/lead-actions.ts` | 213 | Lead CRUD operations |
| `app/(dashboard)/layout.tsx` | 48 | Dashboard auth guard + layout |
| `app/api/webhooks/zalo/route.ts` | 75 | Zalo OA webhook |
| `app/api/webhooks/facebook/route.ts` | 98 | Facebook webhook |
| `app/api/cron/check-overdue-reminders/route.ts` | 69 | Overdue reminders cron |
| `app/api/cron/process-message-queue/route.ts` | 22 | Message queue cron |
| `app/api/cron/refresh-tokens/route.ts` | 79 | Token refresh cron |
| `lib/integrations/zalo-client.ts` | 110 | Zalo API client |
| `lib/integrations/facebook-client.ts` | 109 | Facebook API client |
| `lib/integrations/zalo-webhook-handler.ts` | 138 | Zalo event processing |
| `lib/integrations/facebook-webhook-handler.ts` | 96 | Facebook leadgen processing |
| `app/error.tsx` | 28 | Global error boundary |
| `app/(dashboard)/error.tsx` | 28 | Dashboard error boundary |

**Total LOC reviewed:** ~1,249

---

## Overall Assessment

The codebase is well-structured with clear separation of concerns. Files are concise (all under 200 LOC). Server actions correctly use `getUser()` instead of `getSession()`. Webhook signature verification uses `timingSafeEqual` which is the correct approach for timing-attack prevention. However, several security and robustness issues need attention before production deployment.

---

## Critical Issues

### C1. Access Token Leaked in URL Query Parameter (Facebook Graph API)

**File:** `lib/integrations/facebook-client.ts:68`

```typescript
const res = await fetch(
  `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`,
  { method: "GET" }
);
```

**Impact:** Access tokens in query strings are logged by proxies, CDNs, server access logs, and browser history. This is an OWASP sensitive data exposure vulnerability.

**Recommendation:** Pass the token in the `Authorization` header instead:
```typescript
headers: { Authorization: `Bearer ${accessToken}` }
```

### C2. No Input Sanitization on Webhook Payloads Before DB Insert

**File:** `lib/integrations/zalo-webhook-handler.ts:87-88`

```typescript
notes: `Tin nh???n t??? Zalo: ${event.message?.text ?? ""}`,
```

**File:** `lib/integrations/facebook-webhook-handler.ts:86-93`

```typescript
parent_name: mapped.parent_name ?? "Facebook Lead",
parent_phone: mapped.parent_phone ?? "",
```

**Impact:** External webhook payloads are inserted directly into the database. While Supabase parameterizes queries (preventing SQL injection), the raw data is stored and later rendered in the UI. If the UI renders these fields without escaping, it enables stored XSS. Additionally, arbitrarily long strings from external sources could cause DB storage issues.

**Recommendation:** Trim and length-limit all webhook-sourced fields before DB insert. Validate phone numbers follow expected format.

### C3. Missing Role-Based Authorization in Server Actions

**File:** `lib/actions/lead-actions.ts`

All actions (create, update, delete, assign) only check `if (!user)` (authentication) but never check the user's role. The CLAUDE.md states RLS policies enforce: admin=full, advisor=scoped, marketing=read-only. However, if RLS is misconfigured or disabled, any authenticated user could perform any operation.

**Impact:** Authorization bypass if RLS policies are not correctly applied.

**Recommendation:** Add explicit role checks in server actions as defense-in-depth, especially for `deleteLead` and `assignLead` which are admin/advisor-only operations. Do not rely solely on RLS.

---

## High Priority

### H1. Non-Deterministic Async Processing in Zalo Webhook

**File:** `app/api/webhooks/zalo/route.ts:53-69`

```typescript
processEvent(event)
  .then(async () => { ... })
  .catch(async (err: Error) => { ... });
```

The response is returned immediately at line 74 while `processEvent` runs as a detached promise. In serverless environments (Vercel Edge/Serverless), the function context may be terminated before this async work completes. This means webhook events could be silently dropped.

**Recommendation:** Either await the processing before returning 200, or use a proper background job queue (Vercel doesn't guarantee fire-and-forget promises execute). Alternatively, use Vercel's `waitUntil` API.

### H2. Service Role Key Used Without Guardrails

**Files:**
- `app/api/webhooks/zalo/route.ts:8-11`
- `app/api/webhooks/facebook/route.ts:10-13`
- `app/api/cron/check-overdue-reminders/route.ts:14`
- `app/api/cron/refresh-tokens/route.ts:7-10`
- `lib/integrations/zalo-webhook-handler.ts:4-9`
- `lib/integrations/facebook-webhook-handler.ts:4-9`

`SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. Multiple files create admin clients independently. If this key leaks, all data is exposed.

**Recommendation:**
1. Centralize admin client creation into a single utility.
2. Add runtime check that service role key is only used in server-side contexts.
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_`.

### H3. `leadId` Parameter Not Validated as UUID

**File:** `lib/actions/lead-actions.ts:71, 105, 165, 186`

```typescript
export async function updateLead(leadId: string, input: UpdateLeadInput)
```

The `leadId` is accepted as a free-form string and passed directly to `.eq("id", leadId)`. While Supabase will reject invalid UUIDs at the DB level, the error message may leak schema information.

**Recommendation:** Validate `leadId` as a UUID format before querying.

### H4. Error Messages May Leak Internal Details

**File:** `lib/actions/lead-actions.ts:64, 98, 148, 178`

```typescript
return { error: error.message };
```

Supabase error messages can contain table names, column names, constraint names, and SQL details. These are returned directly to the client.

**Recommendation:** Return generic error messages to the client. Log the detailed error server-side.

### H5. `lead-actions.ts` Exceeds 200 LOC Guideline

**File:** `lib/actions/lead-actions.ts` (213 lines)

Per project standards, code files should be under 200 lines. This file has 5 exported functions that could be split.

**Recommendation:** Split into `lead-mutation-actions.ts` (create, update, delete) and `lead-assignment-actions.ts` (assign, updateStage).

---

## Medium Priority

### M1. Inconsistent Auth Header Casing in Cron Routes

**File:** `app/api/cron/check-overdue-reminders/route.ts:5`
```typescript
const authHeader = request.headers.get("authorization");
```

**File:** `app/api/cron/process-message-queue/route.ts:9`
```typescript
const authHeader = request.headers.get("Authorization");
```

HTTP headers are case-insensitive per spec, and `Headers.get()` is case-insensitive in practice. However, the inconsistency suggests copy-paste without standardization.

**Recommendation:** Use a consistent casing convention across all cron routes.

### M2. No Rate Limiting on Webhook Endpoints

**Files:**
- `app/api/webhooks/zalo/route.ts`
- `app/api/webhooks/facebook/route.ts`

Webhook endpoints have no rate limiting. An attacker who discovers the webhook URL could flood it with requests, causing excessive DB writes and potential cost escalation on Supabase.

**Recommendation:** Add rate limiting via Vercel's built-in rate limiting, or implement a simple in-memory/redis counter.

### M3. Duplicate `getAdminClient()` Function Across 4 Files

**Files:**
- `app/api/webhooks/zalo/route.ts:6-11`
- `app/api/webhooks/facebook/route.ts:9-14`
- `lib/integrations/zalo-webhook-handler.ts:4-9`
- `lib/integrations/facebook-webhook-handler.ts:4-9`

Same function duplicated 4 times. Violates DRY principle.

**Recommendation:** Create `lib/supabase/admin.ts` with a single shared `getAdminClient()`.

### M4. Middleware Does Not Exclude API Routes

**File:** `middleware.ts:9-18`

```typescript
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
]
```

The middleware matcher applies to all routes except static assets. This means API routes (`/api/webhooks/*`, `/api/cron/*`) go through the auth middleware, which calls `supabase.auth.getUser()`. These API routes handle their own auth (signature verification, cron secret). The middleware adds unnecessary overhead and could interfere with webhook requests that have no cookies.

**Recommendation:** Exclude `/api/` routes from the middleware matcher:
```typescript
"/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
```

### M5. `signIn` Does Not Validate/Sanitize Input

**File:** `lib/actions/auth-actions.ts:7-8`

```typescript
const email = formData.get("email") as string;
const password = formData.get("password") as string;
```

No validation that email/password are non-null strings. `formData.get()` can return `null` if the field is missing, but it's cast to `string`. This won't cause a security issue (Supabase will reject null credentials), but it results in unclear error messages.

**Recommendation:** Add basic null checks and email format validation.

### M6. Facebook Webhook GET Verification Token Comparison Is Not Timing-Safe

**File:** `lib/integrations/facebook-client.ts:19`

```typescript
if (mode === "subscribe" && token === verifyToken && challenge) {
```

The verify token comparison uses `===` which is susceptible to timing attacks. While the verify token is lower-value than an API key, it's still a secret.

**Recommendation:** Use `crypto.timingSafeEqual` for the verify token comparison, consistent with the signature verification approach.

---

## Low Priority

### L1. `error.tsx` Displays Raw Error Messages

**Files:** `app/error.tsx:18`, `app/(dashboard)/error.tsx:18`

```typescript
{error.message || "Co loi khong mong muon. Vui long thu lai."}
```

In production, error.message could contain stack traces or internal details. Next.js does sanitize errors in production builds, but the fallback message approach is fragile.

**Recommendation:** In production, always show the generic message. Only show `error.message` in development.

### L2. Non-null Assertion Operators on Environment Variables

**Files:** Multiple files use `process.env.NEXT_PUBLIC_SUPABASE_URL!`

The `!` operator suppresses TypeScript null checks. If env vars are missing, runtime errors will be cryptic (e.g., "fetch failed" instead of "missing SUPABASE_URL").

**Recommendation:** Add a startup validation check (e.g., in `next.config.ts` or a shared env helper) that fails fast with clear error messages if required env vars are missing.

### L3. Zalo Webhook Creates Leads With Empty Phone

**File:** `lib/integrations/zalo-webhook-handler.ts:84`

```typescript
parent_phone: "",
```

Leads created from Zalo messages have an empty phone number. This could cause issues with duplicate detection logic in `facebook-webhook-handler.ts:65-71` which checks duplicates by phone. It also means the phone validation in `lead-actions.ts` (10 digits required) is not enforced for webhook-created leads.

**Recommendation:** Either mark the phone as null instead of empty string, or add a flag indicating the phone is unknown.

### L4. `updateLead` Mutates Input Parameter

**File:** `lib/actions/lead-actions.ts:87`

```typescript
input.parent_phone = phone;
```

The function mutates its input parameter directly. While this works, it's a subtle side effect.

**Recommendation:** Create a new variable instead of mutating the input.

---

## Edge Cases Found by Scout

1. **Webhook → DB race condition:** If Zalo sends duplicate webhook events rapidly, `handleUserSendText` could create duplicate leads because the follower lookup and lead creation are not atomic.

2. **Middleware + API route interference:** Webhook POST requests from Zalo/Facebook have no browser cookies. The middleware calls `getUser()` which will return null, triggering a redirect to `/login`. This could cause webhook failures.

3. **Facebook webhook response timing:** The response variable is created at line 43 but processing happens between lines 46-95. If processing throws before the loop, the catch block swallows the error and returns 200 -- correct behavior per Facebook requirements but could mask configuration issues.

4. **Overdue reminders cron - no pagination:** If thousands of reminders are overdue, the query at line 17-21 fetches all at once. The notification insert at line 56-58 also inserts all at once. This could time out on serverless.

5. **Token refresh race condition:** If the refresh-tokens cron runs concurrently (e.g., overlapping Vercel cron invocations), two instances could try to refresh the same token simultaneously, potentially invalidating one token.

---

## Positive Observations

1. **Correct use of `getUser()` over `getSession()`** in all server-side code -- follows Supabase security best practice.
2. **`timingSafeEqual` for signature verification** in both Zalo and Facebook clients -- prevents timing attacks.
3. **Webhook signature verification before processing** -- both webhooks validate signatures before doing any work.
4. **Proper error boundaries** at both global and dashboard levels with Vietnamese localization.
5. **Clean file organization** -- files are focused and concise, mostly under 200 LOC.
6. **Consistent Vietnamese UI labels** throughout error messages and user-facing strings.
7. **Proper cookie handling** in Supabase SSR setup with try/catch for Server Component context.
8. **Cron routes properly gated** with bearer token authentication.
9. **Facebook duplicate detection** by phone number prevents creating duplicate leads.

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Move Facebook access token from URL query to `Authorization` header (C1)
2. **[CRITICAL]** Add input sanitization/length limits on webhook payloads (C2)
3. **[CRITICAL]** Add role-based authorization checks in server actions (C3)
4. **[HIGH]** Fix fire-and-forget promise in Zalo webhook -- use `waitUntil` or await (H1)
5. **[HIGH]** Exclude `/api/` from middleware matcher to prevent webhook interference (M4)
6. **[HIGH]** Centralize `getAdminClient()` to single file (M3)
7. **[HIGH]** Validate `leadId` as UUID format (H3)
8. **[HIGH]** Return generic error messages, log details server-side (H4)
9. **[MEDIUM]** Add rate limiting to webhook endpoints (M2)
10. **[MEDIUM]** Add timing-safe comparison for Facebook verify token (M6)
11. **[MEDIUM]** Validate auth action inputs for null/format (M5)
12. **[LOW]** Split `lead-actions.ts` into smaller files (H5)
13. **[LOW]** Add startup env var validation (L2)
14. **[LOW]** Fix Zalo empty phone number handling (L3)

---

## Metrics

| Metric | Value |
|--------|-------|
| Files Reviewed | 18 |
| Total LOC | ~1,249 |
| Critical Issues | 3 |
| High Issues | 5 |
| Medium Issues | 6 |
| Low Issues | 4 |
| Edge Cases Found | 5 |
| Type Coverage | Good (TypeScript strict mode) |
| Test Coverage | Not measured (no test files found) |
| Linting Issues | 0 (ESLint passed in latest commit) |

---

## Unresolved Questions

1. Are RLS policies correctly configured and tested for all tables? (Cannot verify without DB access)
2. Is the `SUPABASE_SERVICE_ROLE_KEY` env var properly secured in Vercel deployment? (Not yet deployed)
3. Does the Vercel serverless runtime guarantee `processEvent` promise completion in the Zalo webhook handler?
4. What is the expected volume of webhook events? This affects whether rate limiting and pagination are critical vs. nice-to-have.
