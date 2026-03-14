// Auth service — password hashing, comparison, full login flow

import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/lib/auth/jwt-helpers';
import { createSession } from '@/lib/auth/session-helpers';
const BCRYPT_ROUNDS = 12;

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Compare a plaintext password against a bcrypt hash. */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Full login flow:
 * 1. Find user by email
 * 2. Check user not deleted
 * 3. Compare password
 * 4. Create DB session
 * 5. Sign JWT
 * Returns token + redirect URL on success, or error message on failure.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: true; token: string; csrfToken: string; redirectTo: string } | { success: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, password: true, role: true, school: true, isDeleted: true },
  });

  if (!user) {
    return { success: false, error: 'Email hoặc mật khẩu không đúng' };
  }

  if (user.isDeleted) {
    return { success: false, error: 'Tài khoản bị vô hiệu hóa' };
  }

  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    return { success: false, error: 'Email hoặc mật khẩu không đúng' };
  }

  // Create DB session, get jti
  const jti = await createSession(user.id);

  // Sign JWT with user info
  const token = await signJwt({
    sub: user.id,
    jti,
    email: user.email,
    role: user.role,
    school: user.school ?? null,
  });

  // Generate CSRF token (32 random bytes as hex)
  const { randomBytes } = await import('crypto');
  const csrfToken = randomBytes(32).toString('hex');

  // Role-based redirect
  const redirectTo = user.role === 'ADMIN' ? '/admin/users' : '/dashboard';

  return { success: true, token, csrfToken, redirectTo };
}
