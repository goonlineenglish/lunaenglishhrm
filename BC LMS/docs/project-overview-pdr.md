# Project Overview & Product Development Requirements (PDR)

## Product Overview

**Buttercup LMS** is an internal Learning Management System for Buttercup Learning, designed to manage teacher training and professional development across three English language teaching programs:
- **Buttercup Program** (primary focus)
- **Primary Success Program**
- **Primary Secondary Program**

Serves approximately 100 internal staff (teachers, teaching assistants, and managers) with structured courses, progress tracking, and collaborative lesson planning tools. Not student-facing; internal staff only.

**Last Updated**: 2026-03-03 — ALL 4 PHASES COMPLETE

### Who Uses It
- **Teachers (Giao vien)**: Access assigned courses (basic + advanced), track progress, build lesson plans (giáo án), export as PDF/Word
- **Teaching Assistants (Tro giang)**: Access basic-level courses, track progress, create lesson plans (no PDF/Word export)
- **Managers (Quan ly)**: Center/school owners — view basic courses, view lesson plan templates, view school staff reports
- **Administrators**: Manage users, programs, courses, templates, and generate system-wide reports

### Core Purpose
Enable efficient teacher training and lesson planning through:
1. Centralized course delivery and progress tracking
2. Interactive lesson plan builder with program-specific templates
3. Role-based access control and enrollment management
4. Content protection to ensure training materials remain secure

## Core Features (By Phase)

### Phase 1: Foundation
**Timeline**: Weeks 1-4 | **Status**: COMPLETE ✓ (2026-03-03)
- User management (4 roles: admin, manager, teacher, teaching assistant)
- Program and course CRUD (admin only)
- Authentication (JWT + custom sessions)
- Dashboard for all non-admin roles (enrolled courses, quick access)
- Basic access control (UserProgram + Enrollment + CourseLevel gates)

**Deliverables**:
- Login page with role-based redirect
- Admin user management panel with 4-role dropdown
- CourseLevel (BASIC/ADVANCED) classification on courses
- Admin program/course CRUD
- Dashboard for manager/teacher/TA with enrolled courses
- Database schema with soft delete support

### Phase 2: Learning & Progress
**Timeline**: Weeks 5-8 | **Status**: COMPLETE ✓ (2026-03-03)
- Course player with video support (Google Drive initially)
- Lesson progress tracking (watched time, completion)
- Teacher profile page (view/edit name, school, password)
- Course search and filtering
- Skeleton loaders and empty state UX

**Deliverables**:
- Course player with Tiptap content renderer
- Progress tracking API endpoints
- Teacher profile editor
- Search functionality across courses
- Mobile-first responsive design

### Phase 3: Lesson Plan Builder
**Timeline**: Weeks 9-12 | **Status**: COMPLETE ✓ (2026-03-03)
- Lesson plan template per program (Tiptap JSON)
- Template management (admin: create/edit/list)
- Teacher lesson plan editor (save/edit/view)
- Two distinct template structures (3 programs, 2 template types):

  **Buttercup Template Structure**:
  | No | Type of Materials | Material Names | Vocabulary Cards | Extra Props | Est. Duration | Objectives | Teaching Notes |
  |----|--------------------|---|---|---|---|---|---|
  | 1 | Song | (material) | (vocab) | (props) | 5 min | (obj) | (notes) |
  Activity types: Song, Story, Phonics set, Moving Along, Chant, Transitions

  **Primary Success / Primary Secondary Template Structure** (shared format):
  | No | Activity | Details | Extra Props | Est. Duration | Objectives | Notes (COMPULSORY/OPTIONAL) |
  |----|----------|---------|-------------|---|---|---|
  | 1 | (activity) | (details) | (props) | 10 min | (obj) | COMPULSORY |
  90-min sessions with Break rows and Total Duration row

- Lesson plan CRUD (create, save, list, delete)
- Per-program template editing (admin)

**Deliverables**:
- Tiptap-based lesson plan editor
- Template management admin panel
- Lesson plan CRUD API endpoints
- Teacher lesson plan list page
- Program template storage system

### Phase 4: Security & Polish
**Timeline**: Weeks 13-16 | **Status**: COMPLETE ✓ (2026-03-03)
- DRM (Digital Rights Management):
  - Watermark with user email + timestamp
  - Page blur on window focus-out (8px blur)
  - Disabled right-click/context menu on lesson player
  - User-select disabled on `.drm-zone`
- Admin reports (system-wide user progress, course completion)
- Manager reports (school-scoped user progress, course completion)
- Favorite courses feature
- Session cleanup cron job
- Note: Bunny.net integration deferred (Google Drive currently active)

**Deliverables**:
- DRM-protected lesson player
- Admin reports dashboard (all schools)
- Manager reports dashboard (own school only)
- Favorite courses toggle
- Bunny.net integration (Phase 4 upgrade from Google Drive)
- Session expiry automation

## Lesson Plan Templates (Detailed)

### Buttercup Program Template
Structured for song-based English instruction with material support.

**Columns**:
- **No** (activity sequence number)
- **Type of Materials** (Song, Story, Phonics set, Moving Along, Chant, Transitions)
- **Material Names** (specific songs, stories, etc.)
- **Vocabulary Cards** (vocabulary taught)
- **Extra Props** (physical materials needed)
- **Est. Duration** (time in minutes)
- **Objectives** (teaching objectives)
- **Teaching Notes** (implementation guidance)

**Stored as**: Tiptap JSON in `Program.lessonPlanTemplate`

### Primary Success Program Template
Structured for 90-minute classroom sessions with activity breakdown.

**Columns**:
- **No** (activity sequence number)
- **Activity** (type of activity)
- **Details** (specific implementation details)
- **Extra Props** (materials needed)
- **Est. Duration** (time in minutes)
- **Objectives** (learning objectives)
- **Notes** (COMPULSORY or OPTIONAL designation)

**Special Rows**:
- Break row (mid-session break)
- Total Duration row (sum of all activities)

**Stored as**: Tiptap JSON in `Program.lessonPlanTemplate`

## Non-Goals

- Payment/billing system (internal training only)
- Student accounts or student-facing features
- Video upload/hosting (external services only: Google Drive, Bunny.net)
- Real-time collaboration on lesson plans
- Advanced learning analytics (reports limited to progress tracking)
- Mobile app (responsive web only)

## Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| **System Uptime** | Availability | 99% monthly |
| **Auth Security** | Zero unauthorized access | 100% protected routes |
| **Course Enrollment** | Access control accuracy | 100% (UserProgram + Enrollment verified) |
| **Teacher Adoption** | Dashboard login frequency | 50%+ weekly active users |
| **Content Protection** | DRM evasion attempts | 0 unmitigated breaches (Phase 4) |
| **Database Performance** | Query response time | <200ms for dashboard |
| **Soft Delete Integrity** | Orphaned data | 0 undeleted references |
| **Session Management** | Stale session count | <1% of active sessions |
| **Template Usability** | Lesson plan creation rate | 30%+ of teachers create >1 plan/month |
| **Admin Efficiency** | User CRUD time | <2 min per user (UI-assisted) |

## Technical Constraints

- **Single VPS**: 2-4 CPU, 4GB RAM, 50GB SSD
- **PostgreSQL**: Primary datastore, Prisma ORM
- **No external LMS**: Custom-built solution
- **Browser support**: Chrome, Firefox, Safari (latest 2 versions)
- **Mobile**: Responsive (360px minimum width)
- **Session duration**: 8 hours JWT expiry
- **File uploads**: None (lesson plans text-only, videos external)
- **Scalability**: Designed for ~100 concurrent users

## Key Functional Requirements

1. **User Management**
   - Admin can create/edit/delete/restore users (managers, teachers, teaching assistants)
   - Users have: email, name, school, role (ADMIN/MANAGER/TEACHER/TEACHING_ASSISTANT), program(s)
   - Manager role requires non-null school field (validation enforced)
   - Soft delete on users (keep history for audit)

2. **Program & Course Management**
   - Admin can create/edit programs with unique slugs
   - Courses belong to programs (TRAINING or MATERIAL type, BASIC or ADVANCED level)
   - Course ordering maintained via `order` field
   - Lessons within courses (ordered, with title/content/video/materials)

3. **Access Control**
   - User must have `UserProgram` (program membership) AND `Enrollment` (course grant)
   - Gate 3: CourseLevel check — ADVANCED courses accessible only by ADMIN and TEACHER roles
   - Revoking program deletes `UserProgram` only (soft revoke)
   - Progress/Enrollment remain in DB (restore access = restore UserProgram)

4. **Authentication**
   - Email + password login
   - JWT token (8h expiry) stored in httpOnly `auth-token` cookie
   - Session table for logout support (`jti`, `invalidated`, `expiresAt`)
   - CSRF protection via double-submit cookie on mutating requests
   - Middleware enforces auth on all protected routes

5. **Progress Tracking**
   - Teacher progress per lesson (completed flag, watchedTime in seconds)
   - Dashboard shows course progress (e.g., 3/5 lessons complete)
   - Lesson player tracks watched time continuously

6. **Lesson Plan Management**
   - Teachers and Teaching Assistants create lesson plans linked to programs
   - Plans stored as Tiptap JSON content
   - Only Teachers can export as PDF/Word; TAs cannot export
   - Managers can view program templates (read-only) but cannot create plans
   - Admin manages per-program templates
   - Teachers and TAs can duplicate templates to create new plans

7. **Content Protection** (Phase 4)
   - Watermark overlay with user email + timestamp
   - Page blur on visibility change (tab switch, window blur)
   - Right-click disabled on video element
   - `.drm-zone` CSS isolation (prevents easy bypassing)

## Key Non-Functional Requirements

- **Performance**: Dashboard load <2s, course player <1s
- **Accessibility**: WCAG 2.1 AA minimum, keyboard navigation, ARIA labels
- **Security**: OWASP Top 10 compliance, SQL injection prevention (Prisma), XSS mitigation
- **Reliability**: Session cleanup cron, expired token handling, graceful degradation
- **Maintainability**: Code standards (200 LOC max), clear error messages, comprehensive logging
- **Scalability**: Designed for 100 concurrent users initially; can scale to 1000+ with load balancing

## Acceptance Criteria Checklist

- [x] Phase 1: Login + User/Program/Course CRUD + Dashboard (12 items) — COMPLETE
- [x] Phase 2: Course player + Progress + Profile + Search (6 items) — COMPLETE
- [x] Phase 3: Lesson plan editor + Templates + Admin template management (7 items) — COMPLETE
- [x] Phase 4: DRM + Watermark + Reports + Session cleanup (7 items) — COMPLETE

Total: 32 verification items. ALL COMPLETE as of 2026-03-03.
