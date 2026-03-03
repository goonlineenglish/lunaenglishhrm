# Phase 03 — Lesson Plan Builder Implementation Report

**Date:** 2026-03-03
**Status:** Completed
**Build:** Pass (all 22 routes compiled)
**Tests:** 52/52 pass

---

## Files Created

### Types
- `lib/types/lesson-plan.ts` — LessonPlanItem, CreateLessonPlanInput, UpdateLessonPlanInput, LessonPlanFilterParams

### Constants
- `lib/constants/lesson-plan-templates.ts` — BUTTERCUP_DEFAULT_TEMPLATE, PRIMARY_SUCCESS_DEFAULT_TEMPLATE, getDefaultTemplate()

### Server Actions
- `lib/actions/template-actions.ts` — getTemplate, updateTemplate, getAllProgramsForTemplates
- `lib/actions/lesson-plan-actions.ts` — getLessonPlans, getLessonPlanById, createLessonPlan, updateLessonPlan, deleteLessonPlan

### Tiptap Components
- `components/tiptap/tiptap-editor.tsx` — Rich text editor (StarterKit + Table extensions, editable prop)
- `components/tiptap/tiptap-menu-bar.tsx` — Toolbar: Bold, Italic, H1-H3, BulletList, OrderedList, Table insert/row/col ops
- `components/tiptap/tiptap-viewer.tsx` — Read-only Tiptap JSON renderer

### Lesson Plan Components
- `components/lesson-plan/lesson-plan-table.tsx` — Table with delete/edit actions, optimistic UI
- `components/lesson-plan/new-plan-form.tsx` — Program select + title input, redirect on create
- `components/lesson-plan/lesson-plan-editor-page.tsx` — Auto-save (30s interval), manual save, last-saved timestamp
- `components/lesson-plan/export-button.tsx` — window.print() export, TEACHER role only

### Admin Pages
- `app/admin/templates/page.tsx` — Program list with template status + edit links
- `app/admin/templates/[programId]/page.tsx` — Template editor shell (server)
- `app/admin/templates/[programId]/template-editor-client.tsx` — Client editor with save/init-default buttons

### Dashboard Pages
- `app/(dashboard)/lesson-plans/page.tsx` — List plans with search/filter (GET-based form)
- `app/(dashboard)/lesson-plans/new/page.tsx` — New plan form (scoped to user's programs)
- `app/(dashboard)/lesson-plans/[id]/page.tsx` — Editor page with ownership check
- `app/(dashboard)/templates/[programId]/page.tsx` — Read-only template viewer (all roles)

## Files Modified

- `components/dashboard/dashboard-sidebar.tsx` — Fixed hrefs from `/dashboard/lesson-plans` to `/lesson-plans`; updated label to "Kế hoạch dạy học"
- `components/admin/admin-sidebar.tsx` — Added Templates nav item (`/admin/templates`)
- `app/globals.css` — Added `@media print` styles (hide `.no-print`, aside, nav, header)
- `tests/soft-delete.test.ts` — Fixed pre-existing type errors caused by Prisma v7 strict typing (mock objects cast `as unknown as Awaited<ReturnType<...>>`)

## Tasks Completed

- [x] Tiptap packages verified installed (v3.20.0)
- [x] lib/types/lesson-plan.ts
- [x] TiptapEditor with table support
- [x] TiptapMenuBar (Bold/Italic/H1-H3/Lists/Table ops)
- [x] TiptapViewer (read-only)
- [x] template-actions.ts (getTemplate, updateTemplate, getAllProgramsForTemplates)
- [x] lesson-plan-actions.ts (full CRUD + ownership security)
- [x] Admin template list page
- [x] Admin template editor page (with default template init)
- [x] LessonPlanTable component
- [x] NewPlanForm component
- [x] LessonPlanEditorPage with 30s auto-save
- [x] ExportButton (TEACHER only, window.print())
- [x] Dashboard lesson-plans list page
- [x] Dashboard lesson-plans/new page
- [x] Dashboard lesson-plans/[id] editor page
- [x] Dashboard templates/[programId] viewer page
- [x] Dashboard sidebar navigation updated
- [x] Admin sidebar Templates link added
- [x] Print CSS in globals.css

## Tests Status

- Type check: PASS (zero errors)
- Unit tests: 52/52 PASS (5 test files)
- Build: PASS (22 routes compiled, 0 errors)

## Tiptap Config Details

- Version: @tiptap/react@3.20.0, @tiptap/starter-kit@3.20.0, @tiptap/extension-table@3.20.0 (+ row/header/cell)
- Content stored as `JSON.stringify(editor.getJSON())` in `LessonPlan.content` (String field)
- Program template stored same way in `Program.lessonPlanTemplate` (String | null)
- Editor mounts with `parseContent()` helper that safely parses or returns empty doc
- TiptapViewer re-uses same extensions with `editable: false`

## Security Notes

- `createLessonPlan`: `userId` always sourced from JWT `sub`, never from client input
- `getLessonPlanById`/`updateLessonPlan`/`deleteLessonPlan`: ownership check `plan.userId === user.sub` (ADMIN bypasses)
- Admin template routes: check `user.role === 'ADMIN'` before any DB access
- Lesson plan routes: restricted to `['TEACHER', 'TEACHING_ASSISTANT', 'ADMIN']`
- Export button: only rendered when `userRole === 'TEACHER'`

## Issues Resolved

1. Pre-existing `tests/soft-delete.test.ts` type errors — Prisma v7 generated types now include `lessonPlanTemplate` on Program and require all fields; fixed mock objects using proper casting.
2. Dashboard sidebar had stale `/dashboard/lesson-plans` hrefs — corrected to `/lesson-plans` to match actual route group paths.

## Notes for Phase 4

- Print CSS uses `.no-print` class on toolbar elements — consistent hook for DRM zones
- Tiptap `editorProps.attributes.class` includes table border styles inline; Phase 4 DRM watermark can overlay the editor container
- `ExportButton` uses `window.print()` — no external library dependency
- All lesson plan pages under `app/(dashboard)/` so they inherit the dashboard layout (sidebar + header)
- Template viewer at `/templates/[programId]` (not `/lesson-plans/`) to keep separation of concerns
