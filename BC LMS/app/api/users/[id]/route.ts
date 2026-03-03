// GET /api/users/[id] — get single user
// PUT /api/users/[id] — update name, school, role (not email/password)
// DELETE /api/users/[id] — soft delete (isDeleted=true)
// ADMIN role required

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const updateUserSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').optional(),
  school: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']).optional(),
}).refine(
  (d) => d.role !== 'MANAGER' || (typeof d.school === 'string' && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        school: true,
        role: true,
        isDeleted: true,
        createdAt: true,
        programs: {
          select: {
            program: { select: { id: true, name: true, slug: true } },
          },
        },
        enrollments: {
          select: {
            course: { select: { id: true, title: true } },
          },
        },
        _count: { select: { programs: true, enrollments: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.school !== undefined && { school: validated.school }),
        ...(validated.role !== undefined && { role: validated.role }),
      },
      select: { id: true, email: true, name: true, school: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;

    // Prevent admin from deleting themselves
    const requesterId = req.headers.get('x-user-id');
    if (requesterId === id) {
      return NextResponse.json({ success: false, error: 'Không thể xóa tài khoản đang đăng nhập' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
