// Program server actions — CRUD for programs (admin-only)
// Uses soft-delete-service for guarded deletion
// Note: generateSlug utility is in @/lib/utils/slug-helpers (non-server file)

'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { softDeleteProgram } from '@/lib/services/soft-delete-service';
import type { CreateProgramInput, ProgramListItem, ProgramActionResult } from '@/lib/types/program';

// Zod validation schema for program create/update
const programSchema = z.object({
  name: z.string().min(2, 'Tên chương trình quá ngắn'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().optional(),
});

/** List programs — active or deleted */
export async function getPrograms(
  params: { showDeleted?: boolean } = {}
): Promise<ProgramListItem[]> {
  return prisma.program.findMany({
    where: { isDeleted: params.showDeleted ?? false },
    include: { _count: { select: { courses: true, users: true } } },
    orderBy: { name: 'asc' },
  });
}

/** Get a single program by id (includes course count) */
export async function getProgramById(id: string): Promise<ProgramListItem | null> {
  return prisma.program.findUnique({
    where: { id },
    include: { _count: { select: { courses: true, users: true } } },
  });
}

/** Create a new program */
export async function createProgram(
  input: CreateProgramInput
): Promise<ProgramActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const validated = programSchema.parse(input);

    const program = await prisma.program.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description ?? null,
      },
      include: { _count: { select: { courses: true, users: true } } },
    });

    return { success: true, data: program };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    // Prisma unique constraint violation (slug duplicate)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Slug đã tồn tại, vui lòng chọn slug khác' };
    }
    console.error('createProgram error:', error);
    return { success: false, error: 'Tạo chương trình thất bại' };
  }
}

/** Update program name, slug, or description */
export async function updateProgram(
  id: string,
  input: Partial<CreateProgramInput>
): Promise<ProgramActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    const validated = programSchema.partial().parse(input);

    const program = await prisma.program.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.slug !== undefined && { slug: validated.slug }),
        ...(validated.description !== undefined && { description: validated.description ?? null }),
      },
      include: { _count: { select: { courses: true, users: true } } },
    });

    return { success: true, data: program };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Slug đã tồn tại, vui lòng chọn slug khác' };
    }
    console.error('updateProgram error:', error);
    return { success: false, error: 'Cập nhật chương trình thất bại' };
  }
}

/** Soft-delete a program (blocked if active courses exist) */
export async function deleteProgram(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    // Guard: check active courses first
    return await softDeleteProgram(id);
  } catch (error) {
    console.error('deleteProgram error:', error);
    return { success: false, error: 'Xóa chương trình thất bại' };
  }
}

/** Restore a soft-deleted program */
export async function restoreProgram(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền thực hiện thao tác này' };
    }

    await prisma.program.update({
      where: { id },
      data: { isDeleted: false },
    });

    return { success: true };
  } catch (error) {
    console.error('restoreProgram error:', error);
    return { success: false, error: 'Khôi phục chương trình thất bại' };
  }
}
