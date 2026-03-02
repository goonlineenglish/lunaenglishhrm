// Session cleanup — deletes expired sessions from the database
// Called by cron endpoint; safe to run frequently

import { prisma } from '@/lib/prisma';

/** Delete all sessions where expiresAt < now. Returns count of deleted records. */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('cleanupExpiredSessions error:', error);
    throw new Error('Xóa phiên hết hạn thất bại');
  }
}
