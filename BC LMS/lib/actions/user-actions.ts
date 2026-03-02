'use server';

// User server actions — CRUD, soft delete, restore, program/enrollment assignment
// All actions require ADMIN role verified via getAuthenticatedUser()

import { z } from 'zod';
import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import type { UserListItem, CreateUserInput, UpdateUserInput } from '@/lib/types/user';

const BCRYPT_ROUNDS = 12;
const PAGE_SIZE = 20;

// --- Zod schemas ---

const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(2, 'Tên quá ngắn (tối thiểu 2 ký tự)'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']),
}).refine(
  (d) => d.role !== 'MANAGER' || (d.school && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

const updateUserSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').optional(),
  school: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']).optional(),
}).refine(
  (d) => d.role !== 'MANAGER' || d.school === undefined || (d.school && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

// --- Helpers ---

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  return user;
}

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: string };

// --- Actions ---

export async function getUsers(params: {
  page?: number;
  search?: string;
  showDeleted?: boolean;
  role?: string;
}): Promise<ActionResult<{ users: UserListItem[]; total: number; pages: number }>> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    const page = params.page ?? 1;
    const skip = (page - 1) * PAGE_SIZE;
    const showDeleted = params.showDeleted ?? false;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isDeleted: showDeleted };
    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (params.role) {
      where.role = params.role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          school: true,
          role: true,
          isDeleted: true,
          createdAt: true,
          _count: { select: { programs: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: {
        users: users as UserListItem[],
        total,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    };
  } catch (error) {
    console.error('getUsers error:', error);
    return { success: false, error: 'Lỗi tải danh sách người dùng' };
  }
}

export async function createUser(input: CreateUserInput): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    const validated = createUserSchema.parse(input);
    const hashedPassword = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        name: validated.name,
        password: hashedPassword,
        school: validated.school ?? null,
        role: validated.role,
      },
      select: { id: true },
    });

    revalidatePath('/admin/users');
    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', code: 'VALIDATION' };
    }
    // Prisma unique constraint violation — P2002
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return { success: false, error: 'Email đã tồn tại', code: 'DUPLICATE' };
    }
    console.error('createUser error:', error);
    return { success: false, error: 'Tạo người dùng thất bại' };
  }
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    const validated = updateUserSchema.parse(input);

    await prisma.user.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.school !== undefined && { school: validated.school }),
        ...(validated.role !== undefined && { role: validated.role }),
      },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', code: 'VALIDATION' };
    }
    console.error('updateUser error:', error);
    return { success: false, error: 'Cập nhật người dùng thất bại' };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('deleteUser error:', error);
    return { success: false, error: 'Xóa người dùng thất bại' };
  }
}

export async function restoreUser(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    await prisma.user.update({
      where: { id },
      data: { isDeleted: false },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('restoreUser error:', error);
    return { success: false, error: 'Khôi phục người dùng thất bại' };
  }
}

export async function assignProgram(userId: string, programId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    await prisma.userProgram.create({ data: { userId, programId } });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return { success: false, error: 'Người dùng đã được gán vào chương trình này', code: 'DUPLICATE' };
    }
    console.error('assignProgram error:', error);
    return { success: false, error: 'Gán chương trình thất bại' };
  }
}

export async function revokeProgram(userId: string, programId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { success: false, error: 'Không có quyền', code: 'FORBIDDEN' };

    await prisma.userProgram.delete({
      where: { userId_programId: { userId, programId } },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('revokeProgram error:', error);
    return { success: false, error: 'Hủy gán chương trình thất bại' };
  }
}
