// GET /api/materials/[id]/download — generate presigned GET URL for material
// Requires: materials:download permission + Three-Gate course access check
// Returns { success: true, data: { downloadUrl, filename, mimeType } }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/services/role-permissions-service';
import { canAccessCourse } from '@/lib/services/access-control-service';
import { generateDownloadPresignedUrl } from '@/lib/services/r2-storage-service';
import type { Role } from '@/lib/types/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    // Auth from proxy headers
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') as Role | null;

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Permission check
    if (!hasPermission(role, 'materials:download')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền tải tài liệu' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch material with lesson context for access check
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        lesson: { select: { courseId: true, isDeleted: true } },
      },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Tài liệu không tồn tại' },
        { status: 404 }
      );
    }

    // Reject if the parent lesson is soft-deleted
    if (material.lesson.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Bài học chứa tài liệu này đã bị xóa' },
        { status: 403 }
      );
    }

    // Three-Gate access check — confirms user can see the course
    const canAccess = await canAccessCourse(userId, material.lesson.courseId, role);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập khóa học này' },
        { status: 403 }
      );
    }

    // Generate short-lived presigned download URL (1 hour)
    const downloadUrl = await generateDownloadPresignedUrl(material.r2Key, material.filename, 3600);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        filename: material.filename,
        mimeType: material.mimeType,
      },
    });
  } catch (error) {
    console.error('GET /api/materials/[id]/download error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
