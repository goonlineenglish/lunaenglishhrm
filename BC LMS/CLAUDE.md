# CLAUDE.md — Buttercup LMS

## Project Overview

Internal LMS for Buttercup Learning teacher training. ~100 teachers across 3 English programs (Buttercup, Primary Success, Primary Secondary). Course delivery, progress tracking, lesson plan builder.

**Status**: Planning & documentation complete. Zero source code implemented.
**Domain**: lms.buttercuplearning.com

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router, server components, server actions) |
| Database | PostgreSQL + Prisma ORM (9 models, soft delete) |
| Auth | Custom JWT + httpOnly cookies + DB-backed sessions (jti, invalidated) |
| UI | shadcn/ui + Tailwind v4 |
| Editor | Tiptap (lesson content + lesson plan builder) |
| Video | Google Drive embed (Phase 1) → Bunny.net (Phase 4) |
| DRM | Scoped CSS `.drm-zone` + watermark + page blur |
| Deploy | Docker + Caddy, single VPS (2-4 CPU, 4GB RAM) |
| Brand | primary=#4F46E5 (indigo) |

## Key Architecture Decisions

- **4 roles**: ADMIN, MANAGER, TEACHER, TEACHING_ASSISTANT
- **CourseLevel**: BASIC (all roles) / ADVANCED (admin+teacher only)
- **Three-Gate access**: UserProgram + Enrollment + CourseLevel check
- **Manager scoping**: `user.school` string match — sees only same-school users
- **Soft delete**: `isDeleted` flag on User/Program/Course/Lesson; FK Cascade for Sessions, Restrict for content
- **Revoke program**: Soft revoke — delete UserProgram, keep Enrollment/Progress; re-assign restores access
- **TA lesson plans**: Can create/edit, cannot export PDF/Word
- **Manager lesson plans**: View templates read-only, cannot create
- **Decisions doc**: `docs/quiet-coalescing-marshmallow.md`

## Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1. Foundation | Auth, 4-role, User/Program/Course CRUD, Dashboard | Pending |
| 2. Learning | Course player, progress tracking, profile, search | Pending |
| 3. Lesson Plan Builder | Tiptap editor, templates, plan CRUD | Pending |
| 4. Security & Polish | DRM, watermark, reports, Bunny.net, favorites | Pending |

## Folder Structure (Planned)

```
app/
├── (auth)/login/           # Login page
├── (dashboard)/            # Teacher routes
│   ├── courses/[id]/       # Course player
│   ├── profile/            # Teacher profile
│   └── lesson-plans/       # Plan list + editor
├── admin/                  # Admin panel
│   ├── users/
│   ├── programs/
│   ├── courses/
│   ├── reports/
│   └── templates/
└── api/                    # REST API routes

lib/
├── actions/                # Server actions
├── services/               # Business logic
├── auth/                   # Auth helpers
├── types/                  # TypeScript definitions
├── prisma.ts               # DB client
└── utils.ts

middleware.ts               # Auth guard (project root)
prisma/schema.prisma        # Database schema
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm test             # Run tests
npx prisma migrate dev  # Run DB migrations
npx prisma studio       # Open Prisma Studio
```

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/bc_lms
JWT_SECRET=<min-32-chars>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## State Machine Diagrams

### 1. Authentication Flow

```
[Guest] ──/login──► [Login Page]
                         │ submit credentials
                         ▼
                    [POST /api/auth/login]
                    ├── FAIL (wrong password) ──► [Login Page + error]
                    ├── FAIL (isDeleted user) ──► [Login Page + "Tài khoản bị vô hiệu hóa"]
                    └── OK ──► create Session (jti) + set httpOnly cookie
                                    │
                         ┌──────────┬──────────┬──────────┐
                         ▼          ▼          ▼          ▼
                    [ADMIN]    [MANAGER]  [TEACHER]  [TA]
                    /admin     /dashboard /dashboard /dashboard
```

### 2. Middleware Request Validation

```
[Any Request to /dashboard/*, /admin/*, or /api/* (except /api/auth/login, /api/health)]
      │
      ▼
[Extract JWT from httpOnly cookie]
      ├── Missing cookie ──► Redirect /login
      ▼
[Verify JWT signature (HS256)]
      ├── Invalid ──► Redirect /login
      ▼
[Lookup Session by jti]
      ├── Not found ──► Redirect /login
      ├── invalidated=true ──► Redirect /login
      ├── expiresAt < NOW() ──► Redirect /login
      ▼
[Check user.isDeleted]
      ├── true ──► Redirect /login
      ▼
[Role check for /admin/*]
      ├── role ≠ ADMIN ──► 403 Forbidden
      ▼
[CSRF check on POST/PUT/DELETE]
      ├── token mismatch ──► 403 Forbidden
      ▼
[Proceed to route handler]
```

### 3. Three-Gate Content Access (Teacher)

```
[Teacher Login → Dashboard]
      │ click program
      ▼
[Program Page] — courses list (TRAINING | MATERIAL, isDeleted=false)
      │ click course
      ▼
[Gate 1: UserProgram exists?] ── NO ──► 403 (lock icon + tooltip)
      │ YES
      ▼
[Gate 2: Enrollment exists?] ── NO ──► 403 (lock icon + tooltip)
      │ YES
      ▼
[Gate 3: CourseLevel allowed?]
      ├── BASIC ──► Allow all roles
      ├── ADVANCED + role=ADMIN|TEACHER ──► Allow
      └── ADVANCED + role=MANAGER|TA ──► 403
      │ PASS
      ▼
[Course Player] → Lesson List → Video → Progress tracking
```

### 4. Progress State Machine (Per Lesson)

```
[NOT_STARTED]
      │ teacher opens lesson
      ▼
[IN_PROGRESS] ◄──── watchedTime updates every 30s
      │
      ├── watchedTime >= 80% duration ──┐
      ├── manual click "Hoàn thành" ────┤
      ▼                                 │
[COMPLETED] ◄──────────────────────────┘
      (completed=true — cannot revert)
```

### 5. Admin Enrollment Management

```
[Admin → Users → User Detail]
      │
      ├── [Assign Program]  → create UserProgram → teacher sees program on dashboard
      ├── [Revoke Program]  → delete UserProgram → access blocked immediately
      │                       (Enrollment+Progress kept; re-assign restores all)
      └── [Assign Course]   → create Enrollment → teacher can enter course
                              (requires UserProgram simultaneously)
```

### 6. Lesson Plan Flow

```
[Teacher] → "Tạo giáo án" → [Select Program] → [Load Template from Program.lessonPlanTemplate]
      │                                                    ├── null → empty editor
      ▼
[Tiptap Editor] → edit → Save → [POST /api/lesson-plans] → LessonPlan saved (userId+programId)
      │
[Teacher Profile → "Giáo án của tôi"] → list → click → [View / Edit / Delete]

Roles: TEACHER + TA can create/edit. Only TEACHER can export PDF/Word. MANAGER view-only.
```

### 7. Admin Template Management

```
[Admin → Programs → Program Detail → "Chỉnh sửa mẫu giáo án"]
      ▼
[Tiptap Editor] → load current template → edit → Save
      ▼
[PATCH /api/programs/:id/template] → Program.lessonPlanTemplate updated
      ├── NEW plans from this program use new template
      └── EXISTING saved plans NOT affected
```

### 8. Soft Delete & Restore

```
[Admin → Entity (User/Program/Course/Lesson)]
      │
      ├── [Soft Delete] → isDeleted=true → teacher blocked immediately
      │                    data kept in DB, shows in "Đã xóa" admin tab
      │
      └── [Restore]     → isDeleted=false → access restored immediately
                          Progress/Enrollment/LessonPlan intact

Constraint: Cannot soft-delete parent if active children exist (service-level check)
            FK RESTRICT only blocks hard delete; soft delete enforced by SoftDeleteService
            → must soft-delete children first
```

## Data Flow Diagrams

### Request Lifecycle

```
Browser ──HTTPS──► Caddy (reverse proxy, TLS)
                        │
                        ▼
              Next.js Server (port 3000)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         middleware.ts      Static Assets
         (JWT + CSRF)       (public/, _next/)
              │
     ┌────────┴────────┐
     ▼                 ▼
 Server Components  API Routes
 (app/ pages)       (app/api/)
     │                 │
     ▼                 ▼
 Server Actions     Route Handlers
 (lib/actions/)     (GET/POST/PUT/DELETE)
     │                 │
     └────────┬────────┘
              ▼
       Service Layer
       (lib/services/)
       - AccessControlService (Three-Gate)
       - RolePermissionsService
       - AuthService (JWT, bcrypt)
       - SoftDeleteService (isDeleted filter)
              │
              ▼
        Prisma ORM
        (lib/prisma.ts)
              │
              ▼
        PostgreSQL
        (9 models, soft delete)
```

### Authentication Data Flow

```
LOGIN:
  Client → POST /api/auth/login {email, password}
    → AuthService.verifyPassword(bcrypt.compare)
    → AuthService.createJWT({sub, jti, email, role, school}, 8h expiry)
    → prisma.session.create({jti, userId, expiresAt})
    → Response: Set-Cookie: auth-token=<JWT> (httpOnly, secure, sameSite=lax)
    → Redirect: ADMIN→/admin | others→/dashboard

LOGOUT:
  Client → POST /api/auth/logout
    → prisma.session.update({jti}, {invalidated: true})
    → Response: Clear-Cookie: auth-token
    → Redirect: /login

SESSION CLEANUP (cron daily 3AM):
  → DELETE FROM sessions WHERE expiresAt < NOW()
```

### Course Access Data Flow

```
Dashboard Load:
  Server Component → prisma.userProgram.findMany({userId, include: {program}})
    → filter isDeleted=false on program
    → return programs[] with course counts

Course Player Load:
  Server Action → AccessControlService.checkAccess(userId, courseId)
    → Gate 1: prisma.userProgram.findFirst({userId, programId})
    → Gate 2: prisma.enrollment.findFirst({userId, courseId})
    → Gate 3: canAccessCourseLevel(user.role, course.level)
    → ALL PASS → prisma.lesson.findMany({courseId, isDeleted:false, orderBy:{order:'asc'}})
    → return course + lessons[]

Progress Update:
  Client → POST /api/progress {lessonId, watchedTime} (userId from JWT server-side)
    → prisma.progress.upsert({userId+lessonId}, {watchedTime, completed})
    → if watchedTime >= 80% duration → set completed=true
    → Response: {success, progress}
```

### Admin CRUD Data Flow

```
User Management:
  Create:  POST   /api/users     → validate email unique → bcrypt.hash(password) → prisma.user.create
  Update:  PUT    /api/users/:id → validate fields → prisma.user.update
  Delete:  DELETE /api/users/:id → prisma.user.update({isDeleted: true})  [soft delete]
  Restore: PATCH  /api/users/:id/restore → prisma.user.update({isDeleted: false})

Program Management:
  Create:  POST   /api/programs     → validate slug unique → prisma.program.create
  Update:  PUT    /api/programs/:id → prisma.program.update
  Delete:  DELETE /api/programs/:id → check no active courses (Restrict) → soft delete

Course Management:
  Create:  POST   /api/courses      → validate order unique per program → prisma.course.create
  Update:  PUT    /api/courses/:id  → prisma.course.update
  Reorder: PATCH  /api/courses/reorder → transaction: swap order values
  Delete:  DELETE /api/courses/:id  → check no active lessons (Restrict) → soft delete

Enrollment:
  Assign:  POST   /api/enrollments → prisma.enrollment.create({userId, courseId})
  Remove:  DELETE /api/enrollments/:id → prisma.enrollment.delete (hard delete)
```

### Manager Scoped Data Flow

```
Manager Request → middleware validates role=MANAGER
  → Extract manager.school from JWT payload
  → Service layer: WHERE user.school = manager.school AND isDeleted=false
  → Returns only same-school TEACHER + TA users
  → Manager CANNOT see: ADMIN users, other-school users, system-wide reports
```

### Lesson Plan Data Flow

```
Create Plan:
  Teacher → Select Program → Load Program.lessonPlanTemplate (Tiptap JSON)
    → Tiptap Editor renders template → Teacher edits content
    → POST /api/lesson-plans {title, content, programId}
    → prisma.lessonPlan.create({userId, programId, title, content})

Auto-save (every 30s):
  Client → PUT /api/lesson-plans/:id {content}
    → prisma.lessonPlan.update({content, updatedAt})

Export (TEACHER only, TA blocked):
  Client → GET /api/lesson-plans/:id/export?format=pdf|docx
    → RolePermissionsService.hasPermission(role, 'lesson_plans:export')
    → Generate file → Response: binary download
```

### DRM Protection Data Flow (Phase 4)

```
Lesson Player Load:
  Server → render <DrmZone> wrapper around video+content
    → CSS: user-select:none on .drm-zone
    → <WatermarkOverlay>: "{email} • {timestamp}", reposition every 30s, 15% opacity
    → JS: visibilitychange/blur → apply blur(10px) filter on .drm-zone
    → JS: contextmenu disabled on video element only
    → Video controls (play/pause/seek/fullscreen) remain fully accessible
```

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent same mistake
- Ruthlessly iterate on lessons until mistake rate drops
- Review lessons at session start

### 4. Verification Before Done
- Never mark task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it, don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
