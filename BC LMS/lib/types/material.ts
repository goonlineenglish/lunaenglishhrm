// Material type definitions for R2-stored files

export type MaterialItem = {
  id: string;
  lessonId: string;
  filename: string;
  r2Key: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

export type PresignedUploadResponse = {
  uploadUrl: string;
  r2Key: string;
};

export type MaterialActionResult<T = MaterialItem> =
  | { success: true; data: T }
  | { success: false; error: string };
