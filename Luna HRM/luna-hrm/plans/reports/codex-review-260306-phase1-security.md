# Codex Review — Luna HRM Phase 1 Security
**Date:** 2026-03-06
**Scope:** proxy.ts, auth-actions.ts, employee-actions.ts, branch-actions.ts, admin.ts, 002_rls_policies.sql

## Verdict: APPROVED (after fixes)

## Issues Found & Fixed

### ISSUE-1 [CRITICAL] Branch managers can mint privileged accounts — FIXED
- **Problem:** `createEmployee` + `updateEmployee` accepted any `role` value. BM could create `admin` accounts.
- **Fix:** Added `BM_ALLOWED_ROLES = ['employee']` whitelist. BM attempting non-employee role → 403 error.
- **Files:** `lib/actions/employee-actions.ts` L42–43

### ISSUE-2 [CRITICAL] Employee self-update RLS had no column guard — FIXED
- **Fix 1:** `getCurrentUser()` now reads `role` + `branch_id` from JWT `app_metadata` (immutable by client). Employees table only provides `full_name`, `position`, `is_active`.
- **Fix 2:** `employees_self_update` RLS policy now enforces that `role`, `branch_id`, `is_active` cannot change via `WITH CHECK` subquery constraint.
- **Files:** `lib/actions/auth-actions.ts` L98–131, `supabase/migrations/002_rls_policies.sql` L110–120

### ISSUE-3 [HIGH] Non-atomic auth+table create — FIXED
- **Fix:** `createEmployee` now stores `authUserId` before insert. If DB insert fails, calls `deleteAuthUser(authUserId)` to rollback orphaned auth user.
- For `updateEmployee`: metadata sync failure is caught + logged but not rolled back (row is source of truth; JWT re-syncs on next token refresh).
- **Files:** `lib/actions/employee-actions.ts` L113–145, `lib/supabase/admin.ts` + added `deleteAuthUser()`

### ISSUE-4 [MEDIUM] Server actions blocked accountants from reading employees/branches — FIXED
- **Fix:** `getEmployees()` and `getBranches()` now allow accountant role (consistent with SQL RLS policies).
- **Files:** `lib/actions/employee-actions.ts` L50, `lib/actions/branch-actions.ts` L20–32

## Unresolved Questions
None — all 4 issues addressed. Build passes cleanly.
