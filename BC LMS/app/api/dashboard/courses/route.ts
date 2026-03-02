// GET /api/dashboard/courses — returns courses accessible to the authenticated user
// Uses Three-Gate access control via AccessControlService
// Reads userId + role from JWT cookie (set by middleware)

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getUserAccessibleCourses } from '@/lib/services/access-control-service';

export async function GET(): Promise<NextResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const courses = await getUserAccessibleCourses(user.sub, user.role);
    return NextResponse.json({
      success: true,
      data: courses,
      totalCount: courses.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách khóa học' },
      { status: 500 }
    );
  }
}
