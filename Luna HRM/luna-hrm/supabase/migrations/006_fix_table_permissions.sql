-- ============================================================
-- Luna HRM — Fix table permissions (Least Privilege)
-- Luna HRM has NO public unauthenticated pages.
-- anon: schema usage + SELECT only (RLS blocks reads anyway)
-- authenticated: SELECT/INSERT/UPDATE/DELETE (RLS enforces row-level)
-- service_role: ALL (bypasses RLS for admin operations)
-- ============================================================

-- Grant usage on public schema to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- anon: read-only (no unauthenticated pages, RLS blocks all reads anyway)
-- Minimal grant reduces attack surface from any RLS policy bugs.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- authenticated: standard DML (INSERT/UPDATE/DELETE controlled by RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- service_role: full access (bypasses RLS — used by admin client only, never in browser)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequences for INSERT operations
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Default privileges: apply same pattern to future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
