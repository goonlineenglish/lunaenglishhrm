-- Field-level audit log for payslip manual edits.
-- Written server-side via service_role (createAdminClient).
-- Read access: admin + accountant only.

-- ============================================================
-- TABLE: payslip_audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS payslip_audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id  UUID        NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  field_name  TEXT        NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  UUID        REFERENCES employees(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payslip_audit_payslip ON payslip_audit_logs(payslip_id);
CREATE INDEX idx_payslip_audit_changed_at ON payslip_audit_logs(changed_at);

ALTER TABLE payslip_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin and accountant can read; writes go through service_role (bypasses RLS).
CREATE POLICY "payslip_audit_admin_select" ON payslip_audit_logs FOR SELECT USING (
  (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'accountant')
);

-- ============================================================
-- ALTER TABLE: add is_reviewed to payslips
-- is_reviewed = true when accountant explicitly saves/reviews a row.
-- confirmPayrollPeriod rejects if any payslip has is_reviewed = false.
-- ============================================================

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN NOT NULL DEFAULT false;
