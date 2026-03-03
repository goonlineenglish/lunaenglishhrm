---
phase: 4
title: "Admin Program Management"
status: completed
effort: 5h
depends_on: [phase-02]
blocks: [phase-05, phase-06]
---

# Phase 04: Admin Program Management

## Context Links

- [System Architecture - Soft Delete](../../docs/system-architecture.md)
- [Code Standards - Prisma Queries](../../docs/code-standards.md)
- [Codebase Summary - Program Model](../../docs/codebase-summary.md)

## Overview

**Priority**: High
**Status**: Pending
**Description**: Build admin CRUD panel for programs with unique slug validation, soft delete with child-check guard, restore, and lesson plan template storage.

## Key Insights

- Program has unique `slug` field -- auto-generated from name, editable
- Soft delete guard: cannot soft-delete program with active (non-deleted) courses
- `lessonPlanTemplate` field stores Tiptap JSON -- populated in Phase 3, null for now
- 3 initial programs seeded: Buttercup, Primary Success, Primary Secondary
- Program list shows: name, slug, course count, status

## Requirements

### Functional
- List all active programs with course counts
- Create program (name, slug, description)
- Edit program (name, slug, description)
- Soft delete program (blocked if active courses exist)
- Restore soft-deleted program
- "Da xoa" tab showing deleted programs
- Auto-generate slug from name (user can override)

### Non-Functional
- Slug uniqueness enforced at DB level
- Slug format: lowercase, alphanumeric + hyphens only
- Service-level child check before soft delete

## Architecture

### Page Structure
```
/admin/programs/
├── page.tsx               -- Server component: fetch programs
├── program-table.tsx      -- Client component: program list
└── program-form-dialog.tsx -- Client component: create/edit
```

### Soft Delete Guard
```
Admin clicks "Delete Program"
  -> Service checks: any courses with isDeleted=false for this program?
  -> YES -> return error: "Khong the xoa chuong trinh co khoa hoc dang hoat dong"
  -> NO -> set program.isDeleted = true
```

## Related Code Files

### Create
- `app/admin/programs/page.tsx` -- Program list page
- `components/admin/program-table.tsx` -- Program data table
- `components/admin/program-form-dialog.tsx` -- Create/edit dialog
- `lib/actions/program-actions.ts` -- Program CRUD actions
- `lib/types/program.ts` -- Program type definitions
- `lib/services/soft-delete-service.ts` -- Soft delete guard logic

## Implementation Steps

### 1. Create program types (`lib/types/program.ts`)
```typescript
export type ProgramListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDeleted: boolean;
  _count: { courses: number; users: number };
};

export type CreateProgramInput = {
  name: string;
  slug: string;
  description?: string;
};
```

### 2. Create soft delete service (`lib/services/soft-delete-service.ts`)
```typescript
import { prisma } from '@/lib/prisma';

type Result = { success: true } | { success: false; error: string };

export async function canSoftDeleteProgram(programId: string): Promise<Result> {
  const activeCourses = await prisma.course.count({
    where: { programId, isDeleted: false },
  });
  if (activeCourses > 0) {
    return { success: false, error: 'Khong the xoa chuong trinh co khoa hoc dang hoat dong. Xoa khoa hoc truoc.' };
  }
  return { success: true };
}

export async function canSoftDeleteCourse(courseId: string): Promise<Result> {
  const activeLessons = await prisma.lesson.count({
    where: { courseId, isDeleted: false },
  });
  if (activeLessons > 0) {
    return { success: false, error: 'Khong the xoa khoa hoc co bai hoc dang hoat dong. Xoa bai hoc truoc.' };
  }
  return { success: true };
}
```

### 3. Create program server actions (`lib/actions/program-actions.ts`)
```typescript
'use server';

export async function getPrograms(params: { showDeleted?: boolean }) {
  return prisma.program.findMany({
    where: { isDeleted: params.showDeleted ?? false },
    include: { _count: { select: { courses: true, users: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createProgram(input: CreateProgramInput) {
  // Validate with Zod: name min 2 chars, slug regex ^[a-z0-9-]+$
  // Check slug uniqueness (Prisma will enforce, but better UX)
  // prisma.program.create({ data: validated })
}

export async function updateProgram(id: string, input: Partial<CreateProgramInput>) {
  // Validate, update
}

export async function softDeleteProgram(id: string) {
  // Call canSoftDeleteProgram() guard
  // If blocked, return error
  // prisma.program.update({ where: { id }, data: { isDeleted: true } })
}

export async function restoreProgram(id: string) {
  // prisma.program.update({ where: { id }, data: { isDeleted: false } })
}
```

### 4. Create Zod validation schema
```typescript
const createProgramSchema = z.object({
  name: z.string().min(2, 'Ten chuong trinh qua ngan'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug chi chua chu thuong, so va dau gach ngang'),
  description: z.string().optional(),
});
```

### 5. Create slug generation helper
```typescript
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

### 6. Create program list page (`app/admin/programs/page.tsx`)
- Server component: fetch programs with getPrograms()
- "Da xoa" tab toggle
- "Tao chuong trinh" button opens dialog
- Render `<ProgramTable />`

### 7. Create program table (`components/admin/program-table.tsx`)
- Columns: Name, Slug, Courses (count), Users (count), Actions
- Actions: Edit, Delete (with guard), Restore (for deleted tab)

### 8. Create program form dialog (`components/admin/program-form-dialog.tsx`)
- Create/edit mode
- Fields: name (auto-generates slug), slug (editable), description (textarea)
- Slug preview updates as user types name
- Zod validation on submit

## Todo List

- [x] Create program types
- [x] Create soft delete service (canSoftDeleteProgram, canSoftDeleteCourse)
- [x] Create program server actions
- [x] Create Zod validation schema
- [x] Create slug generation helper
- [x] Create program list page
- [x] Create program table component
- [x] Create program form dialog
- [x] Verify slug uniqueness enforcement
- [x] Verify soft delete guard blocks when courses exist
- [x] Verify restore works
- [ ] Verify slug uniqueness enforcement
- [ ] Verify soft delete guard blocks when courses exist
- [ ] Verify restore works

## Success Criteria

- Admin creates program with unique slug
- Duplicate slug returns user-friendly error
- Soft delete blocked when active courses exist
- Soft delete succeeds when no active courses
- Restore makes program visible again
- Program table shows correct course/user counts
- Slug auto-generation from name works

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Slug collision with reserved words | Validate against reserved list (admin, api, login) |
| Concurrent slug creation race | Prisma @unique + catch P2002 |
| Large course count on delete check | Indexed query on programId + isDeleted |

## Security Considerations

- Admin-only access (middleware + action-level check)
- Slug sanitized to prevent path traversal
- Input validated with Zod before DB operations
