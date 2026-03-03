// Report server actions — admin/manager data queries
// Progress report, completion report, activity report
// IDOR protection: managers scoped by school

'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import type {
  ProgressReportRow,
  CompletionReportRow,
  ActivityReportRow,
  ReportFilters,
} from '@/lib/types/report';

/** Progress report: per-user enrollment + completion counts.
 *  Admin: all users. Manager: own school only. */
export async function getProgressReport(
  params: ReportFilters = {}
): Promise<ProgressReportRow[]> {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error('Chưa đăng nhập');

  const isAdmin = authUser.role === 'ADMIN';
  const isManager = authUser.role === 'MANAGER';
  if (!isAdmin && !isManager) throw new Error('Không có quyền xem báo cáo');

  // IDOR: manager always scoped to own school.
  // If manager somehow has null school, deny access to prevent full data leak.
  if (isManager && !authUser.school) {
    throw new Error('Tài khoản quản lý chưa được gán trường/cơ sở');
  }
  const schoolFilter = isManager ? authUser.school! : (params.school ?? undefined);

  // Date range filter for enrollments/progress — applied as a createdAt bound
  const dateFrom = params.dateRange?.from ? new Date(params.dateRange.from) : undefined;
  const dateTo = params.dateRange?.to ? new Date(params.dateRange.to) : undefined;
  const dateFilter = dateFrom || dateTo
    ? {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      }
    : undefined;

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      ...(schoolFilter ? { school: schoolFilter } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      school: true,
      enrollments: {
        select: {
          course: {
            select: {
              lessons: {
                where: { isDeleted: false },
                select: { id: true },
              },
            },
          },
        },
        ...(dateFilter && { where: { enrolledAt: dateFilter } }),
      },
      progress: {
        where: { completed: true, ...(dateFilter && { updatedAt: dateFilter }) },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return users.map((u) => {
    const totalLessons = u.enrollments.reduce(
      (sum, e) => sum + e.course.lessons.length, 0
    );
    const completedCount = u.progress.length;
    const completionRate = totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      school: u.school,
      enrollmentCount: u.enrollments.length,
      completedCount,
      completionRate,
    };
  });
}

/** Completion report: per-course enrollment + completion stats. Admin only. */
export async function getCompletionReport(
  params: ReportFilters = {}
): Promise<CompletionReportRow[]> {
  const authUser = await getAuthenticatedUser();
  if (!authUser || authUser.role !== 'ADMIN') {
    throw new Error('Chỉ admin mới có quyền xem báo cáo này');
  }

  const courses = await prisma.course.findMany({
    where: {
      isDeleted: false,
      ...(params.programId ? { programId: params.programId } : {}),
    },
    select: {
      id: true,
      title: true,
      program: { select: { name: true } },
      enrollments: { select: { userId: true } },
      lessons: {
        where: { isDeleted: false },
        select: {
          id: true,
          progress: {
            where: { completed: true },
            select: { userId: true },
          },
        },
      },
    },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
  });

  return courses.map((c) => {
    const enrollmentCount = c.enrollments.length;
    // Count unique users who completed ALL lessons in course
    const enrolledUserIds = new Set(c.enrollments.map((e) => e.userId));
    const totalLessons = c.lessons.length;

    let completedCount = 0;
    if (totalLessons > 0) {
      enrolledUserIds.forEach((uid) => {
        const userCompletedLessons = c.lessons.filter((l) =>
          l.progress.some((p) => p.userId === uid)
        ).length;
        if (userCompletedLessons >= totalLessons) completedCount++;
      });
    }

    const completionRate = enrollmentCount > 0
      ? Math.round((completedCount / enrollmentCount) * 100)
      : 0;

    return {
      courseId: c.id,
      title: c.title,
      programName: c.program.name,
      enrollmentCount,
      completedCount,
      completionRate,
    };
  });
}

/** Activity report: last login per user (most recent session). Admin only. */
export async function getActivityReport(): Promise<ActivityReportRow[]> {
  const authUser = await getAuthenticatedUser();
  if (!authUser || authUser.role !== 'ADMIN') {
    throw new Error('Chỉ admin mới có quyền xem báo cáo này');
  }

  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      email: true,
      name: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: u.name,
    lastLogin: u.sessions[0]?.createdAt ?? null,
  }));
}
