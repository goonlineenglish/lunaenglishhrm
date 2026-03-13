-- Audit log table for tracking INSERT/UPDATE/DELETE on key tables.
-- Access: admin only (via RLS).

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_table_created ON audit_logs(table_name, created_at);
CREATE INDEX idx_audit_logs_user_created  ON audit_logs(user_id, created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs; writes are done server-side (bypassing RLS via service role).
CREATE POLICY "admin_select_audit" ON audit_logs FOR SELECT USING (
  (auth.jwt()->'app_metadata'->>'role') = 'admin'
);
