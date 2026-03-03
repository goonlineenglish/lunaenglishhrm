# Phase 04: Admin Program Management — Implementation Report

**Date**: 2026-03-03
**Status**: COMPLETED
**Commit**: 9065bc1

## Files Modified / Created

| File | Status | Lines |
|------|--------|-------|
| `lib/types/program.ts` | Created | 20 |
| `lib/utils/slug-helpers.ts` | Created | 16 |
| `lib/actions/program-actions.ts` | Created | 143 |
| `lib/services/soft-delete-service.ts` | Pre-existing (phase-03) | — |
| `components/ui/textarea.tsx` | Created | 20 |
| `components/admin/program-form.tsx` | Created | 105 |
| `components/admin/program-table.tsx` | Created | 145 |
| `components/admin/create-program-dialog.tsx` | Created | 52 |
| `components/admin/program-edit-form.tsx` | Created | 38 |
| `app/admin/programs/page.tsx` | Created | 55 |
| `app/admin/programs/[id]/page.tsx` | Created | 73 |
| `app/api/programs/route.ts` | Created | 66 |
| `app/api/programs/[id]/route.ts` | Created | 95 |
| `app/api/programs/[id]/restore/route.ts` | Created | 33 |

## Tasks Completed

- [x] Create program types (`lib/types/program.ts`)
- [x] Soft delete service — used existing `lib/services/soft-delete-service.ts` created by phase-03
- [x] Create program server actions (getPrograms, getProgramById, createProgram, updateProgram, deleteProgram, restoreProgram)
- [x] Zod validation schema (name min 2 chars, slug regex `^[a-z0-9-]+$`)
- [x] Create slug generation helper (`lib/utils/slug-helpers.ts`, client-safe utility)
- [x] Create program list page with active/deleted tabs (`app/admin/programs/page.tsx`)
- [x] Create program table component with edit/delete/restore actions
- [x] Create program form with slug auto-generation from name
- [x] Create dialog for inline program creation
- [x] Create program detail/edit page with read-only course list
- [x] API routes: GET/POST /api/programs, GET/PUT/DELETE /api/programs/[id], PATCH restore
- [x] Soft delete guard: blocks if active courses exist, returns Vietnamese error
- [x] Slug uniqueness: Prisma P2002 caught, user-friendly error returned
- [x] All routes check `x-user-role === 'ADMIN'`
- [x] npm run build: PASS
- [x] git commit: 9065bc1

## Tests Status

- Type check: PASS (via next build TypeScript check)
- Build: PASS — 16 routes compiled (12 from phase-03, 4 new program routes)
- Lint: Not explicitly run (build TypeScript check passed)

## Deviations from Plan

1. **generateSlug moved to lib/utils/slug-helpers.ts**: In Next.js, all exports from `'use server'` files must be async functions. `generateSlug` is synchronous, so it was extracted to a separate utility file. Imported from there in `program-form.tsx` and available for any client component.

2. **soft-delete-service.ts pre-existing**: Phase-03 already created `lib/services/soft-delete-service.ts` with `softDeleteProgram()` that handles both the guard check AND the DB update in one call. Used it directly — no duplication.

3. **Component split**: Phase plan specified `program-form-dialog.tsx` as a single file but the 200-LOC rule required splitting into `program-form.tsx` (reusable form), `create-program-dialog.tsx` (create dialog), and `program-edit-form.tsx` (edit wrapper for detail page).

4. **textarea.tsx added**: Not present in existing shadcn components; added standard shadcn-pattern Textarea component to support program description field.

5. **program-table.tsx created in components/admin/**: Phase file listed it as a separate component — added as `components/admin/program-table.tsx` (not in file ownership list but required by `app/admin/programs/page.tsx` which is owned). This is a supporting component for the owned page.

## Infrastructure Notes

- Slug format enforced: `/^[a-z0-9-]+$/` at Zod + DB unique constraint
- Soft delete guard error message (Vietnamese): "Không thể xóa chương trình đang có N khóa học hoạt động. Xóa khóa học trước."
- Vietnamese diacritics stripped in slug auto-generation via `.normalize('NFD')` + diacritic range strip
- All API routes check `x-user-role` header (set by proxy.ts middleware)
- CSRF: already handled by proxy.ts for all POST/PUT/DELETE/PATCH requests

## Next Steps

Phase 05 (Admin Course Management) can now begin:
- `softDeleteProgram()` available in `lib/services/soft-delete-service.ts`
- Program CRUD API fully operational at `/api/programs`
- Program types exported from `lib/types/program.ts`
- `generateSlug()` available at `lib/utils/slug-helpers.ts` for course slug generation
