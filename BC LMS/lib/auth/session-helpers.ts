// Session CRUD helpers — create, invalidate, validate sessions in the DB

import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

/**
 * Create a new session for a user.
 * Returns the jti (session token identifier) used in the JWT.
 */
export async function createSession(userId: string): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: { userId, jti, expiresAt },
  });

  return jti;
}

/**
 * Invalidate a session so it can no longer be used.
 * Called on logout.
 */
export async function invalidateSession(jti: string): Promise<void> {
  await prisma.session.updateMany({
    where: { jti },
    data: { invalidated: true },
  });
}

/**
 * Validate a session by jti.
 * Returns true only if session exists, not invalidated, and not expired.
 */
export async function validateSession(jti: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { jti },
  });

  if (!session) return false;
  if (session.invalidated) return false;
  if (session.expiresAt < new Date()) return false;

  return true;
}
