// Dashboard home — shows all courses accessible to the current user via Three-Gate filter
// Server component; fetches data directly; groups courses by program for display

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getUserAccessibleCourses } from '@/lib/services/access-control-service';
import { CourseCard } from '@/components/dashboard/course-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import type { Role } from '@/lib/types/user';

// Page title by role
const PAGE_TITLES: Record<Role, string> = {
  ADMIN: 'Tất cả khóa học',
  MANAGER: 'Khóa học của tôi',
  TEACHER: 'Khóa học của tôi',
  TEACHING_ASSISTANT: 'Khóa học của tôi',
};

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const courses = await getUserAccessibleCourses(user.sub, user.role);

  // Show ADVANCED level badge only for roles that can see it
  const canSeeAdvanced = user.role === 'ADMIN' || user.role === 'TEACHER';

  // Group courses by program name
  const byProgram = courses.reduce<Record<string, typeof courses>>(
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {courses.length === 0
            ? 'Không có khóa học nào'
            : `${courses.length} khóa học`}
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {programGroups.map(([programName, programCourses]) => (
            <section key={programName}>
              <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                {programName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    showLevelBadge={canSeeAdvanced}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
