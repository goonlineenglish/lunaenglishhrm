/**
 * Field-level audit logging for payslip manual edits.
 * Writes to payslip_audit_logs via service_role (createAdminClient).
 * NOT a server action file — called from server action files that carry 'use server'.
 * Pattern: never throws, never blocks main ops (fire-and-forget safe).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { EditablePayslipFields, PayslipAuditEntry } from '@/lib/types/database-payroll-types'

const AUDITED_FIELDS: (keyof EditablePayslipFields)[] = [
  'kpi_bonus', 'allowances', 'deductions', 'penalties', 'other_pay',
  'bhxh', 'bhyt', 'bhtn', 'tncn', 'gross_pay', 'net_pay', 'extra_notes',
]

/**
 * Diff old vs new payslip fields and return audit entries for changed fields only.
 * Contract: newVals should only include fields being updated in this operation.
 * Fields absent from newVals (undefined) are treated as "not part of this update" and skipped.
 */
export function buildAuditLogEntries(
  payslipId: string,
  oldVals: Partial<EditablePayslipFields>,
  newVals: Partial<EditablePayslipFields>,
  changedBy: string
): PayslipAuditEntry[] {
  const entries: PayslipAuditEntry[] = []

  for (const field of AUDITED_FIELDS) {
    const oldVal = oldVals[field]
    const newVal = newVals[field]
    // Skip fields not included in this update operation
    if (newVal === undefined) continue
    if (oldVal === undefined && newVal === undefined) continue
    // Normalize: treat empty string as null for comparison (ISSUE-2)
    const normOld = oldVal === '' ? null : oldVal
    const normNew = newVal === '' ? null : newVal
    if (normOld === normNew) continue
    // For numeric vs string comparison, use String representation
    if (normOld != null && normNew != null && String(normOld) === String(normNew)) continue

    entries.push({
      payslip_id: payslipId,
      field_name: field,
      old_value: oldVal != null ? String(oldVal) : null,
      new_value: newVal != null ? String(newVal) : null,
      changed_by: changedBy,
    })
  }

  return entries
}

/**
 * Bulk insert audit entries to payslip_audit_logs.
 * Uses service_role client to bypass RLS. Fire-and-forget safe.
 */
export async function insertAuditLogs(entries: PayslipAuditEntry[]): Promise<void> {
  if (entries.length === 0) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createAdminClient() as any
    const { error } = await sb.from('payslip_audit_logs').insert(entries)
    if (error) {
      console.error('[payslip-audit] Insert error:', error.message, 'count:', entries.length)
    }
  } catch {
    console.error('[payslip-audit] Failed to insert audit logs, count:', entries.length)
  }
}
