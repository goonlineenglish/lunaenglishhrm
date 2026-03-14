'use client';

// Materials list — displays downloadable lesson materials for teachers

import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Image as ImageIcon, Music, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MaterialItem } from '@/lib/types/material';

interface MaterialsListProps {
  materials: MaterialItem[];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-orange-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialsList({ materials }: MaterialsListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(material: MaterialItem) {
    setDownloadingId(material.id);
    try {
      const res = await fetch(`/api/materials/${material.id}/download`);
      const data = await res.json();

      if (res.ok && data.success) {
        window.open(data.data.downloadUrl, '_blank');
      } else {
        toast.error(data.error ?? 'Không thể tải tài liệu');
      }
    } catch {
      toast.error('Lỗi tải tài liệu');
    } finally {
      setDownloadingId(null);
    }
  }

  if (materials.length === 0) return null;

  return (
    <div className="mt-5 pt-4 border-t border-neutral-200">
      <h3 className="text-sm font-semibold text-neutral-700 mb-3">
        Tài liệu đính kèm ({materials.length})
      </h3>
      <ul className="space-y-2">
        {materials.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-lg">
            {getFileIcon(m.mimeType)}
            <span className="flex-1 text-sm truncate text-neutral-700">{m.filename}</span>
            <span className="text-xs text-neutral-400 shrink-0">{formatSize(m.size)}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              onClick={() => handleDownload(m)}
              disabled={downloadingId === m.id}
            >
              {downloadingId === m.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
