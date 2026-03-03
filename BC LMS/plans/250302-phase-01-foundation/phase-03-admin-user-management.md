---
phase: 3
title: "Admin User Management"
status: completed
effort: 6h
depends_on: [phase-02]
blocks: [phase-06]
---

# Phase 03: Admin User Management

## Context Links

- [System Architecture - Role Permissions](../../docs/system-architecture.md)
- [Design Guidelines - Role Badges](../../docs/design-guidelines.md)
- [Code Standards - Server Actions](../../docs/code-standards.md)

## Overview

**Priority**: High
**Status**: Pending
**Description**: Build admin panel for user CRUD with 4-role support, soft delete/restore, program assignment, enrollment management, and role badge UI. Admin-only access.

## Key Insights

- Manager role requires non-null `school` field (Zod validation)
- Soft delete: set `isDeleted=true`, user can't login, visible in "Da xoa" tab
- Restore: set `isDeleted=false`, user regains access
- Admin panel at `/admin/users/` -- protected by middleware (role=ADMIN only)
- UserProgram assignment: admin assigns teacher to program(s)
- Enrollment: admin enrolls teacher in specific course(s)
- Role badges: color-coded (indigo=Admin, sky=Manager, emerald=Teacher, amber=TA)

## Requirements

### Functional
- List all active users (paginated, searchable)
- Create user with email/name/school/role/password
- Edit user (name, school, role; email read-only)
- Soft delete user (with confirmation dialog)
- Restore soft-deleted user
- "Da xoa" tab showing deleted users
- Assign/revoke program memberships (UserProgram)
- Assign/remove course enrollments (Enrollment)
- Password reset (admin sets new password)

### Non-Functional
- Table pagination: 20 per page
- Search: email or name (case-insensitive)
- Admin-only access enforced by middleware

## Architecture

### Page Structure
```
/admin/users/
├── page.tsx          -- Server component: fetch users, render table
├── user-table.tsx    -- Client component: sortable table with actions
├── user-form-dialog.tsx  -- Client component: create/edit form in dialog
└── user-program-dialog.tsx -- Client component: program assignment
```

### Data Flow
```
Admin clicks "Create User"
  -> Dialog opens with form
  -> Submit -> server action createUser()
  -> Zod validation (email unique, school required for Manager)
  -> bcrypt hash password
  -> prisma.user.create()
  -> revalidatePath('/admin/users')
  -> Toast success
```

## Related Code Files

### Create
- `app/admin/layout.tsx` -- Admin layout with sidebar
- `app/admin/users/page.tsx` -- User list page
- `components/admin/user-table.tsx` -- User data table
- `components/admin/user-form-dialog.tsx` -- Create/edit user dialog
- `components/admin/user-program-dialog.tsx` -- Program assignment dialog
- `components/shared/role-badge.tsx` -- Color-coded role badge
- `components/shared/role-gate.tsx` -- Conditional rendering by role
- `components/shared/sidebar.tsx` -- Admin sidebar navigation
- `components/shared/header.tsx` -- Page header
- `lib/actions/user-actions.ts` -- User CRUD server actions
- `lib/services/role-permissions-service.ts` -- Permission map
- `lib/types/user.ts` -- User type definitions

## Implementation Steps

### 1. Create user types (`lib/types/user.ts`)
```typescript
export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  school: string | null;
  role: Role;
  isDeleted: boolean;
  createdAt: Date;
  _count: { programs: number; enrollments: number };
};

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  school?: string;
  role: Role;
};
```

### 2. Create role permissions service (`lib/services/role-permissions-service.ts`)
```typescript
const PERMISSIONS: Record<string, Role[]> = {
  'users:crud': ['ADMIN'],
  'programs:crud': ['ADMIN'],
  'courses:crud': ['ADMIN'],
  'courses:view_basic': ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
  'courses:view_advanced': ['ADMIN', 'TEACHER'],
  'lesson_plans:create': ['TEACHER', 'TEACHING_ASSISTANT'],
  'lesson_plans:export': ['TEACHER'],
  'reports:view_all': ['ADMIN'],
  'reports:view_school': ['MANAGER'],
  'progress:track': ['MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
```

### 3. Create user server actions (`lib/actions/user-actions.ts`)
- `getUsers(params: { page, search, showDeleted })` -- paginated list
- `createUser(input: CreateUserInput)` -- with Zod validation + bcrypt
- `updateUser(id, input: Partial<CreateUserInput>)` -- edit fields
- `softDeleteUser(id)` -- set isDeleted=true
- `restoreUser(id)` -- set isDeleted=false
- `resetPassword(id, newPassword)` -- admin resets password
- `assignProgram(userId, programId)` -- create UserProgram
- `revokeProgram(userId, programId)` -- delete UserProgram
- `enrollInCourse(userId, courseId)` -- create Enrollment
- `unenrollFromCourse(userId, courseId)` -- delete Enrollment

### 4. Create Zod validation schemas
```typescript
const createUserSchema = z.object({
  email: z.string().email('Email khong hop le'),
  name: z.string().min(2, 'Ten qua ngan'),
  password: z.string().min(8, 'Mat khau toi thieu 8 ky tu'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']),
}).refine(
  (d) => d.role !== 'MANAGER' || (d.school && d.school.length > 0),
  { message: 'Quan ly phai co truong/co so', path: ['school'] }
);
```

### 5. Create role badge component (`components/shared/role-badge.tsx`)
- Color map: ADMIN=indigo, MANAGER=sky, TEACHER=emerald, TA=amber
- Vietnamese labels: Admin, Quan ly, Giao vien, Tro giang

### 6. Create role gate component (`components/shared/role-gate.tsx`)
```typescript
interface RoleGateProps {
  allowedRoles: Role[];
  userRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

### 7. Create admin sidebar (`components/shared/sidebar.tsx`)
- Links: Users, Programs, Courses (active indicator)
- Brand: "Buttercup LMS" with indigo accent
- Responsive: collapsible on mobile

### 8. Create admin layout (`app/admin/layout.tsx`)
- Sidebar + main content area
- Server component: verify user is ADMIN
- If not ADMIN, redirect to /dashboard

### 9. Create user list page (`app/admin/users/page.tsx`)
- Server component: fetch users with pagination
- Search input, "Da xoa" tab toggle
- Render `<UserTable />`

### 10. Create user table component (`components/admin/user-table.tsx`)
- Client component with columns: Name, Email, Role (badge), School, Actions
- Actions: Edit, Delete, Programs, Reset Password
- Pagination controls

### 11. Create user form dialog (`components/admin/user-form-dialog.tsx`)
- Client component: create/edit mode
- Form fields: email, name, password (create only), school, role dropdown
- Zod validation on submit
- Call server action, show toast

### 12. Create program assignment dialog (`components/admin/user-program-dialog.tsx`)
- Client component: checkboxes for available programs
- Show currently assigned programs
- Assign/revoke on toggle

## Todo List

- [x] Create user types
- [x] Create role permissions service
- [x] Create user server actions (CRUD + program/enrollment)
- [x] Create Zod validation schemas
- [x] Create role badge component
- [x] Create role gate component
- [x] Create admin sidebar
- [x] Create admin layout
- [x] Create user list page (server component)
- [x] Create user table (client component)
- [x] Create user form dialog
- [x] Create program assignment (user detail page shows assigned programs)
- [x] Verify create user flow (build passes, validation complete)
- [x] Verify soft delete / restore (API + server actions)
- [x] Verify Manager requires school field (Zod refine enforced)

## Success Criteria

- Admin can list, search, paginate users
- Admin creates user -> user can login
- Manager creation requires school field
- Soft delete hides user from list, user can't login
- Restore makes user visible and loginable again
- Program assignment/revocation works
- Role badges display correct colors
- Non-admin accessing /admin/users gets 403

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Email uniqueness race condition | Prisma @unique constraint + catch P2002 error |
| Large user list slow | Pagination + index on email/role |
| Password accidentally returned | Select only needed fields, never include password |

## Security Considerations

- Password hashed before storage (bcrypt 12 rounds)
- Password never returned in query results (use `select` to exclude)
- Admin-only access enforced at middleware + action level
- Email uniqueness enforced at DB level
- Input sanitized via Zod schemas
