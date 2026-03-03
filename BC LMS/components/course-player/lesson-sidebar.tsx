'use client';

// LessonSidebar — scrollable lesson list with completion checkboxes
// Highlights the active lesson; calls onSelect when a lesson is clicked

import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonItem } from '@/lib/types/course';
import type { ProgressMap } from '@/lib/types/progress';

interface LessonSidebarProps {
  lessons: LessonItem[];
  activeLessonId: string;
  progressMap: ProgressMap;
  onSelect: (lessonId: string) => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
}

export function LessonSidebar({
  lessons,
  activeLessonId,
  progressMap,
  onSelect,
}: LessonSidebarProps) {
  return (
    <aside className="w-72 shrink-0 bg-white border-r border-neutral-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700">Danh sách bài học</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {lessons.filter((l) => progressMap[l.id]?.completed).length}/{lessons.length} hoàn thành
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Bài học">
        {lessons.map((lesson, index) => {
          const progress = progressMap[lesson.id];
          const isCompleted = !!progress?.completed;
          const isActive = lesson.id === activeLessonId;

          return (
            <button
              key={lesson.id}
              onClick={() => onSelect(lesson.id)}
              className={cn(
                'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-neutral-50',
                isActive && 'bg-indigo-50 border-l-2 border-indigo-600'
              )}
            >
              {/* Completion icon */}
              <span className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : isActive ? (
                  <PlayCircle className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Circle className="h-4 w-4 text-neutral-300" />
                )}
              </span>

              {/* Lesson info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm leading-snug line-clamp-2',
                    isActive ? 'font-medium text-indigo-700' : 'text-neutral-700'
                  )}
                >
                  {index + 1}. {lesson.title}
                </p>
                {lesson.duration && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatDuration(lesson.duration)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
