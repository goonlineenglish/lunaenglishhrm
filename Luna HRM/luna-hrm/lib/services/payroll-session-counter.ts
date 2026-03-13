'use server'

/**
 * Session/day counting queries for payroll calculation.
 * Counts teaching sessions (attendance), office days (office_attendance),
 * and substitute sessions (employee_weekly_notes).
 * Accepts a shared Supabase client to avoid N+1 client creation.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ─── Teaching session count (teachers + assistants) ──────────────────────────

/**
 * Count teaching sessions from attendance table.
 * status='1' -> 1 session, status='0.5' -> 0.5 session.
 */
export async function countTeachingSessions(
  sb: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await sb
    .from('attendance')
    .select('status')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  if (error) throw new Error(`[countTeachingSessions] ${error.message}`)

  const rows = (data as { status: string }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.status === '0.5' ? 0.5 : 1), 0)
}

// ─── Office days count (VP staff) ────────────────────────────────────────────

/**
 * Count working days from office_attendance table.
 * Same logic: status='1' -> 1, status='0.5' -> 0.5.
 */
export async function countOfficeDays(
  sb: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await sb
    .from('office_attendance')
    .select('status')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['1', '0.5'])

  if (error) throw new Error(`[countOfficeDays] ${error.message}`)

  const rows = (data as { status: string }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.status === '0.5' ? 0.5 : 1), 0)
}

// ─── Substitute session info ──────────────────────────────────────────────────

/**
 * Get substitute sessions from employee_weekly_notes where note_type='substitute'.
 * amount_unit='sessions' -> sum amount as session count.
 */
export async function getSubstituteSessions(
  sb: SupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await sb
    .from('employee_weekly_notes')
    .select('amount, amount_unit')
    .eq('employee_id', employeeId)
    .eq('note_type', 'substitute')
    .eq('amount_unit', 'sessions')
    .gte('week_start', startDate)
    .lte('week_start', endDate)

  if (error) throw new Error(`[getSubstituteSessions] ${error.message}`)

  const rows = (data as { amount: number | null; amount_unit: string | null }[]) ?? []
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
}
