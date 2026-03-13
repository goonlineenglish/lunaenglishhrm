import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── Route groups ─────────────────────────────────────────────────────────────

/** Routes that require authentication */
const PROTECTED_PATHS = ['/dashboard', '/branches', '/employees', '/attendance', '/payroll', '/kpi', '/profile', '/my-attendance', '/my-payslips', '/my-profile', '/office-attendance', '/class-schedules', '/evaluation-templates', '/evaluation-periods']

/** Routes accessible only when NOT authenticated */
const AUTH_ONLY_PATHS = ['/login', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Root redirect: / → /login or /dashboard
  if (pathname === '/') {
    const { user } = await updateSession(request)
    const destination = user ? '/dashboard' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Refresh session and get user
  const { response, user } = await updateSession(request)

  // Redirect unauthenticated users trying to access protected routes
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))
  if (isAuthOnly && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
