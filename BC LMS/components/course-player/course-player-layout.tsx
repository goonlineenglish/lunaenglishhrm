'use client';

// CoursePlayerLayout — sidebar + content two-column layout for course player
// Manages active lesson selection state; calls API to update progress on mark-complete

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonSidebar } from './lesson-sidebar';
import { VideoPlayer } from './video-player';
import { DrmZone } from './drm-zone';
import type { CourseDetail, LessonItem } from '@/lib/types/course';
import type { ProgressMap } from '@/lib/types/progress';

interface CoursePlayerLayoutProps {
  course: CourseDetail;
  initialLessonId: string;
  progressMap: ProgressMap;
  userEmail: string;
}

export function CoursePlayerLayout({
  course,
  initialLessonId,
  progressMap: initialProgressMap,
  userEmail,
}: CoursePlayerLayoutProps) {
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId);
  const [progressMap, setProgressMap] = useState<ProgressMap>(initialProgressMap);

  const lessons = course.lessons.filter((l) => !l.isDeleted);
  const activeLesson: LessonItem | undefined = lessons.find((l) => l.id === activeLessonId);
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

  async function markComplete(lessonId: string) {
    try {
      const csrfToken =
        document.cookie
          .split('; ')
          .find((c) => c.startsWith('csrf-token='))
          ?.split('=')[1] ?? '';

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ lessonId, watchedTime: 0, completed: true }),
      });

      if (res.ok) {
        const json = await res.json();
        setProgressMap((prev) => ({ ...prev, [lessonId]: json.data }));
      }
    } catch {
      // silent — progress updates are best-effort
    }
  }

  if (!activeLesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Không tìm thấy bài học</p>
      </div>
    );
  }

  const isCompleted = !!progressMap[activeLessonId]?.completed;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <LessonSidebar
        lessons={lessons}
        activeLessonId={activeLessonId}
        progressMap={progressMap}
        onSelect={setActiveLessonId}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Lesson title */}
        <div>
          <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">
            {course.program.name} &mdash; {course.title}
          </p>
          <h1 className="text-xl font-bold text-neutral-900">{activeLesson.title}</h1>
        </div>

        {/* DRM-protected video + content */}
        <DrmZone userEmail={userEmail}>
          {/* Video */}
          {activeLesson.videoUrl && (
            <VideoPlayer videoUrl={activeLesson.videoUrl} title={activeLesson.title} />
          )}

          {/* Content */}
          {activeLesson.content && (
            <div
              className="prose prose-sm max-w-none text-neutral-700 mt-5"
              dangerouslySetInnerHTML={{ __html: activeLesson.content }}
            />
          )}
        </DrmZone>

        {/* Mark complete + navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevLesson}
            onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Bài trước
          </Button>

          {!isCompleted && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => markComplete(activeLessonId)}
            >
              Đánh dấu hoàn thành
            </Button>
          )}
          {isCompleted && (
            <span className="text-sm text-green-600 font-medium">Đã hoàn thành</span>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={!nextLesson}
            onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
          >
            Bài tiếp
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
