// GET /api/users — list users with pagination, search, filter
// POST /api/users — create new user
// ADMIN role required (enforced by proxy.ts via x-user-role header)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

const BCRYPT_ROUNDS = 12;
const PAGE_SIZE = 20;

const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(2, 'Tên quá ngắn'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']),
}).refine(
  (d) => d.role !== 'MANAGER' || (d.school && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

export async function GET(req: NextRequest) {
  // Role check — proxy forwards x-user-role header
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const search = searchParams.get('search') ?? '';
    const deleted = searchParams.get('deleted') === 'true';
    const filterRole = searchParams.get('role') ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isDeleted: deleted };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (filterRole) where.role = filterRole;

    const skip = (page - 1) * PAGE_SIZE;

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

    return NextResponse.json({
      success: true,
      data: users,
      pagination: { total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) },
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createUserSchema.parse(body);
    const hashedPassword = await bcrypt.hash(validated.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        name: validated.name,
        password: hashedPassword,
        school: validated.school ?? null,
        role: validated.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Email đã tồn tại', code: 'DUPLICATE' }, { status: 409 });
    }
    console.error('POST /api/users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
