// GET /api/courses/[id]/lessons — list active lessons for a course
// POST /api/courses/[id]/lessons — create a new lesson
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createLessonSchema = z.object({
  title: z.string().min(2, 'Tiêu đề bài học quá ngắn'),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
  duration: z.number().int().positive().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url('URL video không hợp lệ').optional().or(z.literal('')),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;

    const lessons = await prisma.lesson.findMany({
      where: { courseId, isDeleted: false },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: lessons });
  } catch (error) {
    console.error('GET /api/courses/[id]/lessons error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await req.json();
    const validated = createLessonSchema.parse(body);

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title: validated.title,
        order: validated.order,
        duration: validated.duration ?? null,
        content: validated.content ?? null,
        videoUrl: validated.videoUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Thứ tự bài học đã tồn tại trong khóa học này' },
        { status: 409 }
      );
    }
    console.error('POST /api/courses/[id]/lessons error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
