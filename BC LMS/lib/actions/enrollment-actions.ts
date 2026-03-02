// Enrollment server actions — manage UserProgram and Enrollment records
// Used by admin UI to assign programs and enroll users in courses

'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** List all enrollments for a user. */
export async function getEnrollments(
  userId: string
): Promise<ActionResult<{ courseId: string; courseName: string }[]>> {
  const caller = await getAuthenticatedUser();
  if (!caller) return { success: false, error: 'Unauthorized' };

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: { course: { select: { title: true } } },
    });
    return {
      success: true,
      data: enrollments.map((e) => ({ courseId: e.courseId, courseName: e.course.title })),
    };
  } catch {
    return { success: false, error: 'Không thể tải danh sách đăng ký' };
  }
}

/** Assign a user to a program (Gate 1 grant). Admin only. */
export async function assignProgram(
  userId: string,
  programId: string
): Promise<ActionResult> {
  const caller = await getAuthenticatedUser();
  if (!caller || caller.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    await prisma.userProgram.create({ data: { userId, programId } });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Người dùng đã được gán vào chương trình này' };
  }
}

/** Revoke program membership (keeps Enrollment + Progress in DB). Admin only. */
export async function revokeProgram(
  userId: string,
  programId: string
): Promise<ActionResult> {
  const caller = await getAuthenticatedUser();
  if (!caller || caller.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    await prisma.userProgram.delete({
      where: { userId_programId: { userId, programId } },
    });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Không tìm thấy bản ghi phân công chương trình' };
  }
}

/** Enroll a user in a course (Gate 2 grant). Admin only. */
export async function enrollCourse(
  userId: string,
  courseId: string
): Promise<ActionResult> {
  const caller = await getAuthenticatedUser();
  if (!caller || caller.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    await prisma.enrollment.create({ data: { userId, courseId } });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Người dùng đã được đăng ký vào khóa học này' };
  }
}

/** Remove a course enrollment. Admin only. */
export async function unenrollCourse(
  userId: string,
  courseId: string
): Promise<ActionResult> {
  const caller = await getAuthenticatedUser();
  if (!caller || caller.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    await prisma.enrollment.delete({
      where: { userId_courseId: { userId, courseId } },
    });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Không tìm thấy bản ghi đăng ký' };
  }
}
