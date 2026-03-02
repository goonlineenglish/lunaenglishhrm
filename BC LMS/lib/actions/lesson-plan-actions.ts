'use server';

// Lesson plan CRUD server actions — list, get, create, update, delete
// Security: userId always taken from JWT, never from client

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import type { CreateLessonPlanInput, LessonPlanFilterParams, UpdateLessonPlanInput } from '@/lib/types/lesson-plan';

const LESSON_PLAN_ROLES = ['TEACHER', 'TEACHING_ASSISTANT', 'ADMIN'] as const;

/**
 * List lesson plans for the authenticated user with optional search/filter.
 * ADMIN can see all plans.
 */
export async function getLessonPlans(params: LessonPlanFilterParams = {}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' } as const;

    if (!(LESSON_PLAN_ROLES as readonly string[]).includes(user.role)) {
      return { success: false, error: 'Không có quyền truy cập' } as const;
    }

    const { search, programId } = params;

    const plans = await prisma.lessonPlan.findMany({
      where: {
        // Admin sees all; others see only their own
        ...(user.role !== 'ADMIN' ? { userId: user.sub } : {}),
        ...(programId ? { programId } : {}),
        ...(search
          ? { title: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        programId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        program: { select: { name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      success: true,
      data: plans.map((p) => ({
        id: p.id,
        title: p.title,
        programId: p.programId,
        programName: p.program.name,
        programSlug: p.program.slug,
        userId: p.userId,
        content: p.content,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    } as const;
  } catch (error) {
    console.error('getLessonPlans error:', error);
    return { success: false, error: 'Lỗi khi tải danh sách kế hoạch' } as const;
  }
}

/**
 * Get a single lesson plan by ID. Ownership: plan.userId === jwt.sub OR admin.
 */
export async function getLessonPlanById(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' } as const;

    const plan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: { program: { select: { name: true, slug: true, lessonPlanTemplate: true } } },
    });

    if (!plan) return { success: false, error: 'Không tìm thấy kế hoạch' } as const;

    // Ownership check — admin bypasses
    if (user.role !== 'ADMIN' && plan.userId !== user.sub) {
      return { success: false, error: 'Không có quyền truy cập' } as const;
    }

    return { success: true, data: plan } as const;
  } catch (error) {
    console.error('getLessonPlanById error:', error);
    return { success: false, error: 'Lỗi khi tải kế hoạch' } as const;
  }
}

/**
 * Create a new lesson plan. userId is always set from JWT (security).
 */
export async function createLessonPlan(input: CreateLessonPlanInput) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' } as const;

    if (!(LESSON_PLAN_ROLES as readonly string[]).includes(user.role)) {
      return { success: false, error: 'Không có quyền tạo kế hoạch' } as const;
    }

    if (!input.title?.trim()) return { success: false, error: 'Tiêu đề không được trống' } as const;
    if (!input.programId) return { success: false, error: 'Vui lòng chọn chương trình' } as const;

    const plan = await prisma.lessonPlan.create({
      data: {
        title: input.title.trim(),
        programId: input.programId,
        userId: user.sub, // Always from JWT, never from client
        content: input.content || JSON.stringify({ type: 'doc', content: [] }),
      },
    });

    return { success: true, data: { id: plan.id } } as const;
  } catch (error) {
    console.error('createLessonPlan error:', error);
    return { success: false, error: 'Lỗi khi tạo kế hoạch' } as const;
  }
}

/**
 * Update title and/or content of a lesson plan. Checks ownership.
 */
export async function updateLessonPlan(id: string, input: UpdateLessonPlanInput) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' } as const;

    const existing = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Không tìm thấy kế hoạch' } as const;

    if (user.role !== 'ADMIN' && existing.userId !== user.sub) {
      return { success: false, error: 'Không có quyền chỉnh sửa' } as const;
    }

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
      },
    });

    return { success: true, data: { updatedAt: updated.updatedAt } } as const;
  } catch (error) {
    console.error('updateLessonPlan error:', error);
    return { success: false, error: 'Lỗi khi cập nhật kế hoạch' } as const;
  }
}

/**
 * Delete a lesson plan. Admin can delete any; others only their own.
 */
export async function deleteLessonPlan(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' } as const;

    const existing = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Không tìm thấy kế hoạch' } as const;

    if (user.role !== 'ADMIN' && existing.userId !== user.sub) {
      return { success: false, error: 'Không có quyền xóa' } as const;
    }

    await prisma.lessonPlan.delete({ where: { id } });

    return { success: true } as const;
  } catch (error) {
    console.error('deleteLessonPlan error:', error);
    return { success: false, error: 'Lỗi khi xóa kế hoạch' } as const;
  }
}
