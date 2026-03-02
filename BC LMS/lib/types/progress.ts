// Progress type definitions — lesson progress tracking for dashboard users

export type ProgressItem = {
  id: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  watchedTime: number; // seconds watched
  updatedAt: Date;
};

// Map of lessonId -> ProgressItem for quick lookup
export type ProgressMap = Record<string, ProgressItem>;

export type UpdateProgressInput = {
  lessonId: string;
  watchedTime: number;
  completed?: boolean;
};

export type ProgressActionResult =
  | { success: true; data: ProgressItem }
  | { success: false; error: string };

// Computed completion status used in dashboard filtering
export type CompletionStatus = 'not_started' | 'in_progress' | 'completed';

/** Derive completion status from a ProgressItem (or absence of it) */
export function getCompletionStatus(
  progress: ProgressItem | undefined,
  totalLessons: number
): CompletionStatus {
  if (!progress && totalLessons === 0) return 'not_started';
  if (!progress) return 'not_started';
  if (progress.completed) return 'completed';
  if (progress.watchedTime > 0) return 'in_progress';
  return 'not_started';
}
