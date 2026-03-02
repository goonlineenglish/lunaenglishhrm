// Course player page — loads course, lessons, and user progress
// Server component; enforces auth + three-gate access control

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { canAccessCourse } from '@/lib/services/access-control-service';
import { getCourseById } from '@/lib/actions/course-actions';
import { getCourseProgress } from '@/lib/services/progress-service';
import { CoursePlayerLayout } from '@/components/course-player/course-player-layout';
import type { ProgressMap } from '@/lib/types/progress';

interface CoursePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

export default async function CoursePlayerPage({ params, searchParams }: CoursePageProps) {
  const { id } = await params;
  const { lesson: lessonParam } = await searchParams;

  // Auth check
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  // Three-gate access check
  const hasAccess = await canAccessCourse(user.sub, id, user.role);
  if (!hasAccess) redirect('/dashboard');

  // Load course with lessons
  const course = await getCourseById(id);
  if (!course) redirect('/dashboard');

  const activeLessons = course.lessons.filter((l) => !l.isDeleted);
  if (activeLessons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Khóa học chưa có bài học nào</p>
      </div>
    );
  }

  // Determine initial lesson: from ?lesson= param, or first lesson
  const requestedLesson = lessonParam
    ? activeLessons.find((l) => l.id === lessonParam)
    : null;
  const initialLesson = requestedLesson ?? activeLessons[0];

  // Load user progress for this course
  const progressItems = await getCourseProgress(user.sub, id);
  const progressMap: ProgressMap = progressItems.reduce((acc, p) => {
    acc[p.lessonId] = p;
    return acc;
  }, {} as ProgressMap);

  return (
    <div className="h-full -m-6 overflow-hidden">
      <CoursePlayerLayout
        course={course}
        initialLessonId={initialLesson.id}
        progressMap={progressMap}
        userEmail={user.email}
      />
    </div>
  );
}
