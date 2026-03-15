-- ============================================================
-- Luna HRM — Migration 011: Fix RLS Infinite Recursion
-- Bug: employees_self_update WITH CHECK queries employees table
--      directly → PostgreSQL 42P17 infinite recursion on any UPDATE.
-- Fix: Use JWT helpers (get_user_role/get_user_branch_id) for role
--      and branch checks (no recursion), plus a SECURITY DEFINER
--      function for is_active which cannot be read from JWT.
-- ============================================================

-- ─── SECURITY DEFINER helper: get current user's is_active status ───────────
-- Bypasses RLS so the policy's WITH CHECK doesn't recurse.
CREATE OR REPLACE FUNCTION get_current_user_is_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_active FROM employees WHERE id = (SELECT auth.uid());
$$;

-- ─── Fix employees_self_update: replace recursive subqueries ────────────────
-- Old (migration 010): used SELECT role/branch_id/is_active FROM employees
--   → caused 42P17 infinite recursion on every UPDATE by any role.
-- New: role and branch_id read from JWT (already cached, no table scan),
--      is_active read via SECURITY DEFINER function (bypasses RLS).
DROP POLICY IF EXISTS "employees_self_update" ON employees;
CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'employee' AND id = (SELECT auth.uid()))
  WITH CHECK (
    get_user_role() = 'employee' AND id = (SELECT auth.uid())
    -- Use JWT-cached values to avoid recursive employees table queries
    AND role = get_user_role()
    AND branch_id IS NOT DISTINCT FROM get_user_branch_id()
    -- Use SECURITY DEFINER to fetch is_active without triggering RLS
    AND is_active = get_current_user_is_active()
  );
