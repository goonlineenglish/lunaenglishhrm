// Generic skeleton component — wraps shadcn/ui Skeleton with convenience variants
// Use for loading states in server-fetched pages

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonBlockProps {
  className?: string;
}

/** Single skeleton line with configurable width/height */
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <Skeleton className={cn('rounded-md', className)} />;
}

/** Skeleton text line — simulates a line of text */
export function SkeletonText({ className }: SkeletonBlockProps) {
  return <Skeleton className={cn('h-4 rounded', className)} />;
}

/** Skeleton heading — taller than text lines */
export function SkeletonHeading({ className }: SkeletonBlockProps) {
  return <Skeleton className={cn('h-6 rounded', className)} />;
}

/** Skeleton avatar / icon circle */
export function SkeletonCircle({ className }: SkeletonBlockProps) {
  return <Skeleton className={cn('rounded-full', className)} />;
}
