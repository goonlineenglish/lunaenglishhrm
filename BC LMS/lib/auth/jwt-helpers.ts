// JWT sign/verify helpers using `jose` (Edge-compatible, HS256)

import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '@/lib/types/auth';

// Encode the JWT secret as Uint8Array for jose
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

const EXPIRY = '8h'; // 28800 seconds

/**
 * Sign a JWT token with HS256.
 * iat and exp are auto-set by jose.
 */
export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

/**
 * Verify a JWT and return the payload, or null if invalid/expired.
 */
export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
