/**
 * Auto-confirm cron — runs daily after confirmation_deadline expires.
 * Auto-confirms payslips with employee_status='sent' where 3+ days have passed.
 * Secured with CRON_SECRET (timing-safe comparison).
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

function verifySecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

const CONFIRMATION_DAYS = 3

export async function GET(request: NextRequest) {
  if (!verifySecret(request.headers.get('x-cron-secret'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Find payslips in 'sent' state past the 3-day window
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CONFIRMATION_DAYS)

    const { data: payslips, error: fetchErr } = await admin
      .from('payslips')
      .select('id, employee_id, payroll_period_id, email_sent_at')
      .eq('employee_status', 'sent')
      .lt('email_sent_at', cutoff.toISOString())

    if (fetchErr) throw fetchErr

    const ids: string[] = ((payslips ?? []) as { id: string }[]).map((p) => p.id)

    if (ids.length === 0) {
      return NextResponse.json({ success: true, auto_confirmed: 0 })
    }

    const { error: updateErr } = await admin
      .from('payslips')
      .update({
        employee_status: 'confirmed',
        employee_confirmed_at: new Date().toISOString(),
        confirmation_token: null,
      })
      .in('id', ids)

    if (updateErr) throw updateErr

    console.log(`[auto-confirm] Auto-confirmed ${ids.length} payslips`)
    return NextResponse.json({ success: true, auto_confirmed: ids.length })
  } catch (err) {
    console.error('[auto-confirm]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
