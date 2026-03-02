// Soft delete service — checks active children before soft-deleting parent entities
// Service layer enforces "no active children" rule (FK RESTRICT only blocks hard delete)

import { prisma } from '@/lib/prisma';

type SoftDeleteResult = { success: boolean; error?: string };

/**
 * Soft delete a program.
 * Blocks if the program has any active (non-deleted) courses.
 */
export async function softDeleteProgram(programId: string): Promise<SoftDeleteResult> {
  try {
    const activeCourses = await prisma.course.count({
      where: { programId, isDeleted: false },
    });

    if (activeCourses > 0) {
      return {
        success: false,
        error: `Không thể xóa chương trình đang có ${activeCourses} khóa học hoạt động. Xóa khóa học trước.`,
      };
    }

    await prisma.program.update({
      where: { id: programId },
      data: { isDeleted: true },
    });

    return { success: true };
  } catch (error) {
    console.error('softDeleteProgram error:', error);
    return { success: false, error: 'Xóa chương trình thất bại' };
  }
}

/**
 * Soft delete a course.
 * Blocks if the course has any active (non-deleted) lessons.
 */
export async function softDeleteCourse(courseId: string): Promise<SoftDeleteResult> {
  try {
    const activeLessons = await prisma.lesson.count({
      where: { courseId, isDeleted: false },
    });

    if (activeLessons > 0) {
      return {
        success: false,
        error: `Không thể xóa khóa học đang có ${activeLessons} bài học hoạt động. Xóa bài học trước.`,
      };
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { isDeleted: true },
    });

    return { success: true };
  } catch (error) {
    console.error('softDeleteCourse error:', error);
    return { success: false, error: 'Xóa khóa học thất bại' };
  }
}
