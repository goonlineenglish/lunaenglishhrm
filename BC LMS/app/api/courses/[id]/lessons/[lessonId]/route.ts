// GET /api/courses/[id]/lessons/[lessonId] — get lesson by id
// PUT /api/courses/[id]/lessons/[lessonId] — update lesson
// DELETE /api/courses/[id]/lessons/[lessonId] — soft delete lesson
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const updateLessonSchema = z.object({
  title: z.string().min(2, 'Tiêu đề bài học quá ngắn').optional(),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương').optional(),
  duration: z.number().int().positive().optional().nullable(),
  content: z.string().optional().nullable(),
  videoUrl: z.string().url('URL video không hợp lệ').optional().nullable().or(z.literal('')),
});

type Params = { params: Promise<{ id: string; lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId, lessonId } = await params;
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson || lesson.courseId !== courseId) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error('GET /api/courses/[id]/lessons/[lessonId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId, lessonId } = await params;
    const body = await req.json();
    const validated = updateLessonSchema.parse(body);

    // Verify lesson belongs to this course
    const existing = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.order !== undefined && { order: validated.order }),
        ...(validated.duration !== undefined && { duration: validated.duration }),
        ...(validated.content !== undefined && { content: validated.content }),
        ...(validated.videoUrl !== undefined && { videoUrl: validated.videoUrl || null }),
      },
    });

    return NextResponse.json({ success: true, data: lesson });
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
    console.error('PUT /api/courses/[id]/lessons/[lessonId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId, lessonId } = await params;

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.courseId !== courseId) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    await prisma.lesson.update({ where: { id: lessonId }, data: { isDeleted: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/courses/[id]/lessons/[lessonId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
