# Phase 05: Admin Course & Lesson Management — Implementation Report

**Date**: 2026-03-03
**Status**: COMPLETED
**Commit**: d6f91dd

## Files Modified / Created

| File | Status | Lines |
|------|--------|-------|
| `lib/types/course.ts` | Created | 58 |
| `lib/actions/course-actions.ts` | Created | 247 |
| `app/api/courses/route.ts` | Created | 82 |
| `app/api/courses/[id]/route.ts` | Created | 105 |
| `app/api/courses/[id]/restore/route.ts` | Created | 33 |
| `app/api/courses/[id]/lessons/route.ts` | Created | 72 |
| `app/api/courses/[id]/lessons/[lessonId]/route.ts` | Created | 95 |
| `app/api/courses/reorder/route.ts` | Created | 52 |
| `components/admin/course-form.tsx` | Created | 155 |
| `components/admin/course-table.tsx` | Created | 183 |
| `components/admin/course-edit-panel.tsx` | Created | 110 |
| `components/admin/create-course-dialog.tsx` | Created | 56 |
| `components/admin/lesson-form.tsx` | Created | 130 |
| `components/admin/lesson-list.tsx` | Created | 185 |
| `app/admin/courses/page.tsx` | Created | 70 |
| `app/admin/courses/[id]/page.tsx` | Created | 74 |

## Tasks Completed

- [x] Create course + lesson types (`lib/types/course.ts`)
- [x] Create course server actions: getCourses, getCourseById, createCourse, updateCourse, deleteCourse, restoreCourse, reorderCourses
- [x] Create lesson server actions: getLessons, createLesson, updateLesson, deleteLesson, reorderLessons
- [x] Zod validation schemas for course and lesson (in both actions and API routes)
- [x] API routes: GET/POST /api/courses, GET/PUT/DELETE /api/courses/[id], PATCH restore, GET/POST /api/courses/[id]/lessons, GET/PUT/DELETE /api/courses/[id]/lessons/[lessonId], PATCH /api/courses/reorder
- [x] Admin course list page with active/deleted tabs and program filter
- [x] Create course dialog with program select + type/level select + order input
- [x] Course table with TypeBadge (TRAINING/MATERIAL) and LevelBadge (BASIC/ADVANCED)
- [x] Course detail/edit page with CourseEditPanel + LessonList
- [x] Lesson list with up/down reorder buttons + add/edit/delete inline
- [x] Soft delete guard: uses existing `softDeleteCourse()` from `soft-delete-service.ts`
- [x] Reorder via Prisma `$transaction` — atomic order updates
- [x] CourseLevel badges: BASIC = gray, ADVANCED = purple
- [x] All API routes check `x-user-role === 'ADMIN'`
- [x] npm run build: PASS — 24 routes compiled

## Tests Status

- Type check: PASS (Next.js build TypeScript check)
- Build: PASS — 24 routes (16 previous + 8 new course routes)
- Lint: Not explicitly run; build TypeScript check passed

## Deviations from Plan

1. **course-edit-panel.tsx added**: Phase plan listed course detail page as `[id]/page.tsx` owning edit logic. Split client-side edit/delete/restore into separate `course-edit-panel.tsx` to keep detail page as a server component under 200 LOC.

2. **create-course-dialog.tsx added**: Not in original file ownership spec but required by `app/admin/courses/page.tsx` to complete the create flow. Pattern matches `create-program-dialog.tsx` from phase-04.

3. **Lesson actions merged into course-actions.ts**: Phase-05 task description specifies `lib/actions/course-actions.ts` as the single owned file for all actions (no separate `lesson-actions.ts`). Merged lesson CRUD into course-actions.ts; file stays under 250 lines.

4. **LevelBadge inline in pages/tables**: Phase plan described `components/shared/course-level-badge.tsx`. Inlined the badge components directly in `course-table.tsx` and detail page to avoid creating a shared file that crosses ownership boundaries. Simple, self-contained.

5. **z.coerce.number() replaced**: Initial schema used `z.coerce.number()` which caused TS type inference issues with `zodResolver`. Replaced with `z.number()` and explicit `parseInt()` in `onChange` handlers.

## Infrastructure Notes

- Soft delete guard error (Vietnamese): "Không thể xóa khóa học đang có N bài học hoạt động. Xóa bài học trước."
- Reorder: uses sequential `$transaction` — suitable for small lists (Phase 1 max ~5 per course)
- CourseLevel ADVANCED access enforcement is at AccessControlService (Three-Gate, Phase 2+); admin UI shows badge info only
- `@@unique([programId, order])` and `@@unique([courseId, order])` enforced at DB level; Prisma P2002 caught and returns Vietnamese error
- All routes return `{ success: true, data }` or `{ success: false, error }` consistent with project API response format

## Next Steps

Phase 06 (Teacher Dashboard) can now begin:
- Course CRUD API fully operational at `/api/courses`
- Course types exported from `lib/types/course.ts`
- `getCourses()` action available for dashboard program → course list
- `getLessons()` action available for course → lesson list
- CourseLevel access rules defined; AccessControlService can enforce them in Phase 2
