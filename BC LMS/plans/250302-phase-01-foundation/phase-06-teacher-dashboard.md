---
phase: 6
title: "Teacher Dashboard"
status: pending
effort: 5h
depends_on: [phase-03, phase-04, phase-05]
blocks: [phase-07]
---

# Phase 06: Teacher Dashboard

## Context Links

- [System Architecture - Three-Gate Access](../../docs/system-architecture.md)
- [Design Guidelines - Empty States, Course Card](../../docs/design-guidelines.md)
- [Decisions Doc - Revocation Pattern](../../docs/quiet-coalescing-marshmallow.md)

## Overview

**Priority**: High
**Status**: Pending
**Description**: Build the teacher/manager/TA dashboard showing enrolled courses through Three-Gate access control. Includes course cards, empty state, logout button, and role-appropriate navigation.

## Key Insights

- Dashboard at `/(dashboard)/page.tsx` -- accessible by MANAGER, TEACHER, TEACHING_ASSISTANT
- Three-Gate query: show courses where user has UserProgram + Enrollment + CourseLevel allowed
- MANAGER and TA only see BASIC courses; TEACHER sees both BASIC and ADVANCED
- Empty state when 0 courses: "No courses -- contact administrator"
- Course card: title, program name, lesson count (progress bar added in Phase 2)
- Logout button in header clears session + cookie
- ADMIN redirected to /admin (handled by middleware)

## Requirements

### Functional
- Display courses the user can access (Three-Gate filter)
- Group courses by program
- Course card: title, description, lesson count, level badge
- Empty state with CTA message
- Logout button in header
- User name + role displayed in header
- Navigation sidebar (dashboard, lesson plans placeholder)

### Non-Functional
- Dashboard loads <2s with <10 courses
- Mobile responsive (360px min, single column)
- Grid: 1 col mobile, 2 col tablet, 3 col desktop
- Skeleton loading state

## Architecture

### Three-Gate Dashboard Query
```typescript
// Step 1: Get user's program IDs
const userPrograms = await prisma.userProgram.findMany({
  where: { userId },
  select: { programId: true },
});
const programIds = userPrograms.map(up => up.programId);

// Step 2: Get user's enrolled courses in those programs
const enrollments = await prisma.enrollment.findMany({
  where: { userId, course: { programId: { in: programIds }, isDeleted: false } },
  include: {
    course: {
      include: {
        program: { select: { name: true, slug: true } },
        _count: { select: { lessons: { where: { isDeleted: false } } } },
      },
    },
  },
});

// Step 3: Filter by CourseLevel (Gate 3)
const courses = enrollments
  .map(e => e.course)
  .filter(course => {
    if (course.level === 'BASIC') return true;
    return ['ADMIN', 'TEACHER'].includes(userRole);
  });
```

### Page Structure
```
/(dashboard)/
├── layout.tsx           -- Dashboard layout with sidebar + header
├── page.tsx             -- Dashboard home: enrolled courses
└── components/
    (reuse from components/)
```

## Related Code Files

### Create
- `app/(dashboard)/layout.tsx` -- Dashboard layout
- `app/(dashboard)/page.tsx` -- Dashboard home
- `components/dashboard/course-card.tsx` -- Course card component
- `components/dashboard/empty-courses.tsx` -- Empty state
- `components/dashboard/dashboard-header.tsx` -- Header with user info
- `components/dashboard/dashboard-sidebar.tsx` -- Navigation sidebar
- `components/shared/logout-button.tsx` -- Logout button
- `lib/actions/dashboard-actions.ts` -- Dashboard data fetching
- `lib/services/access-control-service.ts` -- Three-Gate check

## Implementation Steps

### 1. Create access control service (`lib/services/access-control-service.ts`)
```typescript
import { prisma } from '@/lib/prisma';
import type { Role } from '@/lib/types/user';

const ADVANCED_ROLES: Role[] = ['ADMIN', 'TEACHER'];

export function canAccessCourseLevel(role: Role, level: string): boolean {
  if (level === 'BASIC') return true;
  return ADVANCED_ROLES.includes(role);
}

export async function getUserAccessibleCourses(userId: string, role: Role) {
  // Get programs user belongs to
  const userPrograms = await prisma.userProgram.findMany({
    where: { userId },
    select: { programId: true },
  });
  const programIds = userPrograms.map(up => up.programId);

  if (programIds.length === 0) return [];

  // Get enrolled courses in those programs
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      course: {
        programId: { in: programIds },
        isDeleted: false,
        program: { isDeleted: false },
      },
    },
    include: {
      course: {
        include: {
          program: { select: { id: true, name: true, slug: true } },
          _count: { select: { lessons: { where: { isDeleted: false } } } },
        },
      },
    },
  });

  // Apply CourseLevel gate
  return enrollments
    .map(e => e.course)
    .filter(c => canAccessCourseLevel(role, c.level));
}
```

### 2. Create dashboard actions (`lib/actions/dashboard-actions.ts`)
```typescript
'use server';

import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getUserAccessibleCourses } from '@/lib/services/access-control-service';

export async function getDashboardCourses() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  return {
    success: true,
    data: await getUserAccessibleCourses(user.sub, user.role),
  };
}
```

### 3. Create dashboard layout (`app/(dashboard)/layout.tsx`)
- Server component: get authenticated user
- Sidebar with navigation links
- Header with user name, role badge, logout button
- Main content area

### 4. Create dashboard page (`app/(dashboard)/page.tsx`)
- Server component: fetch accessible courses
- Group courses by program
- Render course cards in grid
- If 0 courses, render empty state

### 5. Create course card (`components/dashboard/course-card.tsx`)
```tsx
interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    level: CourseLevel;
    type: CourseType;
    program: { name: string };
    _count: { lessons: number };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="hover:border-indigo-300 transition">
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle className="text-lg">{course.title}</CardTitle>
          <CourseLevelBadge level={course.level} />
        </div>
        <p className="text-sm text-neutral-500">{course.program.name}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 line-clamp-2">{course.description}</p>
        <p className="text-sm text-neutral-500 mt-2">{course._count.lessons} bai hoc</p>
      </CardContent>
    </Card>
  );
}
```

### 6. Create empty state (`components/dashboard/empty-courses.tsx`)
```tsx
export function EmptyCourses() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BookOpenIcon className="h-12 w-12 text-neutral-300 mb-4" />
      <h3 className="text-lg font-semibold text-neutral-900">Chua co khoa hoc</h3>
      <p className="text-neutral-600 mt-1">Lien he quan tri vien de duoc dang ky khoa hoc</p>
    </div>
  );
}
```

### 7. Create logout button (`components/shared/logout-button.tsx`)
```tsx
'use client';

export function LogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };
  return (
    <Button variant="ghost" onClick={handleLogout}>Dang xuat</Button>
  );
}
```

### 8. Create dashboard sidebar (`components/dashboard/dashboard-sidebar.tsx`)
- Links: Dashboard (home), (Lesson Plans -- disabled, Phase 3)
- For Manager: future link to Reports
- Active link indicator

### 9. Create dashboard header (`components/dashboard/dashboard-header.tsx`)
- User name display
- Role badge
- Logout button
- Mobile hamburger menu toggle

## Todo List

- [ ] Create access control service (Three-Gate)
- [ ] Create dashboard actions
- [ ] Create dashboard layout (sidebar + header)
- [ ] Create dashboard page (course grid)
- [ ] Create course card component
- [ ] Create empty state component
- [ ] Create logout button
- [ ] Create dashboard sidebar
- [ ] Create dashboard header
- [ ] Verify Three-Gate filtering works
- [ ] Verify TA cannot see ADVANCED courses
- [ ] Verify empty state shows when 0 courses
- [ ] Verify responsive grid (1/2/3 columns)
- [ ] Verify logout clears session + redirects

## Success Criteria

- Dashboard shows only courses passing all 3 gates
- TA sees BASIC courses only (ADVANCED hidden)
- Teacher sees both BASIC and ADVANCED
- Empty state displayed when no courses enrolled
- Course cards show title, program, lesson count, level badge
- Logout clears session + cookie, redirects to /login
- Dashboard responsive: 1 col on mobile, 3 on desktop
- Dashboard loads <2s with <10 courses

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Complex Three-Gate query slow | Indexed queries on userId, programId; small dataset (~100 users) |
| Stale data after program revocation | Server component fetches fresh data on each load |
| Mobile layout overflow | Grid with responsive breakpoints, test at 360px |

## Security Considerations

- Dashboard only accessible to authenticated users (middleware)
- Course data filtered by access control service -- no data leakage
- User ID from JWT payload, not from client request
- Logout invalidates session in DB for immediate effect
