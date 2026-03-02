// Cron endpoint: session cleanup
// Protected by Authorization: Bearer CRON_SECRET header
// Returns { deleted: number }

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/cron/session-cleanup';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET chưa được cấu hình' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token || token !== cronSecret) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 401 }
      );
    }

    const deleted = await cleanupExpiredSessions();
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('cron/session-cleanup error:', error);
    return NextResponse.json(
      { error: 'Xóa phiên hết hạn thất bại' },
      { status: 500 }
    );
  }
}
