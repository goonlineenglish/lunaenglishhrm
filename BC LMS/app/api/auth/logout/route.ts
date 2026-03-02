// Logout API route — invalidates session and clears cookies
// POST /api/auth/logout

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt-helpers';
import { invalidateSession } from '@/lib/auth/session-helpers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      const payload = await verifyJwt(token);
      if (payload?.jti) {
        // Invalidate the DB session so JWT can't be replayed
        await invalidateSession(payload.jti);
      }
    }

    const response = NextResponse.json(
      { success: true, redirectTo: '/login' },
      { status: 200 }
    );

    // Clear both cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    response.cookies.set('csrf-token', '', {
      httpOnly: false,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, clear cookies and redirect
    const response = NextResponse.json(
      { success: true, redirectTo: '/login' },
      { status: 200 }
    );
    response.cookies.set('auth-token', '', { httpOnly: true, path: '/', maxAge: 0 });
    response.cookies.set('csrf-token', '', { httpOnly: false, path: '/', maxAge: 0 });
    return response;
  }
}
