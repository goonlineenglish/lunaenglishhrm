// Course server actions — CRUD for courses and lessons (admin-only)
// Uses soft-delete-service for guarded course deletion
// Lesson actions included here per phase-05 file ownership spec

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { softDeleteCourse } from '@/lib/services/soft-delete-service';
import type {
  CourseListItem,
  CourseDetail,
  LessonItem,
  CreateCourseInput,
  UpdateCourseInput,
  CreateLessonInput,
  UpdateLessonInput,
  CourseActionResult,
} from '@/lib/types/course';

// --- Zod schemas ---

const courseSchema = z.object({
  programId: z.string().min(1, 'Chương trình không được để trống'),
  title: z.string().min(2, 'Tiêu đề khóa học quá ngắn'),
  description: z.string().optional(),
  type: z.enum(['TRAINING', 'MATERIAL']),
  level: z.enum(['BASIC', 'ADVANCED']).default('BASIC'),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
});

const lessonSchema = z.object({
  courseId: z.string().min(1, 'Khóa học không được để trống'),
  title: z.string().min(2, 'Tiêu đề bài học quá ngắn'),
  order: z.number().int().positive('Thứ tự phải là số nguyên dương'),
  duration: z.number().int().positive().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url('URL video không hợp lệ').optional().or(z.literal('')),
});

// --- Course actions ---

/** List courses, optionally filtered by programId or deleted status */
export async function getCourses(params: {
  programId?: string;
  showDeleted?: boolean;
} = {}): Promise<CourseListItem[]> {
  return prisma.course.findMany({
    where: {
      isDeleted: params.showDeleted ?? false,
      ...(params.programId ? { programId: params.programId } : {}),
    },
    include: {
      program: { select: { name: true, slug: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
  }) as Promise<CourseListItem[]>;
}

/** Get a single course with lessons (ordered) */
export async function getCourseById(id: string): Promise<CourseDetail | null> {
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
  return course as CourseDetail | null;
}

/** Create a new course */
export async function createCourse(input: CreateCourseInput): Promise<CourseActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const validated = courseSchema.parse(input);

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

    revalidatePath('/admin/courses');
    return { success: true, data: course as CourseListItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Thứ tự khóa học đã tồn tại trong chương trình này' };
    }
    console.error('createCourse error:', error);
    return { success: false, error: 'Tạo khóa học thất bại' };
  }
}

/** Update course fields */
export async function updateCourse(
  id: string,
  input: UpdateCourseInput
): Promise<CourseActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const validated = courseSchema.partial().parse(input);

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description ?? null }),
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

    revalidatePath('/admin/courses');
    return { success: true, data: course as CourseListItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Thứ tự khóa học đã tồn tại trong chương trình này' };
    }
    console.error('updateCourse error:', error);
    return { success: false, error: 'Cập nhật khóa học thất bại' };
  }
}

/** Soft delete course (blocked if active lessons exist) */
export async function deleteCourse(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    // Guard: check active lessons via soft-delete-service
    const result = await softDeleteCourse(id);
    if (result.success) revalidatePath('/admin/courses');
    return result;
  } catch (error) {
    console.error('deleteCourse error:', error);
    return { success: false, error: 'Xóa khóa học thất bại' };
  }
}

/** Restore a soft-deleted course */
export async function restoreCourse(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    await prisma.course.update({ where: { id }, data: { isDeleted: false } });
    revalidatePath('/admin/courses');
    return { success: true };
  } catch (error) {
    console.error('restoreCourse error:', error);
    return { success: false, error: 'Khôi phục khóa học thất bại' };
  }
}

/** Reorder courses within a program using transaction */
export async function reorderCourses(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    // Atomic transaction: update all order values at once
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.course.update({ where: { id }, data: { order: index + 1 } })
      )
    );

    revalidatePath('/admin/courses');
    return { success: true };
  } catch (error) {
    console.error('reorderCourses error:', error);
    return { success: false, error: 'Sắp xếp lại khóa học thất bại' };
  }
}

// --- Lesson actions ---

/** Get lessons for a course */
export async function getLessons(
  courseId: string,
  showDeleted = false
): Promise<LessonItem[]> {
  return prisma.lesson.findMany({
    where: { courseId, isDeleted: showDeleted },
    orderBy: { order: 'asc' },
  }) as Promise<LessonItem[]>;
}

/** Create a lesson in a course */
export async function createLesson(
  input: CreateLessonInput
): Promise<CourseActionResult<LessonItem>> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const validated = lessonSchema.parse(input);

    const lesson = await prisma.lesson.create({
      data: {
        courseId: validated.courseId,
        title: validated.title,
        order: validated.order,
        duration: validated.duration ?? null,
        content: validated.content ?? null,
        videoUrl: validated.videoUrl || null,
      },
    });

    revalidatePath(`/admin/courses/${input.courseId}`);
    return { success: true, data: lesson as LessonItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Thứ tự bài học đã tồn tại trong khóa học này' };
    }
    console.error('createLesson error:', error);
    return { success: false, error: 'Tạo bài học thất bại' };
  }
}

/** Update a lesson */
export async function updateLesson(
  id: string,
  courseId: string,
  input: UpdateLessonInput
): Promise<CourseActionResult<LessonItem>> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const partial = lessonSchema.omit({ courseId: true }).partial().parse(input);

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(partial.title !== undefined && { title: partial.title }),
        ...(partial.order !== undefined && { order: partial.order }),
        ...(partial.duration !== undefined && { duration: partial.duration ?? null }),
        ...(partial.content !== undefined && { content: partial.content ?? null }),
        ...(partial.videoUrl !== undefined && { videoUrl: partial.videoUrl || null }),
      },
    });

    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, data: lesson as LessonItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Thứ tự bài học đã tồn tại trong khóa học này' };
    }
    console.error('updateLesson error:', error);
    return { success: false, error: 'Cập nhật bài học thất bại' };
  }
}

/** Soft delete a lesson */
export async function deleteLesson(
  id: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    await prisma.lesson.update({ where: { id }, data: { isDeleted: true } });
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteLesson error:', error);
    return { success: false, error: 'Xóa bài học thất bại' };
  }
}

/** Reorder lessons within a course using transaction */
export async function reorderLessons(
  courseId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.lesson.update({ where: { id }, data: { order: index + 1 } })
      )
    );

    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    console.error('reorderLessons error:', error);
    return { success: false, error: 'Sắp xếp lại bài học thất bại' };
  }
}
