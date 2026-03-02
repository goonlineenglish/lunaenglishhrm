'use client';

// FavoriteButton — heart icon toggle button for courses
// Calls toggleFavorite server action; uses optimistic UI update

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorite } from '@/lib/actions/favorite-actions';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  courseId: string;
  initialFavorited?: boolean;
  className?: string;
}

export function FavoriteButton({
  courseId,
  initialFavorited = false,
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    // Prevent triggering parent card link clicks
    e.preventDefault();
    e.stopPropagation();

    const previousState = isFavorited;
    // Optimistic update
    setIsFavorited(!isFavorited);

    startTransition(async () => {
      try {
        const result = await toggleFavorite(courseId);
        if (!result.success) {
          // Revert on failure
          setIsFavorited(previousState);
          toast.error(result.error ?? 'Không thể cập nhật yêu thích');
        } else {
          setIsFavorited(result.isFavorited);
          toast.success(
            result.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
          );
        }
      } catch {
        setIsFavorited(previousState);
        toast.error('Không thể cập nhật yêu thích');
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavorited ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
      className={cn(
        'p-1.5 rounded-full transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        isPending && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorited
            ? 'fill-red-500 text-red-500'
            : 'text-neutral-400 hover:text-red-400'
        )}
      />
    </button>
  );
}
