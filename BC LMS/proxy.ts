// proxy.ts — Full auth guard middleware (Next.js 16: proxy.ts replaces middleware.ts)
// Handles: JWT verify → session validation → user.isDeleted check → role check → CSRF

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Paths that never require authentication */
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/health',
  '/favicon.ico',
];

/** Prefixes always bypassed (Next.js internals + static assets) */
const BYPASS_PREFIXES = ['/_next/', '/public/'];

/** Mutating methods that require CSRF validation */
const CSRF_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/** CSRF is exempt on these paths (no token exists yet at login) */
const CSRF_EXEMPT_PATHS = ['/api/auth/login', '/api/health'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function isPageRoute(pathname: string): boolean {
  // Page routes: anything not starting with /api/
  return !pathname.startsWith('/api/');
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

// ---------------------------------------------------------------------------
// Session validation (DB call inside middleware via fetch to internal API)
// NOTE: Prisma cannot run in Edge runtime. We call the internal health/session
// endpoint, or we use Node.js runtime (configured below with runtime export).
// ---------------------------------------------------------------------------

/**
 * Validate session via direct Prisma call.
 * This proxy runs in Node.js runtime (see `export const runtime` below).
 */
async function isSessionValid(jti: string): Promise<boolean> {
  // Dynamic import so this only loads in Node.js runtime
  const { validateSession } = await import('@/lib/auth/session-helpers');
  return validateSession(jti);
}

async function isUserDeleted(userId: string): Promise<boolean> {
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDeleted: true },
  });
  return user?.isDeleted ?? true;
}

// ---------------------------------------------------------------------------
// Main proxy function
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Always pass through public paths and Next.js internals
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2. Extract JWT from httpOnly cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (isPageRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Verify JWT signature
  let payload: {
    sub: string;
    jti: string;
    email: string;
    role: string;
    school: string | null;
    iat: number;
    exp: number;
  };

  try {
    const { payload: verified } = await jwtVerify(token, getSecret());
    payload = verified as typeof payload;
  } catch {
    if (isPageRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 4. Validate session in DB (checks invalidated + expiry)
  const sessionOk = await isSessionValid(payload.jti);
  if (!sessionOk) {
    if (isPageRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  // 5. Check user.isDeleted
  const deleted = await isUserDeleted(payload.sub);
  if (deleted) {
    if (isPageRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Tài khoản bị vô hiệu hóa' }, { status: 401 });
  }

  // 6. Role check for /admin/* routes
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    if (isPageRoute(pathname)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 7. CSRF validation on mutating requests
  if (
    CSRF_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
  ) {
    const headerToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('csrf-token')?.value;

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
    }
  }

  // 8. Attach user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-email', payload.email);
  if (payload.school) requestHeaders.set('x-user-school', payload.school);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// proxy.ts always runs in Node.js runtime (Next.js 16 default for proxy files)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
