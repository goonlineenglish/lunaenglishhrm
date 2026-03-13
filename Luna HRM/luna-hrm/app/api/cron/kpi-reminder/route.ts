/**
 * KPI reminder cron — triggered on the 25th of each month.
 * Checks which branches have un-evaluated teaching assistants for current month.
 * Secured with CRON_SECRET header.
 * Future: send notification email to branch managers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const now = new Date()
    const month = now.getMonth() + 1  // 1-based
    const year = now.getFullYear()

    // Get all active branches
    const { data: branches, error: brErr } = await admin
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
    if (brErr) throw brErr

    type BranchRow = { id: string; name: string }
    type AssistantRow = { id: string; branch_id: string }
    type KpiRow = { employee_id: string }

    // Get all active assistants across all branches
    const { data: assistants, error: empErr } = await admin
      .from('employees')
      .select('id, branch_id')
      .eq('position', 'assistant')
      .eq('is_active', true)
    if (empErr) throw empErr

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({ success: true, month, year, summary: [] })
    }

    const assistantIds = (assistants as AssistantRow[]).map((a) => a.id)

    // Get existing KPI evaluations for this month
    const { data: evaluations, error: kpiErr } = await admin
      .from('kpi_evaluations')
      .select('employee_id')
      .eq('month', month)
      .eq('year', year)
      .in('employee_id', assistantIds)
    if (kpiErr) throw kpiErr

    const evaluatedIds = new Set((evaluations as KpiRow[] ?? []).map((e) => e.employee_id))

    // Build per-branch summary of un-evaluated assistants
    const branchMap = new Map<string, string>()
    for (const b of (branches as BranchRow[] ?? [])) {
      branchMap.set(b.id, b.name)
    }

    const branchPendingMap = new Map<string, number>()
    for (const assistant of (assistants as AssistantRow[])) {
      if (!evaluatedIds.has(assistant.id) && assistant.branch_id) {
        const count = branchPendingMap.get(assistant.branch_id) ?? 0
        branchPendingMap.set(assistant.branch_id, count + 1)
      }
    }

    const summary = Array.from(branchPendingMap.entries()).map(([branchId, pendingCount]) => ({
      branch_id: branchId,
      branch_name: branchMap.get(branchId) ?? branchId,
      pending_count: pendingCount,
    }))

    if (summary.length > 0) {
      console.log(`[kpi-reminder] ${month}/${year} — branches with pending KPI:`)
      for (const s of summary) {
        console.log(`  - ${s.branch_name}: ${s.pending_count} trợ giảng chưa đánh giá`)
      }
      // TODO: send reminder email/notification to branch managers
    } else {
      console.log(`[kpi-reminder] ${month}/${year} — all assistants evaluated.`)
    }

    return NextResponse.json({
      success: true,
      month,
      year,
      total_pending: summary.reduce((sum, s) => sum + s.pending_count, 0),
    })
  } catch (err) {
    console.error('[kpi-reminder]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
