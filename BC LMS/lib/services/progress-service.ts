// Progress service — DB queries for lesson progress
// Keeps progress reads separate from write actions

import { prisma } from '@/lib/prisma';
import type { ProgressItem, ProgressMap } from '@/lib/types/progress';

/**
 * Get all progress records for a user (for dashboard / course views).
 * Returns a map of lessonId -> ProgressItem for O(1) lookup.
 */
export async function getUserProgressMap(userId: string): Promise<ProgressMap> {
  try {
    const records = await prisma.progress.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        lessonId: true,
        completed: true,
        watchedTime: true,
        updatedAt: true,
      },
    });

    return records.reduce<ProgressMap>((acc, p) => {
      acc[p.lessonId] = p as ProgressItem;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Get progress for a single lesson.
 */
export async function getLessonProgress(
  userId: string,
  lessonId: string
): Promise<ProgressItem | null> {
  try {
    const record = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return record as ProgressItem | null;
  } catch {
    return null;
  }
}

/**
 * Get progress for all lessons in a course.
 * Returns array of ProgressItems.
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<ProgressItem[]> {
  try {
    const records = await prisma.progress.findMany({
      where: {
        userId,
        lesson: { courseId, isDeleted: false },
      },
      select: {
        id: true,
        userId: true,
        lessonId: true,
        completed: true,
        watchedTime: true,
        updatedAt: true,
      },
    });
    return records as ProgressItem[];
  } catch {
    return [];
  }
}
