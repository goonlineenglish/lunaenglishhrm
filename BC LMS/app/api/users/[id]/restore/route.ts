// PATCH /api/users/[id]/restore — restore a soft-deleted user
// Sets isDeleted=false, restoring login access
// ADMIN role required

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const role = req.headers.get('x-user-role');
  if (role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isDeleted: false },
      select: { id: true, email: true, name: true, isDeleted: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('PATCH /api/users/[id]/restore error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
