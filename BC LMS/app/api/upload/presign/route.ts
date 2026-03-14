// POST /api/upload/presign — generate presigned PUT URL for direct R2 upload
// Admin-only: checks x-user-role header + materials:upload permission
// Returns { success: true, data: { uploadUrl, r2Key } } on success

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/services/role-permissions-service';
import {
  buildR2Key,
  validateFileInput,
  generateUploadPresignedUrl,
} from '@/lib/services/r2-storage-service';
import type { Role } from '@/lib/types/auth';

const bodySchema = z.object({
  courseId: z.string().min(1, 'courseId không được để trống'),
  lessonId: z.string().min(1, 'lessonId không được để trống'),
  filename: z.string().min(1, 'Tên file không được để trống'),
  mimeType: z.string().min(1, 'Loại file không được để trống'),
  size: z.number().int().positive('Kích thước file không hợp lệ'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Auth from proxy headers
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') as Role | null;

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Permission check: only ADMIN can upload materials
    if (!hasPermission(role, 'materials:upload')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền tải lên tài liệu' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { courseId, lessonId, filename, mimeType, size } = parsed.data;

    // Validate file type and size
    const fileError = validateFileInput(filename, mimeType, size);
    if (fileError) {
      return NextResponse.json({ success: false, error: fileError }, { status: 400 });
    }

    // Verify lesson exists and belongs to this course
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isDeleted: false },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Bài học không tồn tại hoặc không thuộc khóa học này' },
        { status: 404 }
      );
    }

    // Build R2 key and generate presigned upload URL (10 min expiry)
    const r2Key = buildR2Key(courseId, lessonId, filename);
    const uploadUrl = await generateUploadPresignedUrl(r2Key, mimeType, size, 600);

    return NextResponse.json({ success: true, data: { uploadUrl, r2Key } });
  } catch (error) {
    console.error('POST /api/upload/presign error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
