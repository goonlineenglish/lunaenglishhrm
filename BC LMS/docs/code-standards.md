# Code Standards & Best Practices

**Last Updated**: 2026-03-03 — All phases complete

## File Organization & Naming

### Directory Structure
```
app/                          # Next.js App Router
├── (auth)/                   # Route group for auth routes
│   └── login/
├── (dashboard)/              # Route group for authenticated routes
│   ├── page.tsx             # Dashboard home
│   ├── courses/[id]/        # Course player (dynamic route)
│   ├── profile/
│   └── lesson-plans/
├── admin/                    # Admin-only routes
│   ├── users/
│   ├── programs/
│   ├── courses/
│   └── reports/
├── api/                      # REST API endpoints
│   ├── auth/
│   ├── courses/
│   ├── progress/
│   └── lesson-plans/
├── layout.tsx               # Root layout
└── page.tsx                 # Home redirect to /login

lib/
├── actions/                 # Server actions (async functions)
│   ├── auth-actions.ts
│   ├── user-actions.ts
│   ├── program-actions.ts
│   ├── course-actions.ts
│   ├── enrollment-actions.ts
│   ├── progress-actions.ts
│   ├── lesson-plan-actions.ts
│   ├── template-actions.ts
│   ├── profile-actions.ts
│   ├── report-actions.ts
│   └── favorite-actions.ts
├── services/                # Business logic layer
│   ├── access-control-service.ts
│   ├── auth-service.ts
│   ├── role-permissions-service.ts
│   ├── soft-delete-service.ts
│   └── progress-service.ts
├── types/                   # TypeScript type definitions
│   ├── user.ts
│   ├── course.ts
│   ├── auth.ts
│   └── index.ts
├── utils/                   # Utility functions
│   └── sanitize-html.ts
├── prisma.ts               # Prisma client instance
└── utils.ts                # Misc utilities

components/
├── auth/
│   ├── login-form.tsx
│   └── logout-button.tsx
├── admin/
│   ├── admin-sidebar.tsx
│   ├── user-list-client.tsx
│   ├── user-form.tsx
│   ├── user-table.tsx
│   ├── program-form.tsx
│   ├── program-table.tsx
│   └── report-table.tsx
├── dashboard/
│   ├── dashboard-header.tsx
│   ├── dashboard-sidebar.tsx
│   ├── course-card.tsx
│   ├── course-card-skeleton.tsx
│   └── empty-state.tsx
├── course-player/
│   ├── course-player-layout.tsx
│   ├── video-player.tsx
│   ├── drm-zone.tsx
│   ├── watermark.tsx
│   └── lesson-sidebar.tsx
├── lesson-plan/
│   ├── lesson-plan-editor-page.tsx
│   ├── export-button.tsx
│   └── lesson-plan-table.tsx
├── tiptap/
│   ├── tiptap-editor.tsx
│   ├── tiptap-menu-bar.tsx
│   └── tiptap-viewer.tsx
└── shared/
    ├── role-badge.tsx
    ├── role-gate.tsx
    ├── favorite-button.tsx
    └── skeleton.tsx

prisma/
├── schema.prisma            # Database schema definition
└── migrations/

middleware.ts                # Auth guard middleware (ROOT of project)
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **React Components** | kebab-case.tsx | `login-form.tsx`, `course-card.tsx` |
| **Server Actions** | kebab-case-actions.ts | `auth-actions.ts`, `course-actions.ts` |
| **Services** | kebab-case-service.ts | `access-control-service.ts` |
| **Utilities** | kebab-case.ts | `jwt-helpers.ts`, `query-filters.ts` |
| **Types** | kebab-case.ts | `user.ts`, `course.ts` |
| **Constants** | UPPER_CASE or camelCase | `ROLES.ts`, `appConfig.ts` |

**Max File Size**: 200 LOC (lines of code)
- Exceeding 200 LOC → split into focused modules
- Use composition and imports to keep files lean

## Import Path Aliases

Use `@/*` aliases configured in `tsconfig.json`:

```typescript
// ✓ Good
import { LoginForm } from '@/components/auth/login-form';
import { authService } from '@/lib/services/auth-service';
import type { User } from '@/lib/types/user';

// ✗ Avoid
import { LoginForm } from '../../../../components/auth/login-form';
import { authService } from '../../../lib/services/auth-service';
```

## TypeScript Standards

### Strict Mode
- `strict: true` in `tsconfig.json`
- No `any` types — use specific types or `unknown` with guards
- All function parameters must have types
- All return types must be explicit

```typescript
// ✓ Good
async function getUserCourses(userId: string): Promise<Course[]> {
  return prisma.course.findMany({
    where: { enrollments: { some: { userId } } }
  });
}

// ✗ Bad
async function getUserCourses(userId) {
  return prisma.course.findMany({
    where: { enrollments: { some: { userId } } }
  });
}
```

### Type Definitions
All data entities have type definitions in `lib/types/`:

```typescript
// lib/types/user.ts
export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';

export type User = {
  id: string;
  email: string;
  name: string;
  school?: string;
  role: Role;
  isDeleted: boolean;
  createdAt: Date;
};

export type CreateUserInput = Omit<User, 'id' | 'createdAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt'>>;

export type CourseLevel = 'BASIC' | 'ADVANCED';
```

### Zod Validation Schemas
Use Zod for input validation:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short'),
  password: z.string().min(8, 'Password min 8 chars'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']).default('TEACHER'),
}).refine(
  (data) => data.role !== 'MANAGER' || (data.school && data.school.length > 0),
  { message: 'School is required for Manager role', path: ['school'] }
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

## Server Actions Pattern

All data mutations use server actions in `lib/actions/`:

### Basic Structure
```typescript
'use server';

import { prisma } from '@/lib/prisma';
import { AccessControlService } from '@/lib/services/access-control-service';
import type { CreateCourseInput } from '@/lib/types/course';

export async function createCourse(data: CreateCourseInput) {
  try {
    // Validation
    const validated = createCourseSchema.parse(data);

    // Authorization check
    const user = await getAuthenticatedUser();
    if (user?.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    // Business logic
    const course = await prisma.course.create({
      data: validated
    });

    return { success: true, data: course };
  } catch (error) {
    console.error('createCourse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create course'
    };
  }
}
```

### Return Structure
All server actions return consistent response:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

## Error Handling

### In Server Actions
```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Already exists', code: 'DUPLICATE' };
    }
  }
  if (error instanceof ZodError) {
    return { success: false, error: 'Validation failed', details: error.errors };
  }
  return { success: false, error: 'Internal error', code: 'SERVER_ERROR' };
}
```

### In API Routes
```typescript
try {
  // Operation
  return Response.json({ success: true, data });
} catch (error) {
  return Response.json(
    { success: false, error: 'Internal error' },
    { status: 500 }
  );
}
```

### Logging
```typescript
try {
  // Operation
} catch (error) {
  console.error('Operation failed', { error, context: { userId } });
  return { success: false, error: 'Operation failed' };
}
```

## Prisma Query Standards

### Always Filter Soft-Deleted Records
```typescript
// ✓ Good — filters out deleted records
const courses = await prisma.course.findMany({
  where: { isDeleted: false, programId }
});

// ✗ Bad — includes deleted records
const courses = await prisma.course.findMany({
  where: { programId }
});
```

### Use Helper Query Functions
```typescript
// lib/services/query-helpers.ts
export function getActiveCourseWhere(programId?: string) {
  const where: Prisma.CourseWhereInput = { isDeleted: false };
  if (programId) where.programId = programId;
  return where;
}

// Usage in service
const courses = await prisma.course.findMany({
  where: getActiveCourseWhere(programId)
});
```

### Use Transactions for Multi-Step Operations
```typescript
// Create user + sessions in one transaction
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const session = await tx.session.create({
    data: { userId: user.id, jti, expiresAt }
  });
  return { user, session };
});
```

## React Component Standards

### Server vs Client Components
```typescript
// ✓ Default to Server Components
export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  const courses = await getCourses(user.id);
  return <Dashboard user={user} courses={courses} />;
}

// ✓ Use Client Component only when needed (interactivity)
'use client';
import { useState } from 'react';

export function CourseFilter() {
  const [search, setSearch] = useState('');
  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

### Props & Types
```typescript
// ✓ Define prop types
interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
}

export function CourseCard({ course, onEnroll }: CourseCardProps) {
  return <div>{course.title}</div>;
}

// ✗ Bad — no prop types
export function CourseCard(props) {
  return <div>{props.course.title}</div>;
}
```

### Component Composition
```typescript
// ✓ Keep components focused and composable
export function Dashboard() {
  const courses = await getCourses();
  return (
    <div>
      <Header />
      <CourseList courses={courses} />
      <Footer />
    </div>
  );
}

// ✗ Avoid — monolithic component
export function Dashboard() {
  const courses = await getCourses();
  return (
    <div>
      <header>...</header>
      <div>
        {courses.map(course => (
          <div key={course.id}>
            {/* 50+ lines of course card markup */}
          </div>
        ))}
      </div>
      <footer>...</footer>
    </div>
  );
}
```

## Authentication & Authorization

### Auth Architecture
- **JWT Token**: Signed with HS256, 8-hour expiry
- **Storage**: httpOnly cookie `auth-token` (never accessible to JavaScript)
- **Session Validation**: Checked against DB session table (jti, invalidated flag, expiresAt)
- **CSRF Protection**: Double-submit cookie pattern — `auth-token` (httpOnly) + `csrf-token` (NOT httpOnly)
- **Route Protection**: Via `proxy.ts` at project root (NOT middleware.ts — Next.js 16 convention)

### Prisma v7 Notes
- Requires `PrismaPg` adapter from `pg` package
- Use `findFirst` (not `findUnique`) when filtering on non-unique fields like `isDeleted`
- All queries must filter `WHERE isDeleted = false` for soft-deleted records

## Authentication & Authorization Helpers

### Getting Authenticated User
```typescript
// lib/auth/auth-guard.ts (proxy.ts at root)
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; email: string; role: string; school?: string };
  } catch {
    return null;
  }
}
```

Note: Auth validation happens in `proxy.ts` at project root for all protected routes (/dashboard/*, /admin/*, /api/*).

### Role-Based Access Control
```typescript
// lib/services/access-control-service.ts
export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';

export class AccessControlService {
  async canAccessCourse(userId: string, courseId: string, userRole: Role): Promise<boolean> {
    // Use findFirst (not findUnique) because we filter on non-unique field isDeleted
    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      include: { program: true }
    });
    if (!course) return false;

    // Gate 3: CourseLevel check (fail fast for restricted levels)
    if (course.level === 'ADVANCED' && !['ADMIN', 'TEACHER'].includes(userRole)) {
      return false;
    }

    // Gate 1: UserProgram (program membership)
    const programAccess = await prisma.userProgram.findUnique({
      where: { userId_programId: { userId, programId: course.programId } }
    });
    if (!programAccess) return false;

    // Gate 2: Enrollment (course-level enrollment)
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    return !!enrollment;
  }
}
```

### Authorization Check in Actions
```typescript
'use server';

import { hasPermission } from '@/lib/services/role-permissions-service';

export async function deleteCourse(courseId: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(user.role, 'courses:crud')) {
    return { success: false, error: 'Forbidden' };
  }

  // Operation
}
```

### Role-Gate Component (Conditional Rendering)
```tsx
// components/shared/role-gate.tsx
interface RoleGateProps {
  allowedRoles: Role[];
  userRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allowedRoles, userRole, children, fallback = null }: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) return fallback;
  return children;
}

// Usage in dashboard:
<RoleGate allowedRoles={['TEACHER', 'TEACHING_ASSISTANT']} userRole={user.role}>
  <LessonPlanSection />
</RoleGate>

<RoleGate allowedRoles={['TEACHER']} userRole={user.role}>
  <ExportButton planId={plan.id} />
</RoleGate>

<RoleGate allowedRoles={['MANAGER']} userRole={user.role}>
  <SchoolReportsLink />
</RoleGate>
```

## Database Query Performance

### Select Only Needed Fields
```typescript
// ✓ Good — only fetch needed fields
const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true }
});

// ✗ Bad — fetches password (security risk) and unnecessary fields
const users = await prisma.user.findMany();
```

### Use Pagination
```typescript
// ✓ Good — paginate large result sets
const { page = 1, pageSize = 20 } = query;
const users = await prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});

// ✗ Bad — fetch all records
const users = await prisma.user.findMany();
```

### Index Strategy
Prisma will generate migration files. Key indexes:
- `users(email)` — login lookups
- `sessions(userId)` — session queries
- `enrollments(userId)` — teacher's courses
- `progress(userId, lessonId)` — unique constraint
- `courses(programId, order)` — ordering

### Environment Variables

### Configuration
Create `.env.local` for development:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bc_lms

# Auth
JWT_SECRET=your-random-secret-min-32-chars
CRON_SECRET=your-random-cron-secret-min-32-chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

Never commit `.env.local` — use `.env.example` as template. CRON_SECRET protects the session cleanup endpoint.

## Code Comments

### When to Comment
```typescript
// ✓ Complex business logic
// This check ensures teacher has BOTH program membership (Gate 1)
// AND course enrollment (Gate 2) before granting access
if (!programAccess || !enrollment) {
  return false;
}

// ✓ Non-obvious workarounds
// Prisma doesn't support WHERE IN subqueries, so we fetch IDs first
const courseIds = await getCourseIdsInProgram(programId);
const enrollments = await prisma.enrollment.findMany({
  where: { courseId: { in: courseIds } }
});

// ✗ Obvious code
// Increment counter
counter++;
```

### Comment Format
```typescript
// Single-line comments for brief explanations

/*
  Multi-line comments for longer explanations.
  Can span multiple lines for clarity.
*/

/** JSDoc for functions/exports */
/**
 * Check if teacher can access course
 * @param userId - Teacher ID
 * @param courseId - Course ID
 * @returns true if access allowed
 */
export async function canAccessCourse(userId: string, courseId: string): Promise<boolean>
```

## Git & Commits

### Conventional Commits
```
feat: Add lesson plan editor
fix: Correct soft delete filter in course queries
docs: Update code standards document
test: Add tests for access control service
refactor: Extract soft delete logic to helper
chore: Update dependencies
```

**Format**: `<type>(<scope>): <subject>`

### Commit Size
- One logical feature or fix per commit
- Commits should be reviewable in <500 lines of diff
- Keep related files in same commit if tightly coupled

## Testing Standards

### Unit Test Pattern
```typescript
// lib/services/__tests__/access-control-service.test.ts
import { describe, it, expect } from 'vitest';
import { AccessControlService } from '../access-control-service';

describe('AccessControlService', () => {
  it('should deny access without UserProgram', async () => {
    const service = new AccessControlService();
    const result = await service.canAccessCourse('user1', 'course1', 'TEACHER');
    expect(result).toBe(false);
  });
});
```

### Run Tests
```bash
npm run test          # Run all tests
npm run test:watch   # Watch mode
npm run coverage     # Coverage report
```

## Linting & Formatting

### Run Linter
```bash
npm run lint          # Check for issues
npm run lint:fix     # Auto-fix issues
```

### Before Commit
```bash
npm run lint:fix
npm run test
npm run build
```

Ensure all pass before committing.
