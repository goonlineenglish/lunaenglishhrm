// Profile server actions — update name/school and change password
// Email is read-only (cannot be changed)

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { comparePassword, hashPassword } from '@/lib/services/auth-service';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  school: z.string().max(200).optional().nullable(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
});

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string };

/** Update display name and school of the current user */
export async function updateProfile(
  name: string,
  school: string | null | undefined
): Promise<ProfileActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const validated = updateProfileSchema.parse({ name, school });

    await prisma.user.update({
      where: { id: user.sub },
      data: {
        name: validated.name,
        school: validated.school ?? null,
      },
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    console.error('updateProfile error:', error);
    return { success: false, error: 'Cập nhật thông tin thất bại' };
  }
}

/** Change password — requires old password verification */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<ProfileActionResult> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const validated = changePasswordSchema.parse({ oldPassword, newPassword });

    // Fetch current hashed password from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { password: true },
    });
    if (!dbUser) return { success: false, error: 'Tài khoản không tồn tại' };

    const isMatch = await comparePassword(validated.oldPassword, dbUser.password);
    if (!isMatch) return { success: false, error: 'Mật khẩu cũ không đúng' };

    const hashed = await hashPassword(validated.newPassword);
    await prisma.user.update({
      where: { id: user.sub },
      data: { password: hashed },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    console.error('changePassword error:', error);
    return { success: false, error: 'Đổi mật khẩu thất bại' };
  }
}
