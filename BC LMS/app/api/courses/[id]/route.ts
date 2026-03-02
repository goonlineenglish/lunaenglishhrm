// GET /api/courses/[id] — get course with lessons
// PUT /api/courses/[id] — update course fields
// DELETE /api/courses/[id] — soft delete (guard: no active lessons)
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { softDeleteCourse } from '@/lib/services/soft-delete-service';

const updateCourseSchema = z.object({
  title: z.string().min(2, 'Tiêu đề khóa học quá ngắn').optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['TRAINING', 'MATERIAL']).optional(),
  level: z.enum(['BASIC', 'ADVANCED']).optional(),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương').optional(),
  programId: z.string().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        program: { select: { name: true, slug: true } },
        _count: { select: { lessons: true, enrollments: true } },
        lessons: {
          where: { isDeleted: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateCourseSchema.parse(body);

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.level !== undefined && { level: validated.level }),
        ...(validated.order !== undefined && { order: validated.order }),
        ...(validated.programId !== undefined && { programId: validated.programId }),
      },
      include: {
        program: { select: { name: true, slug: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
    });

    return NextResponse.json({ success: true, data: course });
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
    console.error('PUT /api/courses/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Guard: block deletion if active lessons exist
    const result = await softDeleteCourse(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/courses/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
