---
phase: 5
title: "Admin Course & Lesson Management"
status: pending
effort: 7h
depends_on: [phase-02, phase-04]
blocks: [phase-06]
---

# Phase 05: Admin Course & Lesson Management

## Context Links

- [System Architecture - Access Control](../../docs/system-architecture.md)
- [Design Guidelines - Course Level Badge](../../docs/design-guidelines.md)
- [Codebase Summary - Course/Lesson Models](../../docs/codebase-summary.md)

## Overview

**Priority**: High
**Status**: Pending
**Description**: Build admin CRUD for courses (per program, with type/level/order) and nested lesson management (title, content placeholder, videoUrl, order). Includes reordering, soft delete with child guard, and CourseLevel badges.

## Key Insights

- Course belongs to Program (required FK)
- Course has `type` (TRAINING | MATERIAL) and `level` (BASIC | ADVANCED)
- Course `order` is unique per program: `@@unique([programId, order])`
- Lesson `order` is unique per course: `@@unique([courseId, order])`
- Soft delete guard: cannot delete course with active lessons
- CourseLevel badge: BASIC = gray, ADVANCED = purple
- Lessons in Phase 1 are stubs -- content/video populated in Phase 2

## Requirements

### Functional
- List courses per program (filterable by program)
- Create course: title, description, type, level, order, programId
- Edit course fields
- Reorder courses within a program
- Soft delete course (blocked if active lessons exist)
- Restore soft-deleted course
- Nested lesson management (add/edit/delete/reorder within course)
- Create lesson: title, order (content/videoUrl optional in Phase 1)

### Non-Functional
- Order uniqueness enforced at DB level
- Reordering uses transactions to swap order values
- Max 5 items for testing purposes (no hard limit in schema)

## Architecture

### Page Structure
```
/admin/courses/
├── page.tsx                -- Server component: course list
├── course-table.tsx        -- Client component: course data table
├── course-form-dialog.tsx  -- Client component: create/edit course
└── lesson-list.tsx         -- Client component: lessons within course
```

### Reorder Flow
```
Admin drags course from position 2 to 4
  -> Transaction:
     1. Temporarily set dragged course order to -1
     2. Shift courses between old and new positions
     3. Set dragged course order to new position
  -> revalidatePath('/admin/courses')
```

## Related Code Files

### Create
- `app/admin/courses/page.tsx` -- Course list page
- `components/admin/course-table.tsx` -- Course data table
- `components/admin/course-form-dialog.tsx` -- Create/edit course dialog
- `components/admin/lesson-list.tsx` -- Inline lesson management
- `components/admin/lesson-form-dialog.tsx` -- Create/edit lesson dialog
- `components/shared/course-level-badge.tsx` -- BASIC/ADVANCED badge
- `lib/actions/course-actions.ts` -- Course CRUD actions
- `lib/actions/lesson-actions.ts` -- Lesson CRUD actions
- `lib/types/course.ts` -- Course + Lesson types

## Implementation Steps

### 1. Create course types (`lib/types/course.ts`)
```typescript
export type CourseLevel = 'BASIC' | 'ADVANCED';
export type CourseType = 'TRAINING' | 'MATERIAL';

export type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  type: CourseType;
  level: CourseLevel;
  order: number;
  isDeleted: boolean;
  programId: string;
  program: { name: string; slug: string };
  _count: { lessons: number; enrollments: number };
};

export type LessonListItem = {
  id: string;
  title: string;
  order: number;
  duration: number | null;
  isDeleted: boolean;
  courseId: string;
};

export type CreateCourseInput = {
  programId: string;
  title: string;
  description?: string;
  type: CourseType;
  level: CourseLevel;
  order: number;
};

export type CreateLessonInput = {
  courseId: string;
  title: string;
  order: number;
  duration?: number;
  content?: string;
  videoUrl?: string;
};
```

### 2. Create course server actions (`lib/actions/course-actions.ts`)
```typescript
'use server';

export async function getCourses(params: { programId?: string; showDeleted?: boolean }) {
  return prisma.course.findMany({
    where: {
      isDeleted: params.showDeleted ?? false,
      ...(params.programId ? { programId: params.programId } : {}),
    },
    include: {
      program: { select: { name: true, slug: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
  });
}

export async function createCourse(input: CreateCourseInput) {
  // Zod validate
  // Check order uniqueness within program
  // prisma.course.create()
}

export async function updateCourse(id: string, input: Partial<CreateCourseInput>) {
  // Validate, update
}

export async function reorderCourses(programId: string, orderedIds: string[]) {
  // Transaction: update order for each course
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.course.update({ where: { id }, data: { order: index + 1 } })
    )
  );
}

export async function softDeleteCourse(id: string) {
  // Call canSoftDeleteCourse() guard
  // If blocked, return error
  // prisma.course.update({ data: { isDeleted: true } })
}

export async function restoreCourse(id: string) {
  // prisma.course.update({ data: { isDeleted: false } })
}
```

### 3. Create lesson server actions (`lib/actions/lesson-actions.ts`)
```typescript
'use server';

export async function getLessons(courseId: string, showDeleted = false) {
  return prisma.lesson.findMany({
    where: { courseId, isDeleted: showDeleted },
    orderBy: { order: 'asc' },
  });
}

export async function createLesson(input: CreateLessonInput) {
  // Zod validate
  // prisma.lesson.create()
}

export async function updateLesson(id: string, input: Partial<CreateLessonInput>) {
  // Validate, update
}

export async function softDeleteLesson(id: string) {
  // prisma.lesson.update({ data: { isDeleted: true } })
}

export async function restoreLesson(id: string) {
  // prisma.lesson.update({ data: { isDeleted: false } })
}

export async function reorderLessons(courseId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { order: index + 1 } })
    )
  );
}
```

### 4. Create Zod validation schemas
```typescript
const createCourseSchema = z.object({
  programId: z.string().min(1),
  title: z.string().min(2, 'Tieu de khoa hoc qua ngan'),
  description: z.string().optional(),
  type: z.enum(['TRAINING', 'MATERIAL']),
  level: z.enum(['BASIC', 'ADVANCED']).default('BASIC'),
  order: z.number().int().positive(),
});

const createLessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(2, 'Tieu de bai hoc qua ngan'),
  order: z.number().int().positive(),
  duration: z.number().int().positive().optional(),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
});
```

### 5. Create course level badge (`components/shared/course-level-badge.tsx`)
```tsx
export function CourseLevelBadge({ level }: { level: CourseLevel }) {
  return (
    <Badge className={level === 'ADVANCED' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
      {level === 'ADVANCED' ? 'Nang cao' : 'Co ban'}
    </Badge>
  );
}
```

### 6. Create course list page (`app/admin/courses/page.tsx`)
- Server component: fetch courses + programs for filter dropdown
- Program filter dropdown
- "Da xoa" tab toggle
- Render `<CourseTable />`

### 7. Create course table (`components/admin/course-table.tsx`)
- Columns: Order, Title, Program, Type, Level (badge), Lessons (count), Actions
- Actions: Edit, Delete (with guard), Lessons (expand), Restore
- Expandable row shows lesson list inline

### 8. Create course form dialog (`components/admin/course-form-dialog.tsx`)
- Fields: program (select), title, description, type (select), level (select), order
- Auto-suggest next order number for program

### 9. Create lesson list component (`components/admin/lesson-list.tsx`)
- Inline list within course row
- Add lesson button + reorder support
- Each lesson: title, order, duration, actions (edit/delete)

### 10. Create lesson form dialog (`components/admin/lesson-form-dialog.tsx`)
- Fields: title, order, duration (optional)
- Content and videoUrl fields present but optional in Phase 1

## Todo List

- [ ] Create course + lesson types
- [ ] Create course server actions
- [ ] Create lesson server actions
- [ ] Create Zod schemas for course + lesson
- [ ] Create course level badge component
- [ ] Create course list page
- [ ] Create course table component
- [ ] Create course form dialog
- [ ] Create lesson list component
- [ ] Create lesson form dialog
- [ ] Verify course creation with order enforcement
- [ ] Verify reordering preserves uniqueness
- [ ] Verify soft delete guard blocks when lessons exist
- [ ] Verify CourseLevel badges display correctly

## Success Criteria

- Admin creates course linked to program with type + level
- Course order maintained after save
- Duplicate order within program returns error
- Reordering courses updates order field correctly
- Soft delete blocked when active lessons exist
- Admin can add lessons to course (max 5 for testing)
- Course level badges show Co ban / Nang cao
- Lesson reordering works within course

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Order conflict during reorder | Transaction ensures atomic order swap |
| Orphaned lessons after course delete | Service guard prevents deletion with active lessons |
| Large lesson lists | Phase 1 limited to ~5 per course, pagination later |

## Security Considerations

- Admin-only access (middleware + action-level check)
- Input validated with Zod before DB operations
- Soft delete preserves data integrity
- FK Restrict prevents hard delete of referenced records
