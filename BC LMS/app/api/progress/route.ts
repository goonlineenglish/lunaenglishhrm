// POST /api/progress — update lesson watched time
// userId is always derived from JWT, never from request body

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { updateProgress } from '@/lib/actions/progress-actions';
import { z } from 'zod';

const bodySchema = z.object({
  lessonId: z.string().min(1),
  watchedTime: z.number().int().min(0),
  completed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await updateProgress(parsed.data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/progress error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
