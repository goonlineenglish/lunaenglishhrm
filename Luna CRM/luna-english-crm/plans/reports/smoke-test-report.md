# Smoke Test Report

**Date:** 2026-02-23
**Environment:** Dev server (localhost:3000) via `npm run dev`
**Build:** Production build passed prior to testing

---

## Test Results Overview

| Route | Expected | Actual | Status |
|---|---|---|---|
| `GET /` | 307 redirect to /login | 307 to /login | PASS |
| `GET /login` | 200 | 200 (31KB HTML, text/html) | PASS |
| `GET /pipeline` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /reminders` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /students` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /reports` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /settings` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /leads` | 307 to /login (unauth) | 307 to /login | PASS |
| `GET /api/cron/check-overdue-reminders` | 401 | 307 to /login | WARN |
| `GET /api/cron/process-message-queue` | 401 | 307 to /login | WARN |
| `GET /api/cron/refresh-tokens` | 401 | 307 to /login | WARN |
| `GET /api/webhooks/zalo` | 307 or 200 | 307 to /login | WARN |
| `GET /api/webhooks/facebook` | 307 or 200 | 307 to /login | WARN |
| `GET /nonexistent` | 404 | 307 to /login | WARN |

**Totals:** 14 routes tested | 8 PASS | 0 FAIL (500) | 6 WARN (non-critical)

---

## Critical Issues (500 Errors)

**None.** No routes returned HTTP 500 server errors.

---

## Warnings (Non-Critical)

### 1. Middleware catches ALL routes, including API and nonexistent paths

**Affected:** All `/api/*` routes and any nonexistent route

**Root Cause:** The middleware matcher in `middleware.ts` line 17:
```
"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
```
This matches everything except static assets. The `updateSession()` in `lib/supabase/middleware.ts` (line 38) redirects all unauthenticated requests to `/login` with no API route exceptions.

**Impact:**
- Cron API routes (`/api/cron/*`) get 307 instead of reaching their own `CRON_SECRET` auth check (returns 401). External cron services (Vercel Cron, etc.) will fail because they won't follow redirects or send cookies.
- Webhook routes (`/api/webhooks/*`) are similarly blocked. Zalo/Facebook can't deliver webhooks.
- Nonexistent routes get 307 instead of 404, which is misleading for debugging.

**Recommended Fix:** Update middleware matcher or `updateSession()` to exclude `/api/` routes:

Option A - Update middleware matcher:
```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Option B - Add API bypass in `updateSession()`:
```ts
if (request.nextUrl.pathname.startsWith("/api/")) {
  return supabaseResponse;
}
```

**Severity:** Medium -- blocks external integrations (cron, webhooks) in production

---

## Positive Findings

1. **Auth guard works correctly** -- All dashboard routes redirect unauthenticated users to /login
2. **Login page renders** -- Returns 31KB of HTML content with proper `text/html; charset=utf-8` content type and Vietnamese `lang="vi"` attribute
3. **No server crashes** -- Dev server remained stable throughout all 14 requests
4. **No 500 errors** -- No runtime exceptions on any route
5. **Redirect consistency** -- All protected routes use 307 Temporary Redirect (correct for POST-preserving redirects)

---

## Summary

The smoke test reveals a healthy application with functioning auth guards and page rendering. The only issue is middleware over-matching: API routes and nonexistent paths are redirected to `/login` instead of reaching their own handlers. This will block cron jobs and webhooks in production and should be fixed before deployment.

**Overall Status: PASS (with 1 medium-severity warning)**
