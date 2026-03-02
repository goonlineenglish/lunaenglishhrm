// Access Control Service — Three-Gate authorization for course access
// Gate 1: UserProgram (program membership), Gate 2: Enrollment, Gate 3: CourseLevel

import { prisma } from '@/lib/prisma';
import type { Role } from '@/lib/types/user';
import type { CourseLevel } from '@/lib/types/course';

// Only ADMIN and TEACHER can access ADVANCED courses
const ADVANCED_ROLES: Role[] = ['ADMIN', 'TEACHER'];

/**
 * Gate 3 check: does the user's role allow access to this CourseLevel?
 */
export function canAccessCourseLevel(role: Role, level: CourseLevel): boolean {
  if (level === 'BASIC') return true;
  return ADVANCED_ROLES.includes(role);
}

/**
 * Three-Gate check for a single course.
 * Gates evaluated in order: CourseLevel → UserProgram → Enrollment.
 * ADMIN bypasses Gate 1 + Gate 2 (sees all non-deleted courses at allowed levels).
 */
export async function canAccessCourse(
  userId: string,
  courseId: string,
  userRole: Role
): Promise<boolean> {
  try {
    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { level: true, programId: true },
    });
    if (!course) return false;

    // Gate 3: CourseLevel check (fail fast)
    if (!canAccessCourseLevel(userRole, course.level as CourseLevel)) return false;

    // ADMIN bypasses program membership and enrollment gates
    if (userRole === 'ADMIN') return true;

    // Gate 1: UserProgram membership
    const programMembership = await prisma.userProgram.findUnique({
      where: { userId_programId: { userId, programId: course.programId } },
    });
    if (!programMembership) return false;

    // Gate 2: Enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return !!enrollment;
  } catch {
    return false;
  }
}

/**
 * Dashboard query — returns all courses accessible to the user via Three-Gate logic.
 * Used to populate the teacher/manager/TA dashboard course list.
 */
export async function getUserAccessibleCourses(userId: string, role: Role) {
  try {
    // ADMIN: see all active courses at allowed level (bypasses Gates 1 + 2)
    if (role === 'ADMIN') {
      return prisma.course.findMany({
        where: {
          isDeleted: false,
          program: { isDeleted: false },
        },
        include: {
          program: { select: { id: true, name: true, slug: true } },
          _count: { select: { lessons: { where: { isDeleted: false } } } },
        },
        orderBy: [{ program: { name: 'asc' } }, { order: 'asc' }],
      });
    }

    // Gate 1: Get user's program memberships
    const userPrograms = await prisma.userProgram.findMany({
      where: { userId },
      select: { programId: true },
    });
    const programIds = userPrograms.map((up) => up.programId);
    if (programIds.length === 0) return [];

    // Gate 2 + 3 combined: enrolled courses in those programs, filtered by CourseLevel
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        course: {
          programId: { in: programIds },
          isDeleted: false,
          program: { isDeleted: false },
        },
      },
      include: {
        course: {
          include: {
            program: { select: { id: true, name: true, slug: true } },
            _count: { select: { lessons: { where: { isDeleted: false } } } },
          },
        },
      },
    });

    // Apply Gate 3: filter by CourseLevel based on role
    return enrollments
      .map((e) => e.course)
      .filter((c) => canAccessCourseLevel(role, c.level as CourseLevel));
  } catch {
    return [];
  }
}
