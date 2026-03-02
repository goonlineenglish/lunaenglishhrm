---
phase: 2
title: "Authentication System"
status: pending
effort: 8h
depends_on: [phase-01]
blocks: [phase-03, phase-04, phase-05]
---

# Phase 02: Authentication System

## Context Links

- [System Architecture - Auth Flow](../../docs/system-architecture.md)
- [Code Standards - Auth Helpers](../../docs/code-standards.md)
- [Decisions Doc](../../docs/quiet-coalescing-marshmallow.md)

## Overview

**Priority**: Critical
**Status**: Pending
**Description**: Implement JWT auth with httpOnly cookies, DB-backed sessions, login/logout flow, CSRF double-submit cookie, and middleware route protection. Single JWT, 8h expiry, no refresh token.

## Key Insights

- JWT signed with HS256 via `jose` library (Edge-compatible, unlike `jsonwebtoken`)
- Session table stores `jti` -- middleware checks `invalidated` flag on every request
- CSRF: double-submit cookie pattern. `csrf-token` cookie is NOT httpOnly so client JS can read it
- Login exempt from CSRF (token doesn't exist yet)
- Auth error: page routes redirect to /login, API routes return JSON 401/403
- Home `/` redirects to `/login`; middleware redirects authenticated users to `/dashboard` or `/admin`
- `user.isDeleted` check in middleware -- deleted users cannot authenticate

## Requirements

### Functional
- POST /api/auth/login -- email/password validation, JWT creation, session creation
- POST /api/auth/logout -- session invalidation, cookie clearing
- Middleware: JWT verify + session lookup + role check + CSRF validation
- Login page with form validation (email, password)
- Role-based redirect after login: ADMIN -> /admin, others -> /dashboard
- Soft-deleted users see "Tai khoan bi vo hieu hoa" message

### Non-Functional
- JWT expiry: 8 hours (28800 seconds)
- bcrypt cost factor: 12 rounds
- CSRF token: 32-byte hex string
- Cookie settings: httpOnly, secure (prod), sameSite=lax, path=/

## Architecture

### JWT Payload
```typescript
{
  sub: string;    // user.id (cuid)
  jti: string;    // session.id (cuid)
  email: string;
  role: Role;
  school: string | null;
  iat: number;
  exp: number;    // iat + 28800
}
```

### Cookie Setup
```
auth-token: httpOnly=true, secure=prod, sameSite=lax, path=/, maxAge=28800
csrf-token: httpOnly=false, secure=prod, sameSite=strict, path=/
```

### Middleware Decision Tree
```
Request -> Extract JWT from cookie
  -> Missing -> page route? redirect /login : JSON 401
  -> Verify signature (jose)
    -> Invalid -> redirect /login or 401
  -> Lookup session by jti
    -> Not found / invalidated / expired -> redirect or 401
  -> Check user.isDeleted
    -> true -> redirect or 401
  -> /admin/* + role != ADMIN -> 403
  -> POST/PUT/DELETE (not /api/auth/login) -> validate CSRF
    -> mismatch -> 403
  -> Pass through
```

## Related Code Files

### Create
- `app/(auth)/login/page.tsx` -- Login page (server component)
- `app/(auth)/login/login-form.tsx` -- Login form (client component)
- `app/api/auth/login/route.ts` -- Login API endpoint
- `app/api/auth/logout/route.ts` -- Logout API endpoint
- `app/api/health/route.ts` -- Health check endpoint
- `lib/auth/jwt-helpers.ts` -- JWT sign/verify using jose
- `lib/auth/session-helpers.ts` -- Session CRUD
- `lib/auth/auth-guard.ts` -- getAuthenticatedUser() helper
- `lib/services/auth-service.ts` -- Password hashing, login logic
- `lib/actions/auth-actions.ts` -- Server actions for login form
- `lib/types/auth.ts` -- JWT payload type, login input type
- `middleware.ts` -- Full route protection

### Modify
- `app/layout.tsx` -- Add Toaster for notifications

## Implementation Steps

### 1. Create auth types (`lib/types/auth.ts`)
```typescript
export type JwtPayload = {
  sub: string;
  jti: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';
  school: string | null;
  iat: number;
  exp: number;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };
```

### 2. Create JWT helpers (`lib/auth/jwt-helpers.ts`)
```typescript
import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '@/lib/types/auth';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const EXPIRY = '8h';

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
```

### 3. Create session helpers (`lib/auth/session-helpers.ts`)
- `createSession(userId: string)` -- creates session record, returns jti
- `invalidateSession(jti: string)` -- sets invalidated=true
- `validateSession(jti: string)` -- checks not invalidated, not expired

### 4. Create auth service (`lib/services/auth-service.ts`)
- `hashPassword(password: string)` -- bcrypt.hash with 12 rounds
- `comparePassword(password: string, hash: string)` -- bcrypt.compare
- `loginUser(email: string, password: string)` -- full login flow:
  1. Find user by email (where isDeleted=false)
  2. Compare password
  3. Create session
  4. Sign JWT
  5. Return token + redirect URL

### 5. Create login API route (`app/api/auth/login/route.ts`)
- Validate input with Zod
- Call authService.loginUser()
- Set httpOnly `auth-token` cookie
- Generate CSRF token, set `csrf-token` cookie (NOT httpOnly)
- Return JSON with redirect URL

### 6. Create logout API route (`app/api/auth/logout/route.ts`)
- Extract JWT from cookie
- Invalidate session by jti
- Clear both cookies (auth-token, csrf-token)
- Return redirect to /login

### 7. Create auth guard helper (`lib/auth/auth-guard.ts`)
```typescript
export async function getAuthenticatedUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}
```

### 8. Create middleware (`middleware.ts`)
- Match: `/dashboard/:path*`, `/admin/:path*`, `/api/:path*` (except login, health)
- Extract + verify JWT
- Validate session in DB
- Check user.isDeleted
- Role check for /admin/* routes
- CSRF validation on POST/PUT/DELETE
- Public paths: `/login`, `/api/auth/login`, `/api/health`

### 9. Create login page (`app/(auth)/login/page.tsx`)
- Server component, clean layout
- Centered card with Buttercup LMS branding
- Render `<LoginForm />` client component

### 10. Create login form (`app/(auth)/login/login-form.tsx`)
- Client component with `'use client'`
- Email + password inputs with Zod validation
- Submit via fetch to /api/auth/login
- Display error messages inline
- On success: `router.push(redirectTo)`
- Loading state on submit button

### 11. Create health endpoint (`app/api/health/route.ts`)
- Check DB connection with `prisma.$queryRaw`
- Return `{ status: 'ok', timestamp, database: 'connected' }`

### 12. Create auth server action (`lib/actions/auth-actions.ts`)
- `loginAction(formData)` -- alternative to API route for form submission
- `logoutAction()` -- server action for logout button

## Todo List

- [ ] Create auth types
- [ ] Create JWT helpers (sign/verify with jose)
- [ ] Create session helpers (create/invalidate/validate)
- [ ] Create auth service (hash/compare/login)
- [ ] Create login API route with cookie setting
- [ ] Create logout API route with cookie clearing
- [ ] Create CSRF token generation + validation
- [ ] Create auth guard helper
- [ ] Create middleware with full decision tree
- [ ] Create login page (server component)
- [ ] Create login form (client component)
- [ ] Create health endpoint
- [ ] Create auth server actions
- [ ] Verify login flow end-to-end
- [ ] Verify logout clears session + cookie
- [ ] Verify middleware blocks unauthenticated requests

## Success Criteria

- Login with valid credentials sets httpOnly cookie + creates session
- Login with wrong password shows error message
- Login with deleted user shows "Tai khoan bi vo hieu hoa"
- Logout invalidates session in DB + clears cookies
- Unauthenticated request to /dashboard redirects to /login
- Unauthenticated API request returns 401 JSON
- Non-admin accessing /admin/* gets 403
- POST without CSRF token returns 403
- Health endpoint returns 200 with DB status

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| jose vs jsonwebtoken confusion | jose is Edge-compatible, works in Next.js middleware |
| Middleware DB call on every request | Session lookup is indexed by jti, <5ms |
| CSRF cookie not readable on first page | CSRF set during login response, available for subsequent requests |
| Token expires mid-action | Client catches 401, redirects to login |

## Security Considerations

- JWT secret minimum 32 characters
- Password never logged or returned in responses
- httpOnly cookie prevents XSS token theft
- CSRF double-submit prevents cross-site forgery
- Session invalidation enables immediate logout
- `user.isDeleted` check prevents deleted user access
- Rate limiting not included Phase 1 (add later if needed)
