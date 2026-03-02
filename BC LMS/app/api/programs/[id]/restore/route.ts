// PATCH /api/programs/[id]/restore — restore a soft-deleted program
// Admin-only: checks x-user-role header

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const program = await prisma.program.update({
      where: { id },
      data: { isDeleted: false },
      include: { _count: { select: { courses: true, users: true } } },
    });

    return NextResponse.json({ success: true, data: program });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    }
    console.error('PATCH /api/programs/[id]/restore error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
