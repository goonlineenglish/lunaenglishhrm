# Project Roadmap

## Overview

Buttercup LMS development divided into 4 sequential phases over ~17 weeks (16 base + 4 days for 4-role expansion). Each phase builds on previous foundation. Status: All phases pending (project initialization).

**Last Updated**: 2026-03-02

## Timeline & Milestones

| Phase | Duration | Status | Key Deliverables |
|-------|----------|--------|------------------|
| **1. Foundation** | Weeks 1-4 | Pending | Auth, 4-Role System, User/Program/Course CRUD, Dashboard |
| **2. Learning** | Weeks 5-8 | Pending | Course player, Progress tracking, Profile |
| **3. Lesson Plan Builder** | Weeks 9-12 | Pending | Tiptap editor, Templates, Admin panel |
| **4. Security & Polish** | Weeks 13-16 | Pending | DRM, Watermark, Reports, Bunny.net |

**Start Date**: To be determined
**Target Launch**: 16 weeks from start

## Phase 1: Foundation (Weeks 1-4)

**Priority**: Critical | **Status**: Pending

### Overview
Establish authentication, user management, program/course infrastructure, and basic dashboard. Teacher can log in and see enrolled courses.

### Key Deliverables
1. User authentication (login/logout with JWT + httpOnly cookies)
2. User management CRUD (admin only)
3. Program management CRUD (admin only)
4. Course management CRUD (admin only)
5. Teacher dashboard with enrolled courses
6. Database schema with soft delete support
7. 4-role system (ADMIN, MANAGER, TEACHER, TEACHING_ASSISTANT)

### Implementation Focus

**Authentication System**:
- Login form with email/password validation
- JWT token generation (8h expiry)
- Session table (jti, invalidated flag)
- Middleware route protection
- Logout with session invalidation
- Password hashing (bcrypt)

**User Management**:
- Admin panel: user list, create, edit, delete, restore
- User fields: email, name, school, role (ADMIN/MANAGER/TEACHER/TEACHING_ASSISTANT)
- Manager role requires school field (validation enforced)
- Soft delete (keep history for audit)
- Email uniqueness validation

**Program Management**:
- Admin panel: program list, create, edit, delete
- Program fields: name, slug (unique), description
- Lesson plan template storage (Tiptap JSON)
- Soft delete support

**Course Management**:
- Admin panel: course list per program, create, edit, delete, reorder
- Course fields: title, description, type (TRAINING/MATERIAL), level (BASIC/ADVANCED), order
- CourseLevel classification: BASIC (all roles) or ADVANCED (admin/teacher only)
- Lesson management: add/edit lessons (title, content, video URL, materials)
- Soft delete support

**Teacher Dashboard**:
- List courses where user has BOTH UserProgram (program membership) AND Enrollment (course grant)
- Query joins UserProgram + Enrollment + Course, filters isDeleted=false on all
- Course card: title, description, lesson count
- Quick start button → course player
- Empty state: "No courses — contact administrator"

**Database Schema** (9 Prisma models + 2 new enums):
```
User, Session, Program, UserProgram, Course, Lesson,
Enrollment, Progress, LessonPlan
+ CourseLevel, Role enums
```

### Related Code Files
**Create**:
- `app/(auth)/login/page.tsx` — Login page
- `app/(auth)/login/login-form.tsx` — Login form component
- `app/(dashboard)/page.tsx` — Dashboard
- `app/admin/users/page.tsx` — User management
- `app/admin/programs/page.tsx` — Program management
- `app/admin/courses/page.tsx` — Course management
- `lib/actions/auth-actions.ts` — Auth server actions
- `lib/actions/user-actions.ts` — User CRUD actions
- `lib/actions/program-actions.ts` — Program CRUD actions
- `lib/actions/course-actions.ts` — Course CRUD actions
- `lib/services/auth-service.ts` — JWT, password hashing
- `lib/services/access-control-service.ts` — Access checks
- `lib/services/role-permissions-service.ts` — Role permission map
- `components/shared/role-gate.tsx` — Conditional rendering by role
- `middleware.ts` — Route protection, auth guard
- `prisma/schema.prisma` — Database schema

### Success Criteria
- Login/logout works with JWT + session table
- All CRUD operations return proper errors
- Soft delete filtering applied to all queries
- Middleware protects /admin and /dashboard routes
- Dashboard loads <2s with <10 courses
- Mobile responsive (360px minimum)
- Accessibility: keyboard nav, ARIA labels on admin forms
- 4 roles create/login correctly with appropriate redirects
- CourseLevel filter hides ADVANCED courses from Manager/TA
- Manager sees only school-scoped users via /dashboard/reports/ (NOT /admin/*)

### Testing Checklist
- [ ] Admin can create user → login works
- [ ] Admin can create program with unique slug
- [ ] Admin can create course and add lessons (max 5 items)
- [ ] Course order maintained after save
- [ ] Dashboard shows enrolled courses (0 courses = empty state)
- [ ] Dashboard only shows courses with BOTH UserProgram + Enrollment
- [ ] Logout clears session + cookie
- [ ] Accessing protected route after logout → redirect to /login
- [ ] Soft delete: admin deletes user → not visible in list, can restore
- [ ] Admin creates Manager with school → login → sees /dashboard
- [ ] Admin creates TA → login → sees /dashboard
- [ ] Manager cannot access /admin/* (403)
- [ ] TA cannot see ADVANCED courses in course list
- [ ] CSRF: POST without X-CSRF-Token header → 403
- [ ] Revoke program → teacher loses access immediately, progress kept
- [ ] Re-assign program → teacher regains access, progress intact
- [ ] API /api/users without valid JWT → 401

### Risk Assessment
- JWT expiry handling (edge case: token expires mid-action)
- Session cleanup performance (will need cron job by Phase 2)
- Soft delete complexity (requires WHERE filter everywhere)
- Password reset not included (out of scope Phase 1)

### Next Steps
- Set up linting/testing framework before Phase 2
- Document session cleanup cron setup for production
- Begin Phase 2 research on video platforms

---

## Phase 2: Learning & Progress (Weeks 5-8)

**Priority**: High | **Status**: Pending

### Overview
Build course player with video support, progress tracking, teacher profile page, and search functionality. Teachers can complete lessons and track progress.

### Key Deliverables
1. Course player with Tiptap content rendering
2. Video player (Google Drive embed; Bunny.net upgrade in Phase 4)
3. Progress tracking (watched time, completion)
4. Teacher profile page (view/edit name, school, password)
5. Course search and filtering
6. Skeleton loaders and empty state UI

### Implementation Focus

**Course Player**:
- Layout: video on top (responsive), lesson sidebar
- Video player: play, pause, fullscreen, volume controls
- Lesson content: render Tiptap JSON (formatted text, images, tables)
- Materials list: downloadable links (external files)
- Navigation: next/previous lesson buttons
- Mobile: video full-screen on tap

**Progress Tracking**:
- Track watched time (continuous update via API)
- Mark lesson as completed (checkbox + POST)
- Progress bar per course (X/Y lessons complete)
- Last-watched position preserved (Phase 2 enhancement)
- API endpoint: `POST /api/progress` with lessonId, watchedTime (userId derived from JWT server-side)

**Teacher Profile**:
- View: email (read-only), name, school
- Edit: name, school, password
- Password change: old + new password validation
- Error handling: validation errors, password mismatch

**Search & Filtering**:
- Search by course title, description
- Filter by program
- Filter by completion status (not started, in progress, completed)
- Results pagination (20 per page)

**UX Enhancements**:
- Skeleton loaders for course list, player
- Transitions when switching lessons
- Toasts for progress saved
- Error boundaries with retry option

### Related Code Files
**Create**:
- `app/(dashboard)/courses/[id]/page.tsx` — Course player
- `components/course-player/video-player.tsx` — Video embed
- `components/course-player/lesson-sidebar.tsx` — Lesson list
- `components/shared/skeleton.tsx` — Loading skeleton
- `app/(dashboard)/profile/page.tsx` — Profile page
- `app/(dashboard)/page.tsx` (update) — Add search
- `lib/actions/progress-actions.ts` — Progress tracking
- `lib/actions/profile-actions.ts` — Profile updates
- `lib/services/progress-service.ts` — Progress logic
- `app/api/progress/route.ts` — Progress API endpoint

### Success Criteria
- Course player loads <1s (cached video)
- Video playback smooth (no buffering test)
- Progress updates auto-save every 30 seconds
- Search returns results <200ms
- Profile changes persist across sessions
- Skeleton loaders appear before data loads (no white flash)
- Mobile: video full-screen on vertical orientation
- Accessibility: video controls keyboard accessible

### Testing Checklist
- [ ] Play video → watched time updates
- [ ] Mark lesson complete → progress bar updates
- [ ] Refresh page → watched time restored
- [ ] Search course title → results show (case-insensitive)
- [ ] Filter by program → only that program's courses show
- [ ] Update profile name → persists across login (email not updatable)
- [ ] Change password → can log in with new password
- [ ] Network offline → graceful error message

### Risk Assessment
- Video embedding (Google Drive may have playback restrictions)
- Watched time sync (potential race condition on fast clicks)
- Search performance (need database indexes on title, description)
- Profile password validation (ensure old password verified)

### Next Steps
- Evaluate Google Drive playback performance; plan Bunny.net migration
- Set up database indexes for search performance
- Begin Phase 3 research on Tiptap templates

---

## Phase 3: Lesson Plan Builder (Weeks 9-12)

**Priority**: High | **Status**: Pending

### Overview
Build Tiptap-based lesson plan editor with per-program templates. Teachers create, save, and edit lesson plans. Admin manages program templates.

### Key Deliverables
1. Lesson plan template management (admin)
2. Tiptap-based lesson plan editor (teacher)
3. Template structures (Buttercup template + Primary Success/Secondary shared template)
4. Lesson plan CRUD (save, list, edit, delete)
5. Lesson plan duplication from templates
6. Teacher lesson plan list with search/filter

### Implementation Focus

**Admin Template Management**:
- View per-program template
- Edit template (Tiptap editor)
- Save changes → update `Program.lessonPlanTemplate`
- Preview template → readonly Tiptap render
- Two templates provided (see project overview for structures)
- Primary Secondary shares Primary Success template format

**Lesson Plan Editor**:
- Tiptap rich editor (headings, bold, italic, lists, tables)
- Table insertion with pre-defined columns (program-specific)
- Save button → creates/updates `LessonPlan` record
- Auto-save every 30 seconds (draft state)
- Clear/cancel without saving
- Accessible to TEACHER and TEACHING_ASSISTANT roles
- Export restricted to TEACHER role only (TA blocked)

**Buttercup Template Structure**:
| No | Type of Materials | Material Names | Vocabulary Cards | Extra Props | Est. Duration | Objectives | Teaching Notes |
- Pre-populated table rows (for activities)
- Row insertion/deletion

**Primary Success Template Structure**:
| No | Activity | Details | Extra Props | Est. Duration | Objectives | Notes |
- 90-min session with break rows
- Total duration calculation

**Lesson Plan List Page**:
- List teacher's lesson plans (title, program, last edited)
- Create new plan (select template → new blank plan)
- Edit link → open editor
- Delete button (with confirmation)
- Search by title
- Filter by program

**Import/Export** (Phase 3 enhancement):
- Export plan as PDF (using html2pdf or similar)
- Export as Word document (.docx)
- Export restricted to TEACHER role only (TA blocked)

**Template Viewer (Manager)**: Read-only Tiptap rendering at /dashboard/templates/[programId]

### Related Code Files
**Create**:
- `app/admin/templates/page.tsx` — Template management
- `app/admin/templates/[programId]/page.tsx` — Template editor page
- `app/(dashboard)/lesson-plans/page.tsx` — Lesson plan list
- `app/(dashboard)/lesson-plans/[id]/page.tsx` — Plan editor page
- `app/(dashboard)/lesson-plans/new/page.tsx` — New plan creation
- `components/tiptap/editor.tsx` — Tiptap wrapper (component, not route)
- `components/tiptap/menu-bar.tsx` — Formatting toolbar
- `lib/actions/lesson-plan-actions.ts` — Plan CRUD
- `lib/actions/template-actions.ts` — Template management
- `lib/services/template-service.ts` — Template logic

### Success Criteria
- Tiptap editor loads with toolbar (8+ formatting options)
- Template table editable with row add/delete
- Save plan → retrieves with correct data
- Auto-save every 30s without losing focus
- Plan list loads <500ms (paginated if >50 plans)
- Template preview read-only, non-interactive
- PDF export preserves formatting
- Mobile: editor full-width, toolbar wraps if needed

### Testing Checklist
- [ ] Admin edits template → changes visible in new plans
- [ ] Teacher creates plan from Buttercup template → table columns correct
- [ ] Teacher adds row to template table → data saved
- [ ] Teacher auto-saves → refresh page, data intact
- [ ] Teacher exports plan as PDF → formatting correct
- [ ] Search plans by title → case-insensitive
- [ ] Filter plans by program → only that program shows
- [ ] Delete plan → confirmation required, then removed
- [ ] TA can create lesson plan → save works
- [ ] TA cannot see export button (PDF/Word)
- [ ] Manager can view template → read-only mode

### Risk Assessment
- Tiptap learning curve (configuration complexity)
- Table handling in Tiptap (custom plugins needed for dynamic tables)
- PDF export quality (may need specific library)
- Template versioning (if template changes, old plans should be unaffected)

### Next Steps
- Evaluate Tiptap table plugin options
- Plan PDF export library selection
- Begin Phase 4 research on DRM implementation

---

## Phase 4: Security & Polish (Weeks 13-16)

**Priority**: Medium | **Status**: Pending

### Overview
Add DRM protection to lesson content, create admin reports, implement Bunny.net video platform, add favorites feature. Production-ready polish.

### Key Deliverables
1. DRM protection (watermark, page blur, right-click disable)
2. Admin reports (user progress, course completion)
3. Favorite courses feature (all authenticated roles)
4. Bunny.net Stream integration (video platform upgrade)
5. Session cleanup cron job
6. Performance optimization & caching

### Implementation Focus

**DRM Protection**:
- Watermark overlay: user email + timestamp, repositioned every 30s
- Page blur on visibility change (tab switch, window blur)
- Right-click context menu disabled on video
- CSS user-select disabled on `.drm-zone`
- Transparent overlay prevents copying
- NOT blocking video controls (playback must remain accessible)

**Admin Reports**:
- User progress report: email, courses enrolled, completion %
- Course completion report: title, total enrollments, % complete
- Activity report: logins, last login date
- Export reports as CSV
- Date range filtering (this week, this month, all time)
- Admin reports: system-wide view
- Manager reports: school-scoped view at /dashboard/reports/

**Favorite Courses**:
- Heart icon on course card (toggleable)
- Teacher's favorites list (separate view)
- Favorite persists in database via `Favorite` junction table (userId, courseId)
- Available to all roles (ADMIN, MANAGER, TEACHER, TA per role permissions table)

**Bunny.net Integration**:
- Replace Google Drive with Bunny.net Stream
- Video upload → Bunny.net library
- Video URL → embedded player
- Quality options (auto, 720p, 1080p)
- Bandwidth tracking (admin dashboard)

**Cron Job**:
- Automated session expiry cleanup (daily 3 AM)
- Delete `sessions WHERE expiresAt < NOW()`

**Performance**:
- CDN caching for static assets (CSS, JS, images)
- Database query optimization (add indexes)
- Image compression (next/image component)
- Code splitting for admin routes

### Related Code Files
**Create**:
- `components/course-player/drm-zone.tsx` — DRM wrapper
- `components/shared/watermark.tsx` — Watermark component
- `app/admin/reports/page.tsx` — Reports dashboard
- `app/admin/reports/progress/page.tsx` — Progress report
- `app/admin/reports/completion/page.tsx` — Completion report
- `lib/actions/favorite-actions.ts` — Favorite toggle
- `lib/services/bunny-service.ts` — Bunny.net API
- `lib/cron/session-cleanup.ts` — Cleanup job
- `components/shared/favorite-button.tsx` — Favorite toggle UI

### Success Criteria
- Watermark visible but not obstructive (15% opacity)
- Page blur activates <100ms on visibility change
- Reports load <2s with 500+ users
- Favorite toggle instant (optimistic UI)
- Bunny.net video streams at adaptive bitrate
- Session cleanup removes 90%+ expired sessions
- Admin panel performance optimized (Lighthouse >90)
- Mobile-responsive admin reports (charts readable at 768px+)

### Testing Checklist
- [ ] DRM watermark visible in lesson player
- [ ] Page blur activates when switching tabs
- [ ] Right-click menu disabled on video (not on page)
- [ ] Admin generates progress report → data accurate
- [ ] Report export as CSV → opens in Excel
- [ ] Teacher toggles favorite → persists across refresh
- [ ] Bunny.net video plays at multiple qualities
- [ ] Session cron job deletes 100+ expired sessions
- [ ] Admin panel performance acceptable (Lighthouse test)
- [ ] Mobile admin: reports readable, filters don't overflow
- [ ] Manager reports show only same-school users
- [ ] Manager cannot see users from other schools

### Risk Assessment
- DRM easily bypassed (expected; not military-grade, just basic)
- Bunny.net cost (factor into deployment)
- Report performance with large datasets (need pagination/sampling)
- Watermark CPU impact (repositioning every 30s)

### Next Steps
- Schedule Phase 4 kickoff after Phase 3 completion
- Evaluate Bunny.net cost vs. Google Drive
- Plan DRM testing strategy (validate non-trivial to bypass, not trivial)
- Document production monitoring setup

---

## Verification Checklist (32 Items)

Phase completion verification across all phases:

### Phase 1 Foundation
- [ ] Login with email/password → JWT token issued + httpOnly cookie set
- [ ] Session table records created on login, cleared on logout
- [ ] Admin creates user → user can login
- [ ] Admin creates program with unique slug
- [ ] Admin creates course + lessons (5 max per test)
- [ ] Teacher dashboard shows enrolled courses only (UserProgram + Enrollment)
- [ ] Manager login → /dashboard (not /admin)
- [ ] TA login → sees BASIC courses only, ADVANCED hidden
- [ ] CSRF: mutating request without token → 403
- [ ] Revoke program → access blocked, progress kept; re-assign → restored
- [ ] API requests without valid JWT → 401
- [ ] Dashboard shows 0 courses after revoking all programs

### Phase 2 Learning
- [ ] Course player renders Tiptap content correctly
- [ ] Video plays without errors (Google Drive or test video)
- [ ] Watched time auto-saves every 30 seconds
- [ ] Mark lesson complete → progress bar updates
- [ ] Teacher profile page loads + edit name persists
- [ ] Search finds courses by title (case-insensitive)

### Phase 3 Lesson Plan Builder
- [ ] Admin edits program template → changes visible in new plans
- [ ] Teacher creates lesson plan from template
- [ ] Tiptap editor table editable + rows add/delete
- [ ] Auto-save every 30s preserves content on refresh
- [ ] PDF export preserves formatting
- [ ] Lesson plan list searchable and filterable
- [ ] TA creates lesson plan but export button is hidden

### Phase 4 Security & Polish
- [ ] Watermark visible in lesson player (15% opacity, repositions)
- [ ] Page blur activates on tab switch + window blur
- [ ] Right-click disabled on video element
- [ ] Admin progress report generates <2s
- [ ] Manager views school-scoped reports (own school users only)
- [ ] Teacher favorite toggle persists across refresh
- [ ] Bunny.net video streams (or Google Drive for Phase 1-3)

---

## Dependencies & Blockers

### Phase 1 Blockers
- None (self-contained foundation). Role expansion adds ~1 day.

### Phase 2 Blockers
- Phase 1 completion required
- Google Drive video embedding test (may require API setup)

### Phase 3 Blockers
- Phase 2 completion required
- Tiptap configuration finalized
- Template JSON structure approved

### Phase 4 Blockers
- Phase 3 completion required
- Bunny.net account + API key
- DRM strategy approved (scope: basic, not military-grade)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **System Uptime** | 99% | Monthly monitoring |
| **Auth Success Rate** | 99.9% | Failed login count |
| **Course Completion Rate** | 30%+ | Teachers/lessons completed |
| **Page Load Time** | <2s | Dashboard + course list |
| **Admin Task Duration** | <5 min | User create/delete |
| **Mobile Usage** | 20%+ | Mobile session %, >360px |
| **Teacher Adoption** | 50%+ | Weekly active users |
| **Favorite Courses** | 25%+ | Users with >1 favorite |
| **Report Accuracy** | 100% | Spot-check against DB |
| **DRM Effectiveness** | N/A | No known bypasses documented |
| **Role Adoption** | 100% | All 4 roles used by staff |

---

## Post-Launch (Phase 5, Future)

Not in current roadmap but planned enhancements:
- Real-time video conferencing (Zoom/Jitsi integration)
- Discussion forums per course
- Peer feedback on lesson plans
- Mobile app (React Native)
- Advanced analytics (time-on-task, learning paths)
- Integration with HR system (attendance linking)
- Video transcription + searchable captions
- AI-powered lesson plan suggestions
