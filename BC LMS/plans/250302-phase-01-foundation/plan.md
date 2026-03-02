---
title: "Phase 1: Foundation - Auth, CRUD, Dashboard"
description: "Greenfield setup for Buttercup LMS: Next.js 15, Prisma, JWT auth, 4-role system, admin CRUD, teacher dashboard"
status: pending
priority: P1
effort: 40h
branch: main
tags: [phase-1, foundation, auth, crud, dashboard, prisma]
created: 2026-03-02
---

# Phase 1: Foundation

## Summary

Establish the Buttercup LMS from zero: project scaffolding, database schema, JWT auth with CSRF, admin CRUD panels for users/programs/courses, and teacher dashboard with Three-Gate access control.

## Sub-Phases

| # | Phase File | Scope | Effort | Depends On |
|---|-----------|-------|--------|------------|
| 1 | [phase-01-project-init-and-schema.md](./phase-01-project-init-and-schema.md) | Next.js init, Prisma schema, env, seed | 5h | None |
| 2 | [phase-02-auth-system.md](./phase-02-auth-system.md) | JWT, session, login/logout, middleware, CSRF | 8h | Phase 1 |
| 3 | [phase-03-admin-user-management.md](./phase-03-admin-user-management.md) | User CRUD, soft delete, role badges | 6h | Phase 2 |
| 4 | [phase-04-admin-program-management.md](./phase-04-admin-program-management.md) | Program CRUD, slug validation, soft delete | 5h | Phase 2 |
| 5 | [phase-05-admin-course-management.md](./phase-05-admin-course-management.md) | Course + Lesson CRUD, ordering, CourseLevel | 7h | Phase 4 |
| 6 | [phase-06-teacher-dashboard.md](./phase-06-teacher-dashboard.md) | Dashboard, Three-Gate access, empty state | 5h | Phase 3, 4, 5 |
| 7 | [phase-07-testing-and-verification.md](./phase-07-testing-and-verification.md) | 17 test items, build verification | 4h | Phase 6 |

## Dependency Graph

```
Phase 1 (Init) ──► Phase 2 (Auth) ──┬──► Phase 3 (Users)  ──┐
                                     ├──► Phase 4 (Programs) ─┤──► Phase 6 (Dashboard) ──► Phase 7 (Testing)
                                     └──► Phase 5 (Courses) ──┘
```

Phases 3, 4, 5 can run in parallel after Phase 2 completes.

## Key Decisions

- Next.js 15 App Router with `use server` actions
- PostgreSQL + Prisma ORM, 9 models + 2 enums
- Custom JWT (jose lib) + httpOnly cookies, 8h expiry
- CSRF double-submit cookie on POST/PUT/DELETE
- Soft delete via `isDeleted` flag, service-level child checks
- 4 roles: ADMIN, MANAGER, TEACHER, TEACHING_ASSISTANT
- CourseLevel: BASIC (all) / ADVANCED (admin+teacher)
- Brand: primary=#4F46E5 (indigo)

## Success Criteria

- [ ] Login/logout works with JWT + session DB
- [ ] All CRUD returns proper errors
- [ ] Soft delete filtering on all queries
- [ ] Middleware protects /admin and /dashboard
- [ ] Dashboard loads <2s with <10 courses
- [ ] Mobile responsive (360px min)
- [ ] 4 roles create/login with correct redirects
- [ ] 17 test items pass (see phase-07)

## References

- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)
- [Design Guidelines](../../docs/design-guidelines.md)
- [Project Roadmap](../../docs/project-roadmap.md)
- [Decisions Doc](../../docs/quiet-coalescing-marshmallow.md)
