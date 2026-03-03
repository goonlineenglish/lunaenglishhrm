// Dashboard home — shows all courses accessible to the current user via Three-Gate filter
// Server component; accepts searchParams for search and filter
// Groups courses by program; passes progress data to CourseCard

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getUserAccessibleCourses } from '@/lib/services/access-control-service';
import { getUserProgressMap } from '@/lib/services/progress-service';
import { getUserFavorites } from '@/lib/actions/favorite-actions';
import { CourseCard } from '@/components/dashboard/course-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { DashboardSearchBar } from '@/components/dashboard/dashboard-search-bar';
import type { Role } from '@/lib/types/user';

// Page title by role
const PAGE_TITLES: Record<Role, string> = {
  ADMIN: 'Tất cả khóa học',
  MANAGER: 'Khóa học của tôi',
  TEACHER: 'Khóa học của tôi',
  TEACHING_ASSISTANT: 'Khóa học của tôi',
};

interface DashboardPageProps {
  searchParams: Promise<{
    search?: string;
    program?: string;
    status?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { search, program, status } = await searchParams;
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const [allCourses, progressMap, favorites] = await Promise.all([
    getUserAccessibleCourses(user.sub, user.role),
    getUserProgressMap(user.sub),
    getUserFavorites(user.sub),
  ]);

  const favoritedCourseIds = new Set(favorites.map((f) => f.courseId));

  // Show ADVANCED level badge only for roles that can see it
  const canSeeAdvanced = user.role === 'ADMIN' || user.role === 'TEACHER';

  // Client-side-style filtering (all courses already fetched)
  let filtered = allCourses;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
  }

  if (program) {
    filtered = filtered.filter((c) => c.programId === program);
  }

  if (status && status !== 'all') {
    filtered = filtered.filter((c) => {
      const lessonIds = c.lessonIds ?? [];
      const lessonCount = lessonIds.length;
      if (lessonCount === 0) return status === 'not_started';
      const completedCount = lessonIds.filter((id) => progressMap[id]?.completed).length;
      if (status === 'completed') return completedCount >= lessonCount;
      if (status === 'in_progress') return completedCount > 0 && completedCount < lessonCount;
      return completedCount === 0; // not_started
    });
  }

  // Build unique programs for filter dropdown
  const programs = Array.from(
    new Map(allCourses.map((c) => [c.programId, c.program.name])).entries()
  ).map(([id, name]) => ({ id, name }));

  // Group courses by program name
  const byProgram = filtered.reduce<Record<string, typeof filtered>>(
    (acc, course) => {
      const key = course.program.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(course);
      return acc;
    },
    {}
  );

  const programGroups = Object.entries(byProgram);
  const pageTitle = PAGE_TITLES[user.role];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {filtered.length === 0
              ? 'Không có khóa học nào'
              : `${filtered.length} khóa học`}
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <DashboardSearchBar programs={programs} />

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {programGroups.map(([programName, programCourses]) => (
            <section key={programName}>
              <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                {programName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programCourses.map((course) => {
                  const lessonIds = course.lessonIds ?? [];
                  const lessonCount = lessonIds.length;
                  const completedCount = lessonIds.filter((id) => progressMap[id]?.completed).length;
                  const completionRatio = lessonCount > 0 ? completedCount / lessonCount : 0;
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      showLevelBadge={canSeeAdvanced}
                      isFavorited={favoritedCourseIds.has(course.id)}
                      completionRatio={completionRatio}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
