// PATCH /api/courses/reorder — bulk reorder courses within a program
// Body: { items: [{ id: string, order: number }] }
// Uses transaction for atomic update
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().positive(),
    })
  ).min(1, 'Danh sách sắp xếp không được để trống'),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { items } = reorderSchema.parse(body);

    // Atomic transaction: update all orders in one go
    await prisma.$transaction(
      items.map(({ id, order }) =>
        prisma.course.update({ where: { id }, data: { order } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Xung đột thứ tự — vui lòng tải lại trang và thử lại' },
        { status: 409 }
      );
    }
    console.error('PATCH /api/courses/reorder error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
