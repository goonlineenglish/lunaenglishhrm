'use client';

// VideoPlayer — embeds Google Drive or YouTube videos via iframe
// Handles URL type detection to pick the correct embed format

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

/** Convert Google Drive share URL to embed URL */
function toGoogleDriveEmbed(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view → /preview
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return null;
}

/** Convert YouTube watch URL to embed URL */
function toYouTubeEmbed(url: string): string | null {
  // https://youtu.be/ID or https://www.youtube.com/watch?v=ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([^&]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return null;
}

function getEmbedUrl(url: string): string | null {
  if (url.includes('drive.google.com')) return toGoogleDriveEmbed(url);
  if (url.includes('youtube.com') || url.includes('youtu.be')) return toYouTubeEmbed(url);
  // Already an embed URL or unknown — return as-is
  return url;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const embedUrl = getEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-neutral-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-neutral-500">Không thể tải video</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
