// R2 Storage Service — presigned URLs, validation, file management

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/lib/r2-client';

const BUCKET = process.env.R2_BUCKET_NAME ?? 'bc-lms-materials';

// Allowed MIME types — PDF, images, audio (NO video in GĐ1)
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

// Max file size: 100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Build R2 object key from course/lesson context.
 * Format: materials/{courseId}/{lessonId}/{timestamp}-{sanitized-filename}
 */
export function buildR2Key(courseId: string, lessonId: string, filename: string): string {
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
  const timestamp = Date.now();
  return `materials/${courseId}/${lessonId}/${timestamp}-${sanitized}`;
}

/**
 * Validate file input before upload.
 * Returns error message or null if valid.
 */
export function validateFileInput(
  filename: string,
  mimeType: string,
  size: number
): string | null {
  if (!filename || filename.trim().length === 0) {
    return 'Tên file không được để trống';
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `Loại file không được hỗ trợ: ${mimeType}. Chỉ hỗ trợ PDF, ảnh, và audio.`;
  }
  if (size <= 0) {
    return 'Kích thước file không hợp lệ';
  }
  if (size > MAX_FILE_SIZE) {
    return `File quá lớn (${Math.round(size / 1024 / 1024)}MB). Giới hạn: 100MB.`;
  }
  return null;
}

/**
 * Generate a presigned PUT URL for direct client upload to R2.
 * ContentLength is enforced to prevent client uploading larger file than validated.
 */
export async function generateUploadPresignedUrl(
  r2Key: string,
  contentType: string,
  contentLength: number,
  expiresIn = 600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a presigned GET URL for secure file download.
 * Sets ResponseContentDisposition to force browser download instead of inline render.
 */
export async function generateDownloadPresignedUrl(
  r2Key: string,
  filename: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Delete an object from R2.
 * Idempotent — logs warning if object not found but does not throw.
 */
export async function deleteR2Object(r2Key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
    });
    await r2Client.send(command);
  } catch (error) {
    console.warn(`deleteR2Object: object not found or already deleted — key: ${r2Key}`, error);
  }
}

/**
 * Verify an object exists in R2 via HeadObject.
 * Returns true if object exists, false otherwise.
 */
export async function headR2Object(r2Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
    });
    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}
