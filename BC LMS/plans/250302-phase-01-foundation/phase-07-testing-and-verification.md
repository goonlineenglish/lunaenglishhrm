---
phase: 7
title: "Testing & Verification"
status: pending
effort: 4h
depends_on: [phase-06]
blocks: []
---

# Phase 07: Testing & Verification

## Context Links

- [Project Roadmap - Testing Checklist](../../docs/project-roadmap.md)
- [Code Standards - Testing Standards](../../docs/code-standards.md)
- [System Architecture - State Machines](../../docs/system-architecture.md)

## Overview

**Priority**: High
**Status**: Pending
**Description**: Verify all 17 Phase 1 test items, set up testing framework (Vitest), write critical unit tests for auth service and access control, and ensure build passes.

## Key Insights

- 17 test items from project-roadmap.md Testing Checklist
- Vitest for unit tests (configured by Next.js default)
- Focus on: auth flow, access control service, soft delete service
- Integration testing: manual or via test scripts calling server actions
- Build verification: `npm run build` must pass
- Lint verification: `npm run lint` must pass

## Requirements

### Functional (17 Test Items)
1. Admin can create user -> login works
2. Admin can create program with unique slug
3. Admin can create course and add lessons (max 5 items)
4. Course order maintained after save
5. Dashboard shows enrolled courses (0 courses = empty state)
6. Dashboard only shows courses with BOTH UserProgram + Enrollment
7. Logout clears session + cookie
8. Accessing protected route after logout -> redirect to /login
9. Soft delete: admin deletes user -> not visible in list, can restore
10. Admin creates Manager with school -> login -> sees /dashboard
11. Admin creates TA -> login -> sees /dashboard
12. Manager cannot access /admin/* (403)
13. TA cannot see ADVANCED courses in course list
14. CSRF: POST without X-CSRF-Token header -> 403
15. Revoke program -> teacher loses access immediately, progress kept
16. Re-assign program -> teacher regains access, progress intact
17. API /api/users without valid JWT -> 401

### Non-Functional
- `npm run build` passes
- `npm run lint` passes
- Unit test coverage on critical services

## Architecture

### Test Structure
```
tests/
├── unit/
│   ├── auth-service.test.ts
│   ├── access-control-service.test.ts
│   ├── soft-delete-service.test.ts
│   ├── role-permissions-service.test.ts
│   └── jwt-helpers.test.ts
├── integration/
│   └── (manual test scripts or Playwright later)
└── setup.ts
```

## Related Code Files

### Create
- `tests/unit/auth-service.test.ts`
- `tests/unit/access-control-service.test.ts`
- `tests/unit/soft-delete-service.test.ts`
- `tests/unit/role-permissions-service.test.ts`
- `tests/unit/jwt-helpers.test.ts`
- `vitest.config.ts` -- Vitest configuration

### Verify (not create)
- All files from Phase 01-06

## Implementation Steps

### 1. Configure Vitest (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### 2. Add test scripts to `package.json`
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Write JWT helpers tests (`tests/unit/jwt-helpers.test.ts`)
```typescript
describe('JWT Helpers', () => {
  it('should sign and verify a valid token', async () => {
    const payload = { sub: 'user1', jti: 'sess1', email: 'test@test.com', role: 'TEACHER', school: null };
    const token = await signJwt(payload);
    const verified = await verifyJwt(token);
    expect(verified?.sub).toBe('user1');
  });

  it('should return null for invalid token', async () => {
    const result = await verifyJwt('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for expired token', async () => {
    // Test with manually expired token
  });
});
```

### 4. Write role permissions tests (`tests/unit/role-permissions-service.test.ts`)
```typescript
describe('RolePermissionsService', () => {
  it('ADMIN has users:crud', () => {
    expect(hasPermission('ADMIN', 'users:crud')).toBe(true);
  });
  it('TEACHER does not have users:crud', () => {
    expect(hasPermission('TEACHER', 'users:crud')).toBe(false);
  });
  it('TEACHER has courses:view_advanced', () => {
    expect(hasPermission('TEACHER', 'courses:view_advanced')).toBe(true);
  });
  it('TA does not have courses:view_advanced', () => {
    expect(hasPermission('TEACHING_ASSISTANT', 'courses:view_advanced')).toBe(false);
  });
  it('TA has lesson_plans:create', () => {
    expect(hasPermission('TEACHING_ASSISTANT', 'lesson_plans:create')).toBe(true);
  });
  it('TA does not have lesson_plans:export', () => {
    expect(hasPermission('TEACHING_ASSISTANT', 'lesson_plans:export')).toBe(false);
  });
});
```

### 5. Write access control tests (`tests/unit/access-control-service.test.ts`)
```typescript
describe('AccessControlService', () => {
  it('canAccessCourseLevel: BASIC allowed for all roles', () => {
    expect(canAccessCourseLevel('TEACHER', 'BASIC')).toBe(true);
    expect(canAccessCourseLevel('TEACHING_ASSISTANT', 'BASIC')).toBe(true);
    expect(canAccessCourseLevel('MANAGER', 'BASIC')).toBe(true);
  });

  it('canAccessCourseLevel: ADVANCED only for ADMIN + TEACHER', () => {
    expect(canAccessCourseLevel('ADMIN', 'ADVANCED')).toBe(true);
    expect(canAccessCourseLevel('TEACHER', 'ADVANCED')).toBe(true);
    expect(canAccessCourseLevel('MANAGER', 'ADVANCED')).toBe(false);
    expect(canAccessCourseLevel('TEACHING_ASSISTANT', 'ADVANCED')).toBe(false);
  });
});
```

### 6. Write auth service tests (`tests/unit/auth-service.test.ts`)
```typescript
describe('AuthService', () => {
  it('should hash and compare password correctly', async () => {
    const hash = await hashPassword('testpassword');
    const match = await comparePassword('testpassword', hash);
    expect(match).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('testpassword');
    const match = await comparePassword('wrongpassword', hash);
    expect(match).toBe(false);
  });
});
```

### 7. Write soft delete service tests (`tests/unit/soft-delete-service.test.ts`)
- Test `canSoftDeleteProgram` with/without active courses
- Test `canSoftDeleteCourse` with/without active lessons
- These require DB mocking or test database

### 8. Manual verification checklist (17 items)

Execute each test item manually against running dev server:

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Admin creates user, user logs in | Create user via admin panel -> login with new credentials | Login succeeds, dashboard shown |
| 2 | Admin creates program with unique slug | Create program "Test Program" -> slug "test-program" | Program appears in list |
| 3 | Admin creates course + lessons | Create course, add 5 lessons | Course shows 5 lessons |
| 4 | Course order maintained | Create courses with order 1,2,3 -> refresh | Order preserved |
| 5 | Dashboard shows enrolled courses | Assign program + enroll in course -> check dashboard | Course card visible |
| 6 | Dashboard requires BOTH gates | Enroll without UserProgram -> check dashboard | Course NOT visible |
| 7 | Logout clears session | Click logout -> check DB session.invalidated | Session invalidated=true |
| 8 | Protected route after logout | Logout -> navigate to /dashboard | Redirect to /login |
| 9 | Soft delete user | Delete user -> check list -> restore | User hidden then restored |
| 10 | Manager with school | Create manager with school="Tan Mai" -> login | Dashboard shown |
| 11 | TA creation + login | Create TA -> login | Dashboard shown |
| 12 | Manager blocked from /admin | Login as manager -> navigate to /admin | 403 or redirect |
| 13 | TA cannot see ADVANCED | Create ADVANCED course, TA enrolled -> check dashboard | ADVANCED course hidden |
| 14 | CSRF enforcement | POST /api/users without X-CSRF-Token | 403 response |
| 15 | Revoke program blocks access | Revoke UserProgram -> check dashboard | Course disappears, Progress in DB |
| 16 | Re-assign restores access | Re-create UserProgram -> check dashboard | Course reappears, Progress intact |
| 17 | API without JWT returns 401 | curl /api/users without cookie | 401 JSON response |

### 9. Build and lint verification
```bash
npm run lint
npm run build
npm test
```

## Todo List

- [ ] Configure Vitest
- [ ] Add test scripts to package.json
- [ ] Write JWT helpers tests
- [ ] Write role permissions tests
- [ ] Write access control service tests
- [ ] Write auth service tests (hash/compare)
- [ ] Write soft delete service tests
- [ ] Run manual verification (17 items)
- [ ] Fix any failing tests
- [ ] Run `npm run lint` -- passes
- [ ] Run `npm run build` -- passes
- [ ] Run `npm test` -- all tests pass
- [ ] Document any discovered issues

## Success Criteria

- All unit tests pass
- All 17 manual test items verified
- `npm run build` passes without errors
- `npm run lint` passes without errors
- No runtime errors in development server

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| DB-dependent tests require test database | Use mocking for unit tests, separate test DB for integration |
| Manual testing time-consuming | Focus on critical paths; automate more in Phase 2 |
| Build failure from unused imports | Lint before build to catch issues early |

## Security Considerations

- Test credentials never committed (use .env.test)
- Test database separate from production
- Verify CSRF protection is not bypassable
- Verify JWT validation rejects tampered tokens
- Verify soft-deleted users cannot authenticate
