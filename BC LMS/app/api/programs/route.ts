// GET /api/programs — list programs (active or deleted)
// POST /api/programs — create a new program
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createProgramSchema = z.object({
  name: z.string().min(2, 'Tên chương trình quá ngắn'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const showDeleted = req.nextUrl.searchParams.get('deleted') === 'true';

    const programs = await prisma.program.findMany({
      where: { isDeleted: showDeleted },
      include: { _count: { select: { courses: true, users: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: programs });
  } catch (error) {
    console.error('GET /api/programs error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createProgramSchema.parse(body);

    const program = await prisma.program.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description ?? null,
      },
      include: { _count: { select: { courses: true, users: true } } },
    });

    return NextResponse.json({ success: true, data: program }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại, vui lòng chọn slug khác' },
        { status: 409 }
      );
    }
    console.error('POST /api/programs error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
