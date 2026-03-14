// Material server actions — confirm upload, list, delete
// confirm: verifies R2 existence via HeadObject BEFORE creating DB record
// delete: removes from R2 first, then DB (no orphan records)

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { hasPermission } from '@/lib/services/role-permissions-service';
import {
  headR2Object,
  deleteR2Object,
} from '@/lib/services/r2-storage-service';
import type { MaterialItem, MaterialActionResult } from '@/lib/types/material';

// --- confirm upload ---

type ConfirmUploadParams = {
  lessonId: string;
  courseId: string;
  r2Key: string;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * Confirm a completed upload by verifying the object exists in R2 then
 * creating the Material DB record. Prevents ghost DB records if upload failed.
 */
export async function confirmMaterialUpload(
  params: ConfirmUploadParams
): Promise<MaterialActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }
    if (!hasPermission(user.role, 'materials:upload')) {
      return { success: false, error: 'Không có quyền tải lên tài liệu' };
    }

    const { lessonId, courseId, r2Key, filename, mimeType, size } = params;

    // Verify lesson exists and belongs to course
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isDeleted: false },
      select: { id: true },
    });
    if (!lesson) {
      return { success: false, error: 'Bài học không tồn tại' };
    }

    // Guard: confirm file actually landed in R2 before writing DB record
    const exists = await headR2Object(r2Key);
    if (!exists) {
      return { success: false, error: 'File chưa được tải lên R2. Vui lòng thử lại.' };
    }

    const material = await prisma.material.create({
      data: { lessonId, filename, r2Key, mimeType, size },
    });

    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, data: material as MaterialItem };
  } catch (error) {
    console.error('confirmMaterialUpload error:', error);
    return { success: false, error: 'Lưu thông tin tài liệu thất bại' };
  }
}

// --- list by lesson ---

/**
 * Return all materials for a lesson, ordered by createdAt ascending.
 */
export async function getMaterialsByLessonId(lessonId: string): Promise<MaterialItem[]> {
  return prisma.material.findMany({
    where: { lessonId },
    orderBy: { createdAt: 'asc' },
  }) as Promise<MaterialItem[]>;
}

// --- delete ---

/**
 * Delete a material: remove from R2 first, then from DB.
 * Admin-only. courseId used for revalidatePath.
 */
export async function deleteMaterial(
  id: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }
    if (!hasPermission(user.role, 'materials:delete')) {
      return { success: false, error: 'Không có quyền xóa tài liệu' };
    }

    const material = await prisma.material.findUnique({
      where: { id },
      select: { r2Key: true },
    });
    if (!material) {
      return { success: false, error: 'Tài liệu không tồn tại' };
    }

    // Remove from R2 first (best-effort — if already gone, continue)
    await deleteR2Object(material.r2Key);

    await prisma.material.delete({ where: { id } });
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteMaterial error:', error);
    return { success: false, error: 'Xóa tài liệu thất bại' };
  }
}
