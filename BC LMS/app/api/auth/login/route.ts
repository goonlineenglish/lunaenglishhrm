// Login API route — validates credentials, creates session, sets cookies
// POST /api/auth/login

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/lib/services/auth-service';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: result.redirectTo,
    });

    // Set httpOnly auth-token cookie (JWT)
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    // Set csrf-token cookie (NOT httpOnly — client JS must read it)
    response.cookies.set('csrf-token', result.csrfToken, {
      httpOnly: false,
      secure: IS_PROD,
      sameSite: 'strict',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ, vui lòng thử lại' },
      { status: 500 }
    );
  }
}
