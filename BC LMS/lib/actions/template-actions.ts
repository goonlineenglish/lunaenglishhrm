'use server';

// Template actions — get and update lessonPlanTemplate on Program model (admin only)

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';

/**
 * Get a program's lesson plan template content by programId.
 * Returns null if no template set.
 */
export async function getTemplate(
  programId: string
): Promise<{ success: true; data: { id: string; name: string; slug: string; lessonPlanTemplate: string | null } } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const program = await prisma.program.findFirst({
      where: { id: programId, isDeleted: false },
      select: { id: true, name: true, slug: true, lessonPlanTemplate: true },
    });

    if (!program) return { success: false, error: 'Không tìm thấy chương trình' };

    return { success: true, data: program };
  } catch (error) {
    console.error('getTemplate error:', error);
    return { success: false, error: 'Lỗi khi tải template' };
  }
}

/**
 * Update a program's lesson plan template. Admin only.
 */
export async function updateTemplate(
  programId: string,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    if (user.role !== 'ADMIN') return { success: false, error: 'Không có quyền thực hiện' };

    await prisma.program.update({
      where: { id: programId },
      data: { lessonPlanTemplate: content },
    });

    return { success: true };
  } catch (error) {
    console.error('updateTemplate error:', error);
    return { success: false, error: 'Lỗi khi lưu template' };
  }
}

/**
 * Get all active programs for template list (admin only).
 */
export async function getAllProgramsForTemplates(): Promise<
  | { success: true; data: Array<{ id: string; name: string; slug: string; hasTemplate: boolean }> }
  | { success: false; error: string }
> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    if (user.role !== 'ADMIN') return { success: false, error: 'Không có quyền thực hiện' };

    const programs = await prisma.program.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, slug: true, lessonPlanTemplate: true },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: programs.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        hasTemplate: !!p.lessonPlanTemplate,
      })),
    };
  } catch (error) {
    console.error('getAllProgramsForTemplates error:', error);
    return { success: false, error: 'Lỗi khi tải danh sách chương trình' };
  }
}
