# Codebase Summary

## Project Status

**Status**: Pre-development — Architecture finalized, awaiting implementation.

**Start Date**: Pending
**Current Phase**: Planning complete; Phase 1 (Foundation) ready to begin
**Last Updated**: 2026-03-02

## Overview

Buttercup LMS is an internal Learning Management System for teacher training at Buttercup Learning. Serves approximately 100 internal teachers across three programs (Buttercup, Primary Success, Primary Secondary) with course delivery, progress tracking, and lesson planning.

**Tech Stack**:
- Framework: Next.js 15 (App Router)
- Database: PostgreSQL + Prisma ORM
- Auth: Custom JWT + httpOnly cookies + DB-backed Session table
- UI: shadcn/ui + Tailwind v4
- Rich Editor: Tiptap (lesson content + lesson plans)
- Video: Google Drive (Phase 1-3) → Bunny.net Stream (Phase 4)
- Deployment: Docker + Caddy reverse proxy

## Key Architectural Patterns

### Authentication & Session Management
- **JWT**: 8-hour expiry, signed with HS256
- **Storage**: httpOnly cookie `auth-token` (never accessible to JavaScript)
- **Session Table**: DB-backed sessions with `jti` (JWT ID), `invalidated` flag, `expiresAt`
- **Verification**: Middleware validates JWT signature + checks session not invalidated
- **Logout**: Sets `session.invalidated = true`, clears cookie
- **CSRF Protection**: Double-submit cookie pattern on all mutating requests

### Access Control (Three-Gate Model)
1. **Gate 1**: UserProgram (does user belong to program?)
2. **Gate 2**: Enrollment (is user enrolled in course?)
3. **Gate 3**: CourseLevel (does user's role allow this course level?)

BASIC courses: all roles. ADVANCED courses: ADMIN and TEACHER only.
All three gates must pass for course access.

**Revocation Pattern**:
- Soft revoke: Delete UserProgram → access blocked, Enrollment/Progress remain in DB
- Re-assign: Create new UserProgram → access restored with history intact

### Soft Delete Pattern
All sensitive entities use soft delete flag (`isDeleted`):
- Users, Programs, Courses, Lessons
- All SELECT queries filter `WHERE isDeleted = false`
- Foreign key constraints: RESTRICT (prevent delete if children exist)
- Admin can restore soft-deleted entities

### Server Actions & Service Layer
- **Server Actions** (`lib/actions/`): Async functions for mutations (create, update, delete)
- **Services** (`lib/services/`): Business logic layer (access control, validation, transformations)
- **Prisma Client** (`lib/prisma.ts`): Centralized database access
- **Error Handling**: All actions wrapped in try-catch, return `{ success: boolean, data?, error? }`

### DRM Architecture (Phase 4)
- **Scope**: `.drm-zone` CSS class only
- **Watermark**: User email + timestamp, repositioned every 30s
- **Page Blur**: On `visibilitychange` / `window blur`
- **Right-Click**: Disabled on video element only (video controls remain accessible)
- **Transparency**: Not military-grade; basic protection against casual bypassing

## Database Schema (9 Prisma Models)

### User
```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String   // bcrypt hashed
  name     String
  school   String?
  role     Role     @default(TEACHER)  // ADMIN | MANAGER | TEACHER | TEACHING_ASSISTANT
  isDeleted Boolean @default(false)
  programs UserProgram[]
  enrollments Enrollment[]
  progress Progress[]
  lessonPlans LessonPlan[]
  sessions Session[]
  createdAt DateTime @default(now())
}
```

### Session
```prisma
model Session {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  jti        String  @unique
  invalidated Boolean @default(false)
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

### Program
```prisma
model Program {
  id                  String  @id @default(cuid())
  name                String
  slug                String  @unique
  description         String?
  isDeleted           Boolean @default(false)
  courses             Course[]
  users               UserProgram[]
  lessonPlans         LessonPlan[]
  lessonPlanTemplate  String?  // Tiptap JSON
}
```

### UserProgram (Many-to-Many)
```prisma
model UserProgram {
  userId    String
  programId String
  user      User    @relation(fields: [userId], references: [id])
  program   Program @relation(fields: [programId], references: [id])
  @@id([userId, programId])
}
```

### Course
```prisma
model Course {
  id          String     @id @default(cuid())
  programId   String
  program     Program    @relation(fields: [programId], references: [id], onDelete: Restrict)
  title       String
  description String?
  type        CourseType // TRAINING | MATERIAL
  level       CourseLevel @default(BASIC)
  order       Int
  isDeleted   Boolean    @default(false)
  lessons     Lesson[]
  enrollments Enrollment[]
  @@unique([programId, order])
}
```

### CourseLevel (Enum)
```prisma
enum CourseLevel {
  BASIC
  ADVANCED
}
```

### Lesson
```prisma
model Lesson {
  id         String   @id @default(cuid())
  courseId   String
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Restrict)
  title      String
  content    String?  // Tiptap JSON
  videoUrl   String?
  materials  Json?    // [{name, url, type}]
  order      Int
  duration   Int?     // minutes
  isDeleted  Boolean  @default(false)
  progress   Progress[]
  @@unique([courseId, order])
}
```

### Enrollment (Many-to-Many)
```prisma
model Enrollment {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  user      User     @relation(fields: [userId], references: [id])
  course    Course   @relation(fields: [courseId], references: [id])
  enrolledAt DateTime @default(now())
  @@unique([userId, courseId])
}
```

### Progress
```prisma
model Progress {
  id        String  @id @default(cuid())
  userId    String
  lessonId  String
  user      User    @relation(fields: [userId], references: [id])
  lesson    Lesson  @relation(fields: [lessonId], references: [id])
  completed Boolean @default(false)
  watchedTime Int   @default(0)  // seconds
  updatedAt DateTime @updatedAt
  @@unique([userId, lessonId])
}
```

### LessonPlan
```prisma
model LessonPlan {
  id        String  @id @default(cuid())
  userId    String
  programId String
  user      User    @relation(fields: [userId], references: [id], onDelete: Restrict)
  program   Program @relation(fields: [programId], references: [id], onDelete: Restrict)
  title     String
  content   String  // Tiptap JSON
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Favorite (Phase 4)
```prisma
model Favorite {
  userId    String
  courseId  String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  course    Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, courseId])
}
```

**Note**: The Favorite model is planned for Phase 4 (Security & Polish). Phase 1-3 implementation does not include this model.

## Folder Structure (Planned)

```
app/                              # Next.js App Router
├── (auth)/login/                # Auth route group
│   ├── page.tsx
│   └── login-form.tsx
├── (dashboard)/                 # Protected dashboard routes
│   ├── page.tsx                # Dashboard home
│   ├── courses/[id]/            # Course player (dynamic)
│   │   └── page.tsx
│   ├── profile/                # User profile
│   │   └── page.tsx
│   ├── lesson-plans/            # Lesson plans
│   │   ├── page.tsx
│   │   ├── new/
│   │   └── [id]/page.tsx
│   ├── reports/                # Manager school reports
│   │   └── page.tsx
│   └── templates/              # Read-only template viewer
│       └── [programId]/page.tsx
├── admin/                       # Admin-only routes
│   ├── users/
│   │   └── page.tsx
│   ├── programs/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── courses/
│   │   └── page.tsx
│   ├── reports/
│   │   ├── page.tsx
│   │   ├── progress/page.tsx
│   │   └── completion/page.tsx
│   └── templates/
│       └── [programId]/page.tsx
├── api/                         # API routes
│   ├── auth/
│   │   ├── login/route.ts
│   │   └── logout/route.ts
│   ├── courses/
│   │   └── [id]/route.ts
│   ├── progress/
│   │   └── route.ts
│   ├── lesson-plans/
│   │   └── route.ts
│   └── health/
│       └── route.ts
├── layout.tsx                   # Root layout
└── page.tsx                     # Home (redirects to /login; middleware sends authenticated users to /dashboard)

lib/
├── actions/                     # Server actions (mutations)
│   ├── auth-actions.ts
│   ├── user-actions.ts
│   ├── program-actions.ts
│   ├── course-actions.ts
│   ├── enrollment-actions.ts
│   ├── progress-actions.ts
│   ├── lesson-plan-actions.ts
│   ├── template-actions.ts
│   └── favorite-actions.ts
├── services/                    # Business logic
│   ├── access-control-service.ts
│   ├── role-permissions-service.ts  # Role-based permission map
│   ├── auth-service.ts
│   ├── enrollment-service.ts
│   ├── progress-service.ts
│   ├── template-service.ts
│   ├── bunny-service.ts
│   └── query-helpers.ts
├── auth/                        # Auth utilities
│   ├── auth-guard.ts
│   ├── jwt-helpers.ts
│   └── session-helpers.ts
├── types/                       # TypeScript definitions
│   ├── user.ts
│   ├── program.ts
│   ├── course.ts
│   ├── lesson.ts
│   ├── progress.ts
│   ├── auth.ts
│   └── api.ts
├── prisma.ts                   # Prisma client
├── logger.ts                   # Logging utility
└── utils.ts                    # General utilities

components/
├── auth/
│   ├── login-form.tsx
│   └── logout-button.tsx
├── dashboard/
│   ├── course-card.tsx
│   ├── progress-bar.tsx
│   └── empty-courses.tsx
├── course-player/
│   ├── video-player.tsx
│   ├── drm-zone.tsx
│   ├── watermark.tsx
│   └── lesson-sidebar.tsx
├── lesson-plan/
│   ├── editor.tsx
│   ├── template-selector.tsx
│   ├── table-toolbar.tsx
│   └── export-button.tsx
├── admin/
│   ├── user-list.tsx
│   ├── program-list.tsx
│   ├── course-list.tsx
│   └── reports-dashboard.tsx
├── tiptap/
│   ├── editor.tsx
│   └── menu-bar.tsx
└── shared/
    ├── role-gate.tsx         # Conditional rendering by role
    ├── sidebar.tsx
    ├── header.tsx
    ├── skeleton.tsx
    ├── button.tsx
    └── dialog.tsx

prisma/
├── schema.prisma               # Database schema
└── migrations/                 # Database migrations

public/                         # Static assets
├── images/
└── icons/

tests/                          # Test files
├── unit/
├── integration/
└── e2e/

middleware.ts                   # Auth guard (project root)
next.config.ts
tsconfig.json
package.json
docker-compose.yml
Dockerfile
Caddyfile
.env.example
.gitignore
README.md
```

## Core Features by Phase

### Phase 1: Foundation
- [ ] Auth (login/logout, JWT, session table)
- [ ] User CRUD (admin panel)
- [ ] 4-role support (admin, manager, teacher, TA)
- [ ] CourseLevel classification (BASIC/ADVANCED)
- [ ] Program CRUD (admin panel)
- [ ] Course CRUD (admin panel)
- [ ] Dashboard for all non-admin roles (enrolled courses)
- [ ] Soft delete support

### Phase 2: Learning
- [ ] Course player (video + content)
- [ ] Progress tracking (watched time, completion)
- [ ] User profile (edit name/school/password)
- [ ] Search & filter courses
- [ ] Skeleton loaders + empty states

### Phase 3: Lesson Plan Builder
- [ ] Tiptap editor (lesson plan creation)
- [ ] Template management (admin)
- [ ] Template structures (Buttercup + Primary Success)
- [ ] Lesson plan CRUD (save, list, edit, delete)
- [ ] PDF export (Teacher only, not TA)

### Phase 4: Security & Polish
- [ ] DRM (watermark, page blur, right-click disable)
- [ ] Admin reports (system-wide progress, completion, activity)
- [ ] Manager reports (school-scoped progress, completion)
- [ ] Favorite courses (all learner roles)
- [ ] Bunny.net integration (video platform upgrade)
- [ ] Session cleanup cron job

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/logout` — User logout
- `GET /api/auth/me` — Get current user

### Users (Admin)
- `GET /api/users` — List users (paginated)
- `POST /api/users` — Create user
- `PUT /api/users/[id]` — Update user
- `DELETE /api/users/[id]` — Soft delete user
- `POST /api/users/[id]/restore` — Restore user

### Programs (Admin)
- `GET /api/programs` — List programs
- `POST /api/programs` — Create program
- `PUT /api/programs/[id]` — Update program
- `DELETE /api/programs/[id]` — Soft delete program

### Courses
- `GET /api/courses` — List courses (filterable by program)
- `POST /api/courses` — Create course (admin)
- `PUT /api/courses/[id]` — Update course (admin)
- `DELETE /api/courses/[id]` — Soft delete course (admin)

### Lessons
- `GET /api/courses/[id]/lessons` — List lessons for course
- `POST /api/courses/[id]/lessons` — Create lesson (admin)
- `PUT /api/lessons/[id]` — Update lesson (admin)
- `DELETE /api/lessons/[id]` — Soft delete lesson (admin)

### Enrollments
- `GET /api/enrollments` — List enrollments (admin)
- `POST /api/enrollments` — Enroll teacher in course (admin)
- `DELETE /api/enrollments/[id]` — Remove enrollment (admin)

### Progress
- `POST /api/progress` — Update progress (lessonId, watchedTime; userId from JWT)
- `GET /api/progress` — Get current user's progress

### Lesson Plans
- `GET /api/lesson-plans` — List teacher's plans
- `POST /api/lesson-plans` — Create plan
- `PUT /api/lesson-plans/[id]` — Update plan
- `DELETE /api/lesson-plans/[id]` — Delete plan

### Templates (Admin)
- `GET /api/templates/[programId]` — Get program template
- `PUT /api/templates/[programId]` — Update program template

### Reports (Admin & Manager)
- `GET /api/reports/progress` — User progress report (Admin: all, Manager: school-scoped)
- `GET /api/reports/completion` — Course completion report (Admin: all, Manager: school-scoped)
- `GET /api/reports/activity` — User activity report (Admin: all, Manager: school-scoped)
- `GET /api/reports/school` — School-scoped report (Manager only)

### Templates (Read-only)
- `GET /api/templates/[programId]` — Get program template (Manager/Teacher/TA)

### Favorites
- `POST /api/favorites` — Toggle favorite course
- `GET /api/favorites` — List user's favorite courses
- `DELETE /api/favorites/[courseId]` — Remove favorite

### Health
- `GET /api/health` — System health check

## Environment Variables (Planned)

```
# Database
DATABASE_URL=postgresql://user:password@host:5432/bc_lms

# Auth
JWT_SECRET=random-32-char-string

# App
NEXT_PUBLIC_APP_URL=https://lms.buttercuplearning.com
NODE_ENV=production

# External (Phase 2+)
GOOGLE_DRIVE_API_KEY=
BUNNY_STREAM_API_KEY=

# Deployment
CADDY_DOMAIN=lms.buttercuplearning.com
CADDY_EMAIL=admin@buttercuplearning.com
```

## Deployment Architecture

**Single VPS Setup**:
- **Docker Compose**: Orchestrates PostgreSQL, Next.js app, Caddy
- **Caddy Reverse Proxy**: HTTPS, security headers, static asset caching
- **PostgreSQL**: Primary data store (in container or external Supabase)
- **Next.js App**: Server-side rendering + API routes
- **Session Cleanup**: Daily cron job (3 AM UTC)

**Scaling** (future):
- Load balancer (HAProxy) in front of multiple app instances
- Database read replicas
- Separate cache layer (Redis)

## Current Development Status

**Code Files**: 0 (project not yet started)
**Database Migrations**: 0 (schema finalized, migrations pending)
**Tests**: 0 (testing framework to be set up in Phase 1)
**Documentation**: Complete (7 docs files + README)

## Key References

- **Architecture**: See `./docs/system-architecture.md`
- **Code Standards**: See `./docs/code-standards.md`
- **Design Guidelines**: See `./docs/design-guidelines.md`
- **Deployment**: See `./docs/deployment-guide.md`
- **Project Roadmap**: See `./docs/project-roadmap.md`

## Success Metrics

| Metric | Target |
|--------|--------|
| System Uptime | 99% |
| Page Load Time | <2s |
| Auth Success Rate | 99.9% |
| Teacher Adoption | 50%+ weekly active |
| Course Completion | 30%+ |
| Mobile Usage | 20%+ |

## Next Steps

1. **Phase 1 Kickoff**: Set up project repo, install dependencies
2. **Environment Setup**: Configure `.env.local`, Docker Compose
3. **Database**: Run Prisma migrations, seed initial data
4. **Authentication**: Implement login/logout, JWT middleware
5. **CRUD Operations**: User, Program, Course management
6. **Dashboard**: Basic teacher dashboard with enrolled courses
7. **Testing**: Set up test framework, write unit tests
8. **Review**: Code review + documentation update
