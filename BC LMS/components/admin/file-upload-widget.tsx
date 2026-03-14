'use client';

// File upload widget — drag-and-drop + file picker for admin material upload to R2

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, X, FileText, Image, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirmMaterialUpload, deleteMaterial } from '@/lib/actions/material-actions';
import type { MaterialItem } from '@/lib/types/material';

// Allowed MIME types (must match server-side r2-storage-service.ts)
const ALLOWED_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

interface FileUploadWidgetProps {
  courseId: string;
  lessonId: string;
  existingMaterials: MaterialItem[];
  onMaterialsChange: () => void;
}

// Helper to pick icon by mimeType
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-orange-500" />;
}

// Format bytes to human-readable
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadWidget({
  courseId,
  lessonId,
  existingMaterials,
  onMaterialsChange,
}: FileUploadWidgetProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getCsrfToken = useCallback(() => {
    return document.cookie
      .split('; ')
      .find((c) => c.startsWith('csrf-token='))
      ?.split('=')[1] ?? '';
  }, []);

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      // Client-side validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Loại file không được hỗ trợ`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: File quá lớn (tối đa 100MB)`);
        continue;
      }
      await uploadFile(file);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        toast.error(presignData.error ?? 'Lỗi tạo URL upload');
        return;
      }

      const { uploadUrl, r2Key } = presignData.data;

      // Step 2: Upload to R2 via XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload via server action
      const result = await confirmMaterialUpload({
        lessonId,
        courseId,
        filename: file.name,
        r2Key,
        mimeType: file.type,
        size: file.size,
      });

      if (result.success) {
        toast.success(`Đã tải lên: ${file.name}`);
        onMaterialsChange();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Lỗi upload: ${file.name}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDelete(material: MaterialItem) {
    if (!confirm(`Xóa tài liệu "${material.filename}"?`)) return;
    const result = await deleteMaterial(material.id, courseId);
    if (result.success) {
      toast.success('Đã xóa tài liệu');
      onMaterialsChange();
    } else {
      toast.error(result.error ?? 'Xóa thất bại');
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Tài liệu đính kèm</p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Đang tải lên... {progress}%</p>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-6 w-6 text-gray-400" />
            <p className="text-sm text-gray-500">Kéo thả file vào đây hoặc nhấn để chọn</p>
            <p className="text-xs text-gray-400">PDF, ảnh, audio — tối đa 100MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Existing materials list */}
      {existingMaterials.length > 0 && (
        <ul className="space-y-1">
          {existingMaterials.map((m) => (
            <li key={m.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              {getFileIcon(m.mimeType)}
              <span className="flex-1 truncate">{m.filename}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(m.size)}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                onClick={() => handleDelete(m)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
