// Auth guard helper — reads auth-token cookie and returns verified JWT payload
// Use in server components/actions to get the current authenticated user

import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt-helpers';
import type { JwtPayload } from '@/lib/types/auth';

/**
 * Returns the JWT payload for the authenticated user, or null if not authenticated.
 * Does NOT check DB session — for route-level checks use middleware/proxy.ts.
 */
export async function getAuthenticatedUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}
