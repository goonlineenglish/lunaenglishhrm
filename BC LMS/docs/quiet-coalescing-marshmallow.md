# Buttercup LMS — Brainstorm Summary & Architecture Plan

## Context

Xây dựng LMS nội bộ cho **Buttercup Learning** — hệ thống quản lý đào tạo giáo viên dạy các chương trình tiếng Anh. Người dùng chính là giáo viên nội bộ (không phải học sinh). Admin kiểm soát toàn bộ quyền truy cập.

---

## Kiến trúc Đã Thống Nhất

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT custom (bcrypt + httpOnly cookie `auth-token`) + CSRF double-submit cookie + DB-backed session table (jti, invalidated flag, exp)
- **UI**: shadcn/ui + Tailwind v4
- **Editor**: Tiptap (rich text cho giáo án + lesson content)
- **Video**: Google Drive embed (Phase 1-3) → Bunny.net Stream (Phase 4)
- **DRM**: Scoped CSS (lesson player only) + dynamic watermark + page blur on focus-out

### Deployment
- Docker + Caddy (giống Luna CRM pattern)
- PostgreSQL trong container hoặc Supabase cloud

---

## Data Schema (Prisma)

### Thay đổi so với thiết kế ban đầu

| Thiết kế ban đầu | Điều chỉnh | Lý do |
|---|---|---|
| Hard-coded roles (TEACHER_BUTTERCUP...) | RBAC động: `UserProgram` junction table | Linh hoạt, không sửa code khi thêm program |
| Voucher system phức tạp | Loại bỏ — admin assign enrollment trực tiếp | Overkill cho hệ thống nội bộ |
| `paidAmount`, `price` | Loại bỏ | Không cần payment gateway |

### Core Entities

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String
  school    String?
  role      Role     @default(TEACHER)  // ADMIN | MANAGER | TEACHER | TEACHING_ASSISTANT
  isDeleted Boolean  @default(false)    // soft delete
  programs  UserProgram[]
  enrollments Enrollment[]
  progress  Progress[]
  lessonPlans LessonPlan[]
  sessions  Session[]
  createdAt DateTime @default(now())
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jti         String   @unique  // JWT ID claim
  invalidated Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  // TTL cleanup: cron job deletes rows where expiresAt < now()
}

model Program {
  id          String   @id @default(cuid())
  name        String   // "Buttercup", "Primary Success", "Primary Secondary"
  slug        String   @unique
  description String?
  isDeleted   Boolean  @default(false)  // soft delete
  courses     Course[]
  users       UserProgram[]
  lessonPlans LessonPlan[]              // back-reference required by Prisma
  lessonPlanTemplate String? // Tiptap JSON template
}

model UserProgram {
  userId    String
  programId String
  user      User    @relation(fields: [userId], references: [id])
  program   Program @relation(fields: [programId], references: [id])
  @@id([userId, programId])
}

model Course {
  id          String     @id @default(cuid())
  programId   String
  program     Program    @relation(fields: [programId], references: [id], onDelete: Restrict)
  title       String
  description String?
  type        CourseType // TRAINING | MATERIAL
  level       CourseLevel @default(BASIC)  // BASIC | ADVANCED
  order       Int
  isDeleted   Boolean    @default(false)  // soft delete
  lessons     Lesson[]
  enrollments Enrollment[]
  @@unique([programId, order])  // prevent duplicate ordering within a program
}

enum CourseLevel {
  BASIC      // Accessible by all roles
  ADVANCED   // Accessible by ADMIN + TEACHER only
}

model Lesson {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Restrict)
  title       String
  content     String?  // Tiptap JSON (rich text)
  videoUrl    String?  // Google Drive embed URL
  materials   Json?    // [{name, url, type}]
  order       Int
  duration    Int?     // minutes
  isDeleted   Boolean  @default(false)  // soft delete
  progress    Progress[]
  @@unique([courseId, order])  // prevent duplicate ordering within a course
}

model Enrollment {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  user      User     @relation(fields: [userId], references: [id])
  course    Course   @relation(fields: [courseId], references: [id])
  enrolledAt DateTime @default(now())
  @@unique([userId, courseId])
}

model Progress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  user        User     @relation(fields: [userId], references: [id])
  lesson      Lesson   @relation(fields: [lessonId], references: [id])
  completed   Boolean  @default(false)
  watchedTime Int      @default(0) // seconds
  updatedAt   DateTime @updatedAt
  @@unique([userId, lessonId])
}

model LessonPlan {
  id        String   @id @default(cuid())
  userId    String
  programId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  program   Program  @relation(fields: [programId], references: [id], onDelete: Restrict)
  title     String
  content   String   // Tiptap JSON
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Feature Modules

### Phase 1 — Foundation
- [ ] Auth (login, JWT, middleware)
- [ ] 4-role support (admin, manager, teacher, TA)
- [ ] CourseLevel classification
- [ ] User management (admin panel: create/edit/delete users, assign programs)
- [ ] Program & Course management (admin CRUD)
- [ ] Teacher dashboard (courses by program access)

### Phase 2 — Learning
- [ ] Course player (lesson list + video embed + mark complete)
- [ ] Progress tracking (watchedTime, completion status)
- [ ] Teacher profile page (hồ sơ: programs, completed courses, lesson plans)
- [ ] Search lessons/courses

### Phase 3 — Lesson Plan Builder
- [ ] Tiptap-based editor với template từng chương trình
- [ ] Save/edit/list giáo án theo teacher profile
- [ ] Template read-only viewer for Manager
- [ ] Admin manage templates

### Phase 4 — Security & Polish
- [ ] DRM: CSS disable select/copy, right-click disabled
- [ ] Dynamic watermark (user email + timestamp)
- [ ] Page blur on window focus loss
- [ ] Admin reports (system-wide) + Manager reports (school-scoped)
- [ ] Favorite courses

---

## DRM Implementation (Mức Trung Bình)

```typescript
// 1. CSS Layer — scoped to lesson player component ONLY (not global)
// Apply class .drm-zone on the video player wrapper div, never globally
.drm-zone { user-select: none; -webkit-user-select: none; }
// NOTE: do NOT set pointer-events: none on video — this disables play/pause/seek/fullscreen
// Instead, overlay a transparent div above the video to block right-click context menu only:
.drm-zone .video-overlay {
  position: absolute; inset: 0;
  z-index: 1;
  // transparent — click-through is handled via JS, not pointer-events: none
}
// Regular text/input fields outside .drm-zone retain normal UX

// 2. Dynamic Watermark Component
<Watermark text={`${user.email} • ${new Date().toLocaleString()}`} />
// Overlay div, semi-transparent, random position change every 30s
// z-index above video but below controls

// 3. Page Blur
document.addEventListener('visibilitychange', () => {
  if (document.hidden) applyBlurOverlay()
})
window.addEventListener('blur', () => applyBlurOverlay())

// 4. Disable right-click context menu on video element only
videoEl.addEventListener('contextmenu', (e) => e.preventDefault())

// 5. Disable DevTools shortcut keys (F12, Ctrl+Shift+I)
// Note: không ngăn được OS-level screenshot
```

**Lưu ý với stakeholders**: Không thể ngăn OS-level screenshot (Win+Shift+S, phone camera). DRM này chỉ đủ cho nội bộ.

---

## Delete & Soft Delete Policy

**Strategy**: Soft delete toàn bộ — `isDeleted` flag trên `User`, `Program`, `Course`, `Lesson`.

| Entity | Soft delete effect | onDelete FK behavior |
|---|---|---|
| User | Ẩn khỏi admin list, không login được | Sessions: Cascade, LessonPlan/Enrollment: Restrict (admin phải xóa thủ công nếu cần) |
| Program | Ẩn khỏi dashboard, teacher bị block (middleware check isDeleted) | Courses: Restrict — không cho xóa program còn courses |
| Course | Ẩn khỏi program page, teacher bị block | Lessons: Restrict — không cho xóa course còn lessons |
| Lesson | Ẩn khỏi course player | Progress: Restrict |

**Middleware / service rule**: Mọi query phải filter `WHERE isDeleted = false`. Service layer enforce, không để lọt lên UI.

**Admin restore**: Admin panel có nút "Restore" cho mỗi entity đã soft-delete.

**Session TTL cleanup**: Cron job (hoặc Prisma middleware) delete `Session` rows where `expiresAt < NOW()` để tránh phình bảng.

---

## UX Acceptance Criteria

### Responsive
- Mobile-first layout (360px minimum)
- Course player hoạt động trên mobile (video controls accessible)
- Admin panel usable trên tablet (768px+)

### Empty / Loading / Error States
| State | Required UI |
|---|---|
| No courses enrolled | Empty state với CTA "Liên hệ admin để được enroll" |
| Loading courses/lessons | Skeleton loader, không flash trắng |
| Video load error | Error message + retry button |
| 403 (no access) | Friendly message, không expose thông tin chi tiết |
| Form submit error | Inline error message, không mất data đã nhập |

### Accessibility
- Keyboard navigable: Tab qua menu, course list, lesson list
- Focus visible (không dùng `outline: none` global)
- Video player controls accessible (không bị overlay chặn)
- ARIA labels trên icon buttons

### Locked course UX
- Course bị lock (teacher chưa enrolled): hiển thị lock icon + tooltip "Chưa được đăng ký — liên hệ admin"
- Không redirect sang trang lỗi — giữ người dùng trong context

---

Vì chưa có mẫu cụ thể, plan architecture trước:

- `Program.lessonPlanTemplate` lưu Tiptap JSON template
- Khi giáo viên tạo giáo án mới → load template từ program, có thể chỉnh sửa
- Admin có màn hình edit template cho từng program
- Giáo án lưu vào `LessonPlan` table, linked với teacher

---

## File Structure

```
app/
├── (auth)/login/
├── (dashboard)/
│   ├── page.tsx              # Teacher dashboard
│   ├── courses/[id]/         # Course player
│   ├── profile/              # Teacher profile
│   └── lesson-plans/         # Giáo án list + editor
├── admin/
│   ├── users/
│   ├── programs/
│   ├── courses/
│   └── reports/
└── api/
    ├── auth/
    ├── courses/
    ├── progress/
    └── lesson-plans/

lib/
├── actions/          # Server actions
├── services/         # Business logic
└── prisma/           # DB client

middleware.ts         # Auth guard — must be at project ROOT (Next.js requirement)
```

---

## State Machine Diagrams

### 1. Authentication Flow

```
[Guest] ──/login──► [Login Page]
                         │ submit credentials
                         ▼
                    [API /auth/login]
                    ├── FAIL ──► [Login Page + error]
                    └── OK ──► set cookie auth-token
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                    [role=ADMIN]          [role=TEACHER]
                    /admin/dashboard      /dashboard
```

### 2. Teacher Content Access Flow

**Access rule (canonical)**: Teacher cần CẢ HAI điều kiện để vào course:
1. `UserProgram` tồn tại (program membership)
2. `Enrollment` tồn tại (course-level grant)

Mọi server action/API route kiểm tra cả 2. Nếu thiếu 1 → 403.

```
[Teacher Login]
      │
      ▼
[Dashboard] — hiển thị Programs được assign (UserProgram)
      │ click program
      ▼
[Program Page] — danh sách Courses (TRAINING + MATERIAL)
      │ click course
      ▼
[Check UserProgram] ──── MISSING ──► [403 / Redirect]
      │ exists
      ▼
[Check Enrollment] ──── MISSING ──► [403 / Redirect]
      │ exists
      ▼
[Course Player]
      │
      ├── [Lesson List] ──► click lesson ──► [Lesson View]
      │                                           │
      │                                    [Video embed]
      │                                           │ watch
      │                                    [Update watchedTime]
      │                                           │ finish
      │                                    [Mark as Completed]
      │                                           │
      └────────────────────────────────────► [Progress Updated]
```

### 3. Admin Enrollment Management Flow

**Revoke program policy**: Soft revoke — UserProgram bị xóa, nhưng Enrollment và Progress giữ nguyên trong DB. Access bị chặn vì bước kiểm tra UserProgram fail trước. Nếu re-assign program, teacher tự động restore access mà không mất progress.

```
[Admin Panel → Users]
      │ select user
      ▼
[User Detail]
      │
      ├── [Assign Program]  ──► create UserProgram ──► Teacher can see program + courses
      ├── [Revoke Program]  ──► delete UserProgram ──► Access blocked (Enrollment/Progress kept)
      └── [Assign Course]   ──► create Enrollment  ──► Teacher can enter course (needs UserProgram too)
```

### 4. Lesson Plan (Giáo Án) Flow

```
[Teacher Dashboard]
      │ click "Tạo giáo án"
      ▼
[Select Program] — chọn chương trình
      │
      ▼
[Load Template] — từ Program.lessonPlanTemplate
      │
      ▼
[Tiptap Editor] — prefilled with template
      │ edit content
      │ click Save
      ▼
[LessonPlan saved] → linked to userId + programId
      │
      ▼
[Teacher Profile → "Giáo án của tôi"] — list all saved plans
      │ click plan
      ▼
[View / Edit / Delete LessonPlan]
```

### 5. Admin Lesson Plan Template Flow

```
[Admin → Programs]
      │ select program
      ▼
[Program Detail]
      │ click "Edit Template"
      ▼
[Tiptap Editor] — edit lessonPlanTemplate JSON
      │ save
      ▼
[Program.lessonPlanTemplate updated]
─── All NEW lesson plans from this program use new template
─── Existing saved plans NOT affected
```

### 6. Progress State Machine (Per Lesson)

```
[NOT_STARTED]
      │ open lesson
      ▼
[IN_PROGRESS]  ◄──── watchedTime updates every 30s
      │ watchedTime >= 80% duration OR manual click
      ▼
[COMPLETED]  (completed=true, cannot revert)
```

---

## Verification

1. `npm run build` passes
2. Login/logout flow hoạt động; JWT cookie httpOnly được set
3. CSRF: mutating requests (POST/PUT/DELETE) validate CSRF token
4. Logout: `session.invalidated = true` trong DB, subsequent requests bị reject
5. Cron/cleanup: Session rows với `expiresAt < NOW()` bị xóa tự động
6. `middleware.ts` ở project root — protected routes block unauthenticated requests
7. `middleware.ts` check `user.isDeleted` và `program.isDeleted` — soft-deleted entities bị block
8. Teacher chỉ thấy courses của program được assign (UserProgram exists + isDeleted=false)
9. Teacher không thể vào course nếu thiếu UserProgram OR thiếu Enrollment (test cả 2 cases)
10. Revoke program → teacher bị chặn ngay, progress/enrollment data còn trong DB
11. Re-assign program → teacher restore access, progress còn nguyên
12. Soft-delete Program → courses ẩn, teacher bị block, admin có thể restore
13. Soft-delete User → không login được, data giữ nguyên
14. Progress tracking cập nhật khi xem video
15. Giáo án lưu đúng theo teacher profile với programId hợp lệ (Prisma FK validated)
16. Watermark hiển thị với user info đúng
17. DRM: `pointer-events` không block video controls (play/pause/seek/fullscreen hoạt động)
18. DRM CSS chỉ áp dụng trong `.drm-zone`, form inputs bên ngoài không bị ảnh hưởng
19. Page blur khi switch tab
20. Locked course hiển thị lock icon + tooltip, không redirect lỗi
21. Empty/loading/error states có UI rõ ràng (skeleton, empty state, error message)
22. Keyboard navigation hoạt động qua menu và course/lesson list

---

## Resolved Decisions

- **Course access model**: Cả 2 điều kiện — UserProgram + Enrollment (confirmed by user)
- **Revoke program policy**: Soft revoke — giữ Enrollment/Progress, chỉ chặn access qua UserProgram check (confirmed by user)
- **Delete strategy**: Soft delete (`isDeleted` flag) trên User/Program/Course/Lesson. FK behavior: Cascade cho Sessions, Restrict cho content entities (confirmed by user)
- **Token lifecycle**: JWT + DB Session table (jti, invalidated, expiresAt). Cron cleanup cho expired sessions. (confirmed by user)
- **middleware.ts location**: Root level (`./middleware.ts`), không phải `lib/`
- **DRM scope**: Scoped `.drm-zone` wrapper. `pointer-events: none` bỏ — thay bằng transparent overlay + JS contextmenu block
- **LessonPlan.programId**: Explicit FK relation + back-reference `lessonPlans` trên Program model
- **Order fields**: Compound unique constraint `(programId, order)` và `(courseId, order)`
- **User roles**: 4 roles — ADMIN, MANAGER, TEACHER, TEACHING_ASSISTANT (confirmed by user)
- **Manager scope**: Scoped by `user.school` string match — Manager sees only users in same school (confirmed by user)
- **CourseLevel**: New enum BASIC | ADVANCED on Course model. ADVANCED restricted to ADMIN + TEACHER (confirmed by user)
- **TA lesson plans**: TA can create/edit lesson plans same as Teacher, but cannot export PDF/Word (confirmed by user)
- **Manager lesson plans**: View templates read-only, cannot create lesson plans (confirmed by user)
- **School model**: Reuse existing `school` String field on User, no new School model needed (confirmed by user)
- **Three-Gate model**: Access control upgraded from Two-Gate to Three-Gate (Gate 3 = CourseLevel check) (confirmed by user)

## Open Questions

- Manager validation: Manager requires non-null school field (assumed YES)
- Role change impact: Demoting TEACHER to TA blocks ADVANCED access immediately (by design)
- Manager viewing individual lesson plans: Currently NO — only aggregate reports (may add later)
- Bunny.net migration timeline nếu cần

## Confirmed Info
- **Số giáo viên**: ~100 → single VPS, Docker single-node đủ dùng
- **Hosting**: 2-4 CPU, 4GB RAM, 50GB SSD là đủ cho quy mô này
