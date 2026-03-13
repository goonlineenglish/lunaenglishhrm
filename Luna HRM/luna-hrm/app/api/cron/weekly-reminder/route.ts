/**
 * Weekend reminder cron — triggered Saturday evening.
 * Checks which branches have unsaved attendance for current week.
 * Secured with CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWeekStart, toISODate } from '@/lib/utils/date-helpers'

function verifySecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe comparison)
  const secret = request.headers.get('x-cron-secret')
  if (!verifySecret(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const weekStart = toISODate(getWeekStart(new Date()))

    // Get all active branches
    const { data: branches, error: brErr } = await admin
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
    if (brErr) throw brErr

    // Check which branches have locks for this week
    const { data: locks, error: lockErr } = await admin
      .from('attendance_locks')
      .select('branch_id')
      .eq('week_start', weekStart)
    if (lockErr) throw lockErr

    const lockedBranchIds = new Set((locks ?? []).map((l: { branch_id: string }) => l.branch_id))
    const unsaved = (branches ?? []).filter((b: { id: string }) => !lockedBranchIds.has(b.id))

    if (unsaved.length > 0) {
      console.log('[weekly-reminder] Branches without saved attendance:', unsaved.map((b: { name: string }) => b.name))
      // Future: send notification to branch managers
    }

    return NextResponse.json({
      success: true,
      week: weekStart,
      unsaved_count: unsaved.length,
      unsaved_branches: unsaved.map((b: { name: string }) => b.name),
    })
  } catch (err) {
    console.error('[weekly-reminder]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
