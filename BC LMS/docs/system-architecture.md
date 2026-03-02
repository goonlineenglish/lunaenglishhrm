# System Architecture

**Last Updated**: 2026-03-02

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser / Client                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Components (Next.js Client)                       │   │
│  │  - Dashboard, Course Player, Lesson Plan Editor          │   │
│  │  - Auth handling (JWT from httpOnly cookie)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
                    HTTPS (Caddy Reverse Proxy)
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Next.js 15 App Router (Server)                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Middleware (auth-guard.ts)                             │    │
│  │ - Verify JWT signature + validate session              │    │
│  │ - Check token not invalidated (jti lookup)             │    │
│  │ - Protect /admin, /dashboard routes                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                             ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Route Handlers & Server Actions (lib/actions/)         │    │
│  │ - User management (auth, profile)                      │    │
│  │ - Program/Course CRUD                                 │    │
│  │ - Progress tracking                                    │    │
│  │ - Lesson plan CRUD                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                             ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Service Layer (lib/services/)                          │    │
│  │ - Business logic (access control, enrollment check)    │    │
│  │ - Data transformation                                  │    │
│  │ - Error handling & validation                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                             ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Prisma ORM (lib/prisma.ts)                             │    │
│  │ - Normalized queries (soft delete filtering)           │    │
│  │ - Transaction support                                  │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Core Tables:                                           │    │
│  │ - users (email, password hash, role)                   │    │
│  │ - sessions (jti, invalidated, expiresAt)               │    │
│  │ - programs (name, slug, lessonPlanTemplate)            │    │
│  │ - user_programs (userId, programId) [access]           │    │
│  │ - courses (programId, title, type, level, order)        │    │
│  │ - lessons (courseId, title, content, videoUrl)         │    │
│  │ - enrollments (userId, courseId)                       │    │
│  │ - progress (userId, lessonId, watched, completed)      │    │
│  │ - lesson_plans (userId, programId, content)            │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Layers & Responsibilities

### 1. Client Layer (Browser)
- React components with shadcn/ui
- Server component boundaries (App Router)
- Client-side state management (minimal via React hooks)
- Session/auth state from httpOnly cookie (never accessed directly)
- DRM zone overlay + watermark (Phase 4)

### 2. Middleware Layer (`middleware.ts`)
- Route protection (requires auth)
- JWT signature verification
- Session validation (check if invalidated)
- Role checking (route group permissions for 4 roles)
- CSRF token validation on POST/PUT/DELETE

**Protected Routes**:
- `/admin/*` → Requires ADMIN role
- `/dashboard/*` → Requires MANAGER | TEACHER | TEACHING_ASSISTANT role
- `/api/*` → Requires valid session (except `/api/auth/login` and `/api/health`)

### 3. Route Handlers & Server Actions (`app/api/` + `lib/actions/`)
- **Auth actions**: login, logout
- **User actions**: get profile, update profile, change password
- **Program actions**: list, create, update, delete, restore
- **Course actions**: list, create, update, delete, restore
- **Enrollment actions**: enroll teacher in course, list enrollments
- **Progress actions**: update watched time, mark complete
- **Lesson Plan actions**: create, save, list, delete

**Error Handling Pattern**:
```typescript
try {
  // Business logic
  return { success: true, data };
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    return { success: false, error: "Database error" };
  }
  return { success: false, error: "Unexpected error" };
}
```

### 4. Service Layer (`lib/services/`)
- **RolePermissionsService**: Permission map for 4 roles (hasPermission check)
- **AccessControlService**: Check UserProgram + Enrollment + CourseLevel gates
- **AuthService**: JWT creation, password hashing (bcrypt)
- **EnrollmentService**: Enroll users, check access
- **ProgressService**: Track watched time, completion
- **TemplateService**: Program template management
- **SoftDeleteService**: Query filtering (always WHERE isDeleted=false)

### 5. Persistence Layer (Prisma ORM)
- All queries route through `prisma` client
- Connection pooling handled by Prisma
- Transactions for multi-step operations
- Migrations in `prisma/migrations/`

## Authentication Flow

### Login Flow
```
User → POST /api/auth/login (email, password)
  ↓
Service: Hash comparison (bcrypt.compare)
  ↓
Valid? → Generate JWT (header.payload.signature)
  ↓
Create Session record (jti, userId, expiresAt)
  ↓
Response: Set httpOnly cookie `auth-token`
  ↓
Redirect: role=ADMIN → /admin | role=MANAGER/TEACHER/TA → /dashboard
```

### Authenticated Request Flow
```
Browser → GET /dashboard (httpOnly cookie auto-sent)
  ↓
Middleware: Extract JWT from cookie
  ↓
Verify: JWT signature (validate header.payload.signature)
  ↓
Lookup: Session table (jti) → check not invalidated
  ↓
Valid? → Proceed to route handler
  ↓
Invalid →
  ├── Page route (/dashboard/*, /admin/*) → Redirect: /login
  └── API route (/api/*) → JSON { error: "Unauthorized" } with 401 status
```

### Logout Flow
```
User → POST /api/auth/logout (with valid session)
  ↓
Update: session.invalidated = true
  ↓
Response: Clear httpOnly cookie
  ↓
Redirect: /login
```

### JWT Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-id-cuid",
    "jti": "session-id-cuid",
    "email": "teacher@example.com",
    "role": "TEACHER",
    "school": "Tan Mai",
    "iat": 1234567890,
    "exp": 1234571490
  },
  "signature": "HMAC-SHA256(...)"
}
```

**Expiry**: 8 hours (28,800 seconds)

## Access Control Logic

### Three-Gate Authorization
Every protected resource requires verification of ALL THREE gates:

**Gate 1: UserProgram (Program Membership)**
```sql
SELECT * FROM user_programs
WHERE userId = ? AND programId = ?
```
User must be assigned to the program.

**Gate 2: Enrollment (Course Grant)**
```sql
SELECT * FROM enrollments
WHERE userId = ? AND courseId = ?
```
User must be enrolled in the course.

**Gate 3: CourseLevel (Role-Level Access)**
```typescript
const ADVANCED_ACCESS_ROLES: Role[] = ['ADMIN', 'TEACHER'];
function canAccessCourseLevel(role: Role, level: CourseLevel): boolean {
  if (level === 'BASIC') return true;
  return ADVANCED_ACCESS_ROLES.includes(role);
}
```

### Access Decision Tree
```
Can user access course?
├─ Check UserProgram (program member?) → NO → Deny
├─ YES
├─ Check Enrollment (course enrolled?) → NO → Deny
├─ YES
├─ Check CourseLevel (role allows level?) → NO → Deny
│   ├─ BASIC → Allow all roles
│   └─ ADVANCED → Allow ADMIN + TEACHER only
└─ YES → Allow
```

### Revocation Patterns

**Soft Revoke (Program Membership)**
```
Admin revokes program assignment:
1. Delete UserProgram record
2. Teacher can no longer access any course in that program
3. Enrollment + Progress records remain in DB
4. Re-assignment: create new UserProgram → access restored with history intact
```

**Course Unroll (Admin Action)**
```
Admin removes course from program:
1. Set course.isDeleted = true
2. Existing enrollments still visible in DB (audit trail)
3. Access blocked by soft delete filter
```

## Manager School Scoping

Managers see only users within the same school (`user.school` match).

**Query Pattern**:
```typescript
async function getSchoolUsers(managerSchool: string) {
  return prisma.user.findMany({
    where: { school: managerSchool, isDeleted: false }
  });
}
```

**Scope Rules**:
- Manager reports filtered by `WHERE user.school = manager.school`
- Manager sees TEACHER and TEACHING_ASSISTANT users in their school
- Manager cannot see ADMIN users or users from other schools

## Role Permissions Service

Centralized permission map (`lib/services/role-permissions-service.ts`):

| Permission | ADMIN | MANAGER | TEACHER | TA |
|------------|-------|---------|---------|-----|
| users:crud | Yes | - | - | - |
| programs:crud | Yes | - | - | - |
| courses:crud | Yes | - | - | - |
| courses:view_basic | Yes | Yes | Yes | Yes |
| courses:view_advanced | Yes | - | Yes | - |
| lesson_plans:create | - | - | Yes | Yes |
| lesson_plans:export | - | - | Yes | - |
| lesson_plan_templates:view | Yes | Yes | Yes | Yes |
| reports:view_all | Yes | - | - | - |
| reports:view_school | - | Yes | - | - |
| progress:track | - | Yes | Yes | Yes |
| favorites:toggle | Yes | Yes | Yes | Yes |

## Session Management

### Session Table Schema
```sql
CREATE TABLE sessions (
  id CUID PRIMARY KEY,
  userId CUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti CUID NOT NULL UNIQUE,
  invalidated BOOLEAN DEFAULT false,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Session Lifecycle
1. **Creation**: Login endpoint creates session + JWT
2. **Validation**: Middleware checks `invalidated = false` on every request
3. **Expiry**: JWT exp claim + expiresAt field (match: expiresAt = iat + 8h)
4. **Invalidation**: Logout sets `invalidated = true`
5. **Cleanup**: Cron job (daily) deletes `WHERE expiresAt < NOW()`

### Cron Job Setup
```bash
# In deploy config or systemd timer:
0 3 * * * /usr/bin/psql $DATABASE_URL -c \
  "DELETE FROM sessions WHERE expiresAt < NOW();"
```

## CSRF Protection (Double-Submit Cookie)

### Protection Method
1. Server generates CSRF token = random 32-byte hex string
2. Server sets TWO cookies on login response:
   - `auth-token` (httpOnly, secure) — JWT for authentication
   - `csrf-token` (NOT httpOnly, secure, sameSite=strict) — readable by client JS
3. Client reads CSRF token from cookie via `document.cookie` or a helper
4. Client sends token in header: `X-CSRF-Token: <value>` on all POST/PUT/DELETE
5. Server validates: `X-CSRF-Token` header === `csrf-token` cookie value

**Why NOT httpOnly**: Client JS must read the CSRF cookie to send it as a header. This is safe because CSRF tokens are not session credentials — they prevent cross-site request forgery, not session theft.

**Mutating Endpoints**: All POST/PUT/DELETE require CSRF header

**Exceptions** (no CSRF required):
- `POST /api/auth/login` — CSRF token does not exist before login; token is set in login response
- `/api/health` — public endpoint, no mutation

### Implementation
```typescript
// Server: Set CSRF cookie on login (alongside auth-token)
const csrfToken = crypto.randomBytes(32).toString('hex');
cookies().set('csrf-token', csrfToken, {
  httpOnly: false,  // Client must read this
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

// Client: Read CSRF cookie and send in header
function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(c => c.startsWith('csrf-token='))
    ?.split('=')[1] ?? '';
}

fetch('/api/users', {
  method: 'POST',
  headers: { 'X-CSRF-Token': getCsrfToken() },
  body: JSON.stringify(data),
});

// Middleware: Validate on mutating requests (except login)
const CSRF_EXEMPT = ['/api/auth/login'];
if (['POST', 'PUT', 'DELETE'].includes(req.method) && !CSRF_EXEMPT.some(p => req.nextUrl.pathname.startsWith(p))) {
  const headerToken = req.headers.get('x-csrf-token');
  const cookieToken = cookies().get('csrf-token')?.value;
  if (!headerToken || headerToken !== cookieToken) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
  }
}
```

## Soft Delete Pattern

### Implementation
All entities with sensitive data use soft delete:

**Tables with Soft Delete**:
- `users` (isDeleted)
- `programs` (isDeleted)
- `courses` (isDeleted)
- `lessons` (isDeleted)

### Query Pattern
```typescript
// Always filter in SELECT
const courses = await prisma.course.findMany({
  where: { isDeleted: false, programId }
});

// Use helper function for consistency
async function getActiveCourses(programId: string) {
  return prisma.course.findMany({
    where: { isDeleted: false, programId }
  });
}
```

### Foreign Key Constraints
```sql
-- Content references: RESTRICT (prevents HARD delete if children exist)
-- NOTE: FK RESTRICT does NOT block soft delete (UPDATE isDeleted=true).
-- Service layer must enforce "no active children" rule before soft-deleting parent.
ALTER TABLE courses ADD CONSTRAINT fk_program_restrict
  FOREIGN KEY (programId) REFERENCES programs(id) ON DELETE RESTRICT;

-- User references: CASCADE (delete sessions when user deleted)
ALTER TABLE sessions ADD CONSTRAINT fk_user_cascade
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
```

### Soft Delete Service Guard
```typescript
// lib/services/soft-delete-service.ts
// MUST check for active children before soft-deleting parent
async function softDeleteProgram(programId: string): Promise<Result> {
  const activeCourses = await prisma.course.count({
    where: { programId, isDeleted: false }
  });
  if (activeCourses > 0) {
    return { success: false, error: 'Cannot delete program with active courses. Delete courses first.' };
  }
  await prisma.program.update({ where: { id: programId }, data: { isDeleted: true } });
  return { success: true };
}

async function softDeleteCourse(courseId: string): Promise<Result> {
  const activeLessons = await prisma.lesson.count({
    where: { courseId, isDeleted: false }
  });
  if (activeLessons > 0) {
    return { success: false, error: 'Cannot delete course with active lessons. Delete lessons first.' };
  }
  await prisma.course.update({ where: { id: courseId }, data: { isDeleted: true } });
  return { success: true };
}
```

### Restoration
```typescript
// Admin restore user
await prisma.user.update({
  where: { id: userId },
  data: { isDeleted: false }
});
```

## DRM Architecture (Phase 4)

### Content Protection Layers

**Layer 1: CSS Scoping**
```tsx
<div className="drm-zone">
  {/* Lesson content + video player */}
  <VideoPlayer />
</div>

<style>{`
  .drm-zone {
    user-select: none;
  }
  .drm-zone video {
    /* Video controls remain accessible */
  }
`}</style>
```

**Layer 2: Watermark Overlay**
```tsx
// Dynamic watermark component (positioned every 30s randomly)
<WatermarkOverlay userId={user.id} />

// Watermark content: "user@example.com - 2025-03-02 14:35"
```

**Layer 3: Page Blur**
```typescript
window.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.querySelector('.drm-zone').style.filter = 'blur(10px)';
  } else {
    document.querySelector('.drm-zone').style.filter = 'none';
  }
});

window.addEventListener('blur', () => {
  document.querySelector('.drm-zone').style.filter = 'blur(10px)';
});
```

**Layer 4: Right-Click Disable**
```typescript
document.querySelector('video').addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
```

### NOT Blocked (Intentionally)
- Video controls (play, pause, volume, fullscreen) remain accessible
- Copy/paste outside `.drm-zone` works normally
- Developer tools access (users expected to be trusted staff)

## Database Relationships

### Many-to-Many: User ↔ Program
- **Table**: `user_programs`
- **Why**: Teachers can belong to multiple programs
- **Impact**: One teacher can access courses from multiple programs

### One-to-Many: Program → Courses
- **Constraint**: RESTRICT (no delete if courses exist)
- **Why**: Maintain data integrity

### One-to-Many: Course → Lessons
- **Constraint**: RESTRICT
- **Ordering**: Via `order` field (unique per course)

### One-to-Many: User → Sessions
- **Constraint**: CASCADE (delete all sessions when user deleted)
- **Why**: User may have multiple active sessions (multi-device login)
- **Logout**: Invalidates specific session by jti, not all sessions
- **Force logout all**: Admin can invalidate all sessions for a user

### Many-to-Many: User ↔ Course (via Enrollment)
- **Table**: `enrollments`
- **Access Logic**: Combined with `user_programs` check

## API Response Format

All endpoints follow consistent response structure:

**Success**:
```json
{
  "success": true,
  "data": { /* entity data */ }
}
```

**Error**:
```json
{
  "success": false,
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

**Paginated**:
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "pages": 5
  }
}
```

## Error Handling Strategy

### Try-Catch in All Server Actions
```typescript
export async function createCourse(data: CreateCourseInput) {
  try {
    // Validate input
    const validated = createCourseSchema.parse(data);

    // Business logic
    const course = await prisma.course.create({
      data: validated
    });

    return { success: true, data: course };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: "Validation failed", details: error.errors };
    }
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: "Course order already exists" };
      }
    }
    return { success: false, error: "Internal server error" };
  }
}
```

### HTTP Status Codes
- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Validation error
- `401 Unauthorized` — Missing auth
- `403 Forbidden` — Insufficient permissions
- `404 Not Found` — Resource not found
- `409 Conflict` — Duplicate entry / constraint violation
- `500 Internal Server Error` — Unexpected error

---

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

### 2. Authenticated Request Flow (Middleware)

```
[Any Request to /dashboard/* or /admin/*]
      │
      ▼
[Extract JWT from httpOnly cookie]
      ├── Missing cookie ──► Redirect /login
      ▼
[Verify JWT signature]
      ├── Invalid signature ──► Redirect /login
      ▼
[Lookup Session by jti]
      ├── Not found ──► Redirect /login
      ├── invalidated = true ──► Redirect /login
      ├── expiresAt < NOW() ──► Redirect /login
      ▼
[Check user.isDeleted]
      ├── true ──► Redirect /login
      ▼
[Role check for /admin/*]
      ├── role ≠ ADMIN ──► 403 Forbidden
      ▼
[Proceed to route handler]
```

### 3. Teacher Content Access Flow

```
[Teacher Login]
      │
      ▼
[Dashboard] — hiển thị Programs được assign (UserProgram, isDeleted=false)
      │ click program
      ▼
[Program Page] — danh sách Courses (type: TRAINING | MATERIAL, isDeleted=false)
      │ click course
      ▼
[Gate 1: Check UserProgram exists] ──── MISSING ──► [403 — lock icon + tooltip]
      │ exists
      ▼
[Gate 2: Check Enrollment exists] ──── MISSING ──► [403 — lock icon + tooltip]
      │ exists
      ▼
[Course Player]
      │
      ├── [Lesson List] ──► click lesson ──► [Lesson View]
      │                                           │
      │                                    [Video embed (Google Drive)]
      │                                           │ watch — update watchedTime every 30s
      │                                    [watchedTime >= 80% duration OR manual click]
      │                                           │
      │                                    [Mark as Completed]
      │                                           │
      └────────────────────────────────────► [Progress Updated]
```

### 4. Admin Enrollment Management Flow

```
[Admin Panel → Users]
      │ select user
      ▼
[User Detail]
      │
      ├── [Assign Program]  ──► create UserProgram ──► Teacher thấy program + courses trên dashboard
      │
      ├── [Revoke Program]  ──► delete UserProgram ──► Access blocked ngay lập tức
      │                                                (Enrollment + Progress kept in DB)
      │                                                (re-assign → access + history restored)
      │
      └── [Assign Course]   ──► create Enrollment  ──► Teacher có thể vào course
                                                        (requires UserProgram cùng lúc)
```

### 5. Lesson Plan (Giáo Án) Flow

```
[Teacher Dashboard]
      │ click "Tạo giáo án"
      ▼
[Select Program] — chỉ hiện programs teacher đang được assign
      │
      ▼
[Load Template] — từ Program.lessonPlanTemplate (Tiptap JSON)
      ├── Template null ──► mở editor trống
      ▼
[Tiptap Editor] — prefilled với template, teacher chỉnh sửa
      │ click Save
      ▼
[POST /api/lesson-plans] — validate userId + programId FK
      │
      ▼
[LessonPlan saved] — linked userId + programId
      │
      ▼
[Teacher Profile → "Giáo án của tôi"] — list tất cả plans của teacher
      │ click plan
      ▼
[View / Edit / Delete LessonPlan]
```

### 6. Admin Lesson Plan Template Flow

```
[Admin → Programs]
      │ select program
      ▼
[Program Detail]
      │ click "Chỉnh sửa mẫu giáo án"
      ▼
[Tiptap Editor] — load Program.lessonPlanTemplate hiện tại
      │ chỉnh sửa
      │ click Save
      ▼
[PATCH /api/programs/:id/template]
      │
      ▼
[Program.lessonPlanTemplate updated]
      ├── Giáo án MỚI từ program này dùng template mới
      └── Giáo án ĐÃ LƯU không bị ảnh hưởng
```

### 7. Progress State Machine (Per Lesson)

```
        [NOT_STARTED]
              │ teacher mở lesson
              ▼
        [IN_PROGRESS] ◄──── watchedTime cập nhật mỗi 30s
              │
       ┌──────┴──────────────────────────┐
       │ watchedTime >= 80% of duration  │ teacher click "Đánh dấu hoàn thành"
       └──────────────┬──────────────────┘
                      ▼
               [COMPLETED]
               (completed=true — không thể revert)
```

### 8. Soft Delete & Restore Flow (Admin)

```
[Admin Panel → Entity (User/Program/Course/Lesson)]
      │
      ├── [Soft Delete] ──► set isDeleted = true
      │                     Teacher bị block ngay lập tức
      │                     Data giữ nguyên trong DB
      │                     Entity hiện trong "Đã xóa" tab của admin
      │
      └── [Restore] ──► set isDeleted = false
                        Teacher regain access ngay lập tức
                        Progress/Enrollment/LessonPlan còn nguyên

[Service-level constraint]: Không thể soft-delete Program nếu có Course active
                           Không thể soft-delete Course nếu có Lesson active
                           Admin phải soft-delete children trước
                           (FK RESTRICT chỉ chặn hard delete, service layer enforce cho soft delete)
```
