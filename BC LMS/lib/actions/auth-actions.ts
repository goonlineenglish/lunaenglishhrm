// Auth server actions — server-side wrappers for login/logout
// Used as alternatives to the API routes for form submissions

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { loginUser } from '@/lib/services/auth-service';
import { verifyJwt } from '@/lib/auth/jwt-helpers';
import { invalidateSession } from '@/lib/auth/session-helpers';
import type { AuthResult } from '@/lib/types/auth';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_MAX_AGE = 8 * 60 * 60;

/** Server action for login form submission. */
export async function loginAction(formData: FormData): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const cookieStore = await cookies();

  cookieStore.set('auth-token', result.token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  cookieStore.set('csrf-token', result.csrfToken, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  return { success: true, redirectTo: result.redirectTo };
}

/** Server action for logout button. Invalidates session and clears cookies. */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (token) {
    const payload = await verifyJwt(token);
    if (payload?.jti) {
      await invalidateSession(payload.jti);
    }
  }

  cookieStore.set('auth-token', '', { httpOnly: true, path: '/', maxAge: 0 });
  cookieStore.set('csrf-token', '', { httpOnly: false, path: '/', maxAge: 0 });

  redirect('/login');
}
