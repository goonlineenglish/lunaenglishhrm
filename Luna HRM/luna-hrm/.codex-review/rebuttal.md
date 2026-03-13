# Codex Review Rebuttal — Luna HRM Phase 1

## ISSUE-1: ACCEPT — Branch managers can mint privileged accounts
Codex is correct. `createEmployee` and `updateEmployee` in `employee-actions.ts` accept any `role` value without restricting branch managers from assigning `admin` or `accountant` roles. The RLS `WITH CHECK` for BM insert/update only validates `branch_id`, not `role`.

**Fix**: Add role whitelist check in server actions: branch_managers may only create/update `employee` role.

## ISSUE-2: ACCEPT (partially) — getCurrentUser reads from employees table
Codex is correct that `getCurrentUser()` at L112–130 reads `role` and `branch_id` from the `employees` table rather than JWT `app_metadata`. If an employee can update their own row's `role` or `branch_id` fields, they can escalate privileges.

The RLS `employees_self_update` policy at L110 has no column-level restriction — it allows updating ANY column including `role` and `branch_id`.

**Fix**: 
- Add column restriction to `employees_self_update` RLS policy (exclude role, branch_id, is_active)
- Additionally in `getCurrentUser()`, prefer reading role from JWT app_metadata as primary source (with table as fallback for profile data only)

## ISSUE-3: ACCEPT — Non-atomic auth+table operations
Codex is correct. If `employees` insert fails after `createAuthUser` succeeds, an orphaned auth user is created. If role/branch sync fails after `updateEmployee` succeeds, metadata drifts. Must add cleanup on failure for the create path.

**Fix**: Wrap create in try/catch that deletes auth user on table insert failure. Wrap update to handle metadata sync failure (log only for now — non-critical since JWT refresh will eventually re-sync).

## ISSUE-4: PARTIAL ACCEPT — Auth checks diverge from RLS
Codex is correct that accountants are blocked from `getBranches()` and `getEmployees()` in server actions, but the SQL RLS allows them (via `branches_accountant_select` and `employees_accountant_select`). This is inconsistent.

The intent is: accountants SHOULD read all employees/branches (needed for payroll calculation). The server action guards are overly restrictive.

**Fix**: Update server actions to allow accountants to read employees and branches.

