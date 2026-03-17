# Luna HRM Multi-Role RBAC Implementation Plan

**Status:** ✅ All 6 Phases Complete
**Completion Date:** 2026-03-17
**Codex Review:** APPROVED (3 rounds)
**Build Status:** 25 routes, 136 tests passing, 0 errors

---

## Overview

Multi-Role RBAC extends Luna HRM's authentication model from single-role to multi-role support. Employees can now have multiple roles simultaneously (e.g., `branch_manager + accountant`), enabling hybrid organizational structures while maintaining backward compatibility with legacy single-role logic.

### Key Achievements

- **Database:** `employees.roles TEXT[]` column + migration 011 (70 RLS policies rewritten)
- **Auth:** JWT `app_metadata.roles[]` synced with DB; SessionUser.roles[] in app context
- **Actions:** 21 server action files converted to `roles.includes()` pattern
- **UI:** RoleAssignmentDialog for admin multi-role assignment + /my-kpi portal
- **Tests:** 136/136 passing; seed.sql with roles[] backfilled
- **Codex:** 3 rounds; all issues fixed → APPROVED

---

## Implementation Phases

### Phase 1: Database Schema + RLS
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Migration 011 — employee roles + RLS refactor

**Deliverables:**
- `supabase/migrations/011_multi_role_schema_and_rls.sql`
  - Add `employees.roles TEXT[] DEFAULT '{}'` column
  - Backfill existing employees with roles from legacy `role` column
  - Create RLS helpers: `user_has_role(text)`, `get_user_roles()`, `get_current_user_roles()`
  - Rewrite 70 RLS policies: `get_user_role() = 'X'` → `user_has_role('X')`
  - Drop legacy `role` column (kept for 1 migration cycle for backward compat)

**Files Modified:**
- `supabase/migrations/011_multi_role_schema_and_rls.sql` (NEW)

**Key Functions:**
```sql
-- Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(role_to_check text) RETURNS boolean AS $fn$
  SELECT (get_user_roles()) @> ARRAY[role_to_check]::text[]
$fn$ LANGUAGE SQL STABLE;

-- Get array of user roles
CREATE OR REPLACE FUNCTION get_user_roles() RETURNS text[] AS $fn$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'roles')::text[], '{}')
$fn$ LANGUAGE SQL STABLE;
```

**Backward Compat:**
- Keep `get_user_role()` for legacy code (reads first role in array)
- RLS policies use both until all refs updated

---

### Phase 2: Core Types + Auth Helpers
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Type definitions + auth helpers for multi-role

**Deliverables:**
- `lib/types/user.ts` — SessionUser.roles: UserRole[]
- `lib/hooks/use-auth.ts` — getCurrentUser() returns multi-role session
- `lib/hooks/use-permissions.ts` — hasAnyRole(), hasAllRoles() helpers
- `lib/actions/auth-actions.ts` — updateUserRoles(userId, roles[]) with admin guard

**Files Modified:**
- `lib/types/user.ts` (MODIFIED)
- `lib/hooks/use-auth.ts` (MODIFIED)
- `lib/hooks/use-permissions.ts` (EXTENDED)
- `lib/actions/auth-actions.ts` (EXTENDED)

**Key Patterns:**
```typescript
// Session type
export interface SessionUser {
  id: string;
  email: string;
  roles: UserRole[];              // Array instead of single role
  branch_id: string;
}

// Checking roles
if (user.roles.includes('admin')) { /* admin-only logic */ }
if (hasAnyRole(user, ['admin', 'accountant'])) { /* either role */ }

// Updating roles (admin-only)
await updateUserRoles(employeeId, ['branch_manager', 'accountant']);
```

---

### Phase 3: Server Actions (21 Files)
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Convert all permission checks to multi-role pattern

**Deliverables:**
- Migrate 21 action files from `role === 'X'` to `roles.includes('X')` checks
- Add allowlist for updateUserRoles (prevent privilege escalation)
- Atomic role update with rollback on auth sync failure

**Files Modified:**
- `lib/actions/attendance-actions.ts` — admin/BM checks
- `lib/actions/attendance-lock-actions.ts` — lock override guards
- `lib/actions/attendance-summary-actions.ts` — branch/employee scoping
- `lib/actions/class-schedule-actions.ts` — admin/BM guards
- `lib/actions/employee-actions.ts` — role guards
- `lib/actions/employee-mutation-actions.ts` — role reads + writes
- `lib/actions/payroll-calculate-actions.ts` — accountant/admin guards
- `lib/actions/payroll-payslip-actions.ts` — accountant/admin guards
- `lib/actions/payroll-period-actions.ts` — accountant/admin guards
- `lib/actions/kpi-save-actions.ts` — BM guards
- `lib/actions/kpi-query-actions.ts` — multi-role self-query
- `lib/actions/evaluation-*.ts` — template/period admin, scoring BM
- `lib/actions/employee-profile-actions.ts` — BM/self-edit
- `lib/actions/employee-notes-actions.ts` — BM/self-access
- `lib/actions/audit-log-actions.ts` — admin/accountant view
- `lib/actions/auth-actions.ts` — getCurrentUser() + updateUserRoles()
- `lib/actions/office-attendance-actions.ts` — VP staff lock/unlock
- (+ 3 more minor files)

**Key Pattern:**
```typescript
// Before (single role)
if (user.role !== 'admin') throw new Error('Unauthorized');

// After (multi-role)
if (!user.roles.includes('admin')) throw new Error('Unauthorized');

// Hybrid roles
if (!hasAnyRole(user, ['admin', 'accountant'])) throw new Error('Unauthorized');
```

---

### Phase 4: UI Components + Role Assignment
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Admin UI for multi-role assignment + navigation logic

**Deliverables:**
- `components/employees/role-assignment-dialog.tsx` (NEW)
  - Multi-select checkboxes for admin to assign roles
  - Allowlist: admin, branch_manager, accountant, employee
  - useEffect reset on role success
  - Loading/error states

- `lib/supabase/admin.ts` (EXTENDED)
  - `createAuthUser()` writes roles[] to app_metadata
  - `updateAuthUserMetadata()` syncs roles[] on updates

- `components/layout/sidebar.tsx` (UPDATED)
  - Union sidebar menu based on user.roles (not just first role)
  - Show all accessible routes for all user roles

- Role badges in employee profile

**Files Modified:**
- `components/employees/role-assignment-dialog.tsx` (NEW)
- `lib/supabase/admin.ts` (EXTENDED)
- `components/layout/sidebar.tsx` (UPDATED)
- `app/(dashboard)/employees/[id]/page.tsx` (UPDATED)

---

### Phase 5: Gap Fixes + /my-kpi Portal
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Missing permission checks + employee self-service KPI

**Deliverables:**
- `lib/actions/kpi-query-actions.ts` (NEW)
  - `getMyKpiHistory(months=6)` for employee self-view
  - Used by /my-kpi page (new)

- `app/(dashboard)/my-kpi/page.tsx` (NEW)
  - Employee KPI history + 6-month chart
  - Bottom-nav integration

- Permission fixes across 8 action files (scoped access)
- Employee-only view for /my-kpi (checked via RLS + action guards)

**Files Modified:**
- `lib/actions/kpi-query-actions.ts` (NEW)
- `app/(dashboard)/my-kpi/page.tsx` (NEW)
- `components/layout/sidebar.tsx` (UPDATED — add KPI tab to bottom nav)
- (+ 6 action files with gap fixes)

---

### Phase 6: Tests + Seed Update
**Status:** ✅ Done | **Date:** 2026-03-17
**Scope:** Test coverage + seed data with roles[]

**Deliverables:**
- 136/136 unit tests passing
  - Payroll-calc suite: extended for multi-role permission checks
  - Attendance-lock suite: BM/admin multi-role scenario
  - Auth-helpers: roles.includes() logic
  - New suite (if needed): multi-role specific edge cases

- `supabase/seed.sql` (UPDATED)
  - Backfill `admin`, `bm.tanmai`, `bm.quan1` with `roles[]`
  - Create auth users with `app_metadata.roles[]`
  - All 21 seed employees have roles[]

- Build verification:
  - `npm run build` → 25 routes, 0 errors
  - `npm run lint` → clean
  - `npm test` → 136 tests pass

**Files Modified:**
- `supabase/seed.sql` (UPDATED)
- `tests/` (EXTENDED with multi-role scenarios)

---

## Architecture Decisions

### 1. roles TEXT[] in Database
**Why:** Single source of truth; synced to JWT on login/update
**Trade-off:** Requires atomic DB + JWT sync (handled in updateUserRoles)

### 2. JWT app_metadata.roles[] (not user_metadata)
**Why:** app_metadata is admin-only write; user_metadata is client-writable (security risk)
**Trade-off:** Role changes require JWT re-issue + DB sync

### 3. user_has_role() RLS Helper
**Why:** Enables seamless policy refactor from single-role to multi-role
**Trade-off:** Array operator (`@>`) slightly slower than string comparison; negligible at scale

### 4. Backward Compat with get_user_role()
**Why:** Some legacy code reads `get_user_role()` (returns first role); avoids mass refactor
**Trade-off:** Misleading if user has multiple roles; marked as deprecated

### 5. Admin-Only Role Updates
**Why:** Prevent privilege escalation (employee self-promoting to admin)
**Trade-off:** Admin responsible for role hygiene

---

## Key Files Summary

### New Files
- `supabase/migrations/011_multi_role_schema_and_rls.sql`
- `components/employees/role-assignment-dialog.tsx`
- `lib/actions/kpi-query-actions.ts`
- `app/(dashboard)/my-kpi/page.tsx`

### Modified Files (21 actions + core)
- `lib/actions/*` — Permission check refactors
- `lib/types/user.ts` — SessionUser.roles[]
- `lib/hooks/use-auth.ts` — getCurrentUser()
- `lib/hooks/use-permissions.ts` — Role checkers
- `lib/supabase/admin.ts` — Metadata sync
- `components/layout/sidebar.tsx` — Multi-role nav
- `supabase/seed.sql` — Backfill roles[]
- `app/(dashboard)/employees/[id]/page.tsx` — Role dialog integration

---

## Testing & QA

### Unit Tests
- ✅ 136 tests passing (7 suites)
- Multi-role permission checks verified
- RLS function syntax validated (migration runs successfully)
- Seed data loads without error

### Manual Testing
- ✅ Role assignment dialog works (admin only)
- ✅ Hybrid roles (BM + accountant) scoped correctly
- ✅ /my-kpi accessible to employees
- ✅ Sidebar shows union of routes for all roles
- ✅ Legacy code still works with get_user_role() (backward compat)

### Integration
- ✅ Build passes (0 errors, 25 routes)
- ✅ Supabase migration 011 applies cleanly
- ✅ Seed data creates auth users with app_metadata.roles[]
- ✅ Login flow extracts roles[] from JWT

---

## Codex Review Status

### Round 1
- 6 issues found (recursion, edge cases, error handling)
- All 6 fixed in implementation

### Round 2
- 2 issues (employees_self_update recursion, partial rollback)
- Fixed in Round 3

### Round 3
- ✅ APPROVED
- No additional issues; production-ready

---

## Deployment Notes

### Pre-Deploy Checklist
- [x] Migration 011 tested on staging Supabase
- [x] All 136 tests passing
- [x] Seed data with roles[] verified
- [x] Sidebar nav tested with multiple roles
- [x] RoleAssignmentDialog admin-only access verified
- [x] /my-kpi portal accessible to employees only

### Post-Deploy
1. Run migration: `supabase migration up`
2. Run seed: `supabase seed` (backfills roles[], creates auth users)
3. Verify JWT includes `app_metadata.roles[]` on login
4. Test role assignment via admin UI
5. Monitor audit logs for role changes

### Rollback Plan
- Revert migration 011 (drop roles[] column, restore legacy role column)
- Revert auth code to legacy `role: string` pattern
- **NOT** recommended post-deploy (data loss risk); test thoroughly on staging first

---

## Future Enhancements

### Out of Scope (Phase 6)
- [ ] Role hierarchies (e.g., admin ⊃ branch_manager)
- [ ] Granular permissions (e.g., "payroll_view" vs "payroll_edit")
- [ ] Dynamic role creation (currently hardcoded allowlist)
- [ ] Role expiration / time-bound roles

### Potential Phase 8+ Features
- Custom role builder for large enterprises
- Role audit trail (who assigned roles when)
- Temporary role elevation (e.g., accountant acting as admin for payroll)

---

## Summary

**All 6 phases complete with Codex approval.** Multi-Role RBAC is production-ready and maintains full backward compatibility with existing single-role code. Employees can now have multiple roles, enabling flexible organizational structures (e.g., branch manager + accountant for smaller branches).

---

**Last Updated:** 2026-03-17
**Next Phase:** Phase 8 (Email Notification + Confirmation) — TBD
