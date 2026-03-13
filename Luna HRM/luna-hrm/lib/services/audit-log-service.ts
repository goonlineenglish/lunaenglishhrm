'use server'

/**
 * Audit log service — fire-and-forget event recording.
 * Never throws; never blocks the calling action.
 * Uses the service-role (admin) client to bypass RLS.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditLogParams {
  tableName: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  userId?: string
  userEmail?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

/**
 * Log an audit event. Caller passes userId/userEmail to avoid redundant auth.
 * Fire-and-forget: do not await in calling code (unless you need the result).
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createAdminClient() as any

    await sb.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
    })
  } catch {
    // Audit logging is fire-and-forget — never block main operations
    console.error('[audit] Failed to log audit event:', params.tableName, params.action)
  }
}
