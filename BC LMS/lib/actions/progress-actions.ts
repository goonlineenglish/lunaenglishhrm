// Progress server actions — upsert progress, fetch user progress
// userId always derived from JWT (never from request body)

'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getUserProgressMap } from '@/lib/services/progress-service';
import { canAccessCourse } from '@/lib/services/access-control-service';
import type {
  UpdateProgressInput,
  ProgressActionResult,
  ProgressMap,
} from '@/lib/types/progress';

// 80% watch threshold to auto-mark completed
const COMPLETION_THRESHOLD = 0.8;

/**
 * Upsert progress for a lesson.
 * - userId is derived from JWT (security: not from request body)
 * - Auto-marks completed if watchedTime >= 80% of lesson duration
 */
export async function updateProgress(
  input: UpdateProgressInput
): Promise<ProgressActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const { lessonId, watchedTime, completed } = input;

    // Fetch lesson + its courseId for access-control check
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId, isDeleted: false },
      select: { duration: true, courseId: true },
    });

    if (!lesson) return { success: false, error: 'Bài học không tồn tại' };

    // Three-Gate access check: user must have access to the course
    const hasAccess = await canAccessCourse(user.sub, lesson.courseId, user.role as import('@/lib/types/user').Role);
    if (!hasAccess) return { success: false, error: 'Không có quyền truy cập khóa học này' };

    // Determine completed flag:
    // explicit param overrides, else auto-detect via duration threshold
    let isCompleted = completed ?? false;
    if (!isCompleted && lesson.duration && lesson.duration > 0) {
      // lesson.duration is stored in minutes; watchedTime is in seconds — convert minutes → seconds
      isCompleted = watchedTime >= lesson.duration * 60 * COMPLETION_THRESHOLD;
    }

    const record = await prisma.progress.upsert({
      where: {
        userId_lessonId: { userId: user.sub, lessonId },
      },
      update: {
        watchedTime,
        completed: isCompleted,
        updatedAt: new Date(),
      },
      create: {
        userId: user.sub,
        lessonId,
        watchedTime,
        completed: isCompleted,
      },
    });

    return { success: true, data: record };
  } catch (error) {
    console.error('updateProgress error:', error);
    return { success: false, error: 'Cập nhật tiến độ thất bại' };
  }
}

/**
 * Get all progress records for the authenticated user.
 * Returns a lessonId-keyed map.
 */
export async function getUserProgress(): Promise<ProgressMap> {
  const user = await getAuthenticatedUser();
  if (!user) return {};
  return getUserProgressMap(user.sub);
}
