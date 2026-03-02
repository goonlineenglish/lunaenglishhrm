// GET /api/courses — list courses with optional ?programId= and ?deleted=true filters
// POST /api/courses — create a new course
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createCourseSchema = z.object({
  programId: z.string().min(1, 'Chương trình không được để trống'),
  title: z.string().min(2, 'Tiêu đề khóa học quá ngắn'),
  description: z.string().optional(),
  type: z.enum(['TRAINING', 'MATERIAL']),
  level: z.enum(['BASIC', 'ADVANCED']).default('BASIC'),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const programId = searchParams.get('programId') ?? undefined;
    const showDeleted = searchParams.get('deleted') === 'true';
    const search = searchParams.get('search') ?? undefined;

    const courses = await prisma.course.findMany({
      where: {
        isDeleted: showDeleted,
        ...(programId ? { programId } : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        program: { select: { name: true, slug: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    });

    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    console.error('GET /api/courses error:', error);
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
    const validated = createCourseSchema.parse(body);

    const course = await prisma.course.create({
      data: {
        programId: validated.programId,
        title: validated.title,
        description: validated.description ?? null,
        type: validated.type,
        level: validated.level,
        order: validated.order,
      },
      include: {
        program: { select: { name: true, slug: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
    });

    return NextResponse.json({ success: true, data: course }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Thứ tự khóa học đã tồn tại trong chương trình này' },
        { status: 409 }
      );
    }
    console.error('POST /api/courses error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
