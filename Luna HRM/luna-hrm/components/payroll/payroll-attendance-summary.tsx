'use client'

/**
 * Collapsible attendance summary panel for the payroll period page.
 * Extracted to keep payroll/[period]/page.tsx under 280 lines (ISSUE-11 fix).
 * Fetches summary data lazily — only when user expands the panel (ISSUE-3 fix).
 */

import { useState } from 'react'
import { getAttendanceSummary } from '@/lib/actions/attendance-summary-actions'
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards'
import { toISODate, getWeekStart } from '@/lib/utils/date-helpers'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { AttendanceSummaryItem } from '@/lib/types/attendance-summary-types'

interface Props {
  branchId: string
  month: number
  year: number
}

export function PayrollAttendanceSummary({ branchId, month, year }: Props) {
  const [open, setOpen] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [items, setItems] = useState<AttendanceSummaryItem[]>([])
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    const next = !open
    setOpen(next)
    // Only fetch on first open — ISSUE-3 fix: no fetch on mount
    if (next && !fetched) {
      setLoading(true)
      const weekStart = getWeekStart(new Date(year, month - 1, 1))
      const weekStartStr = toISODate(weekStart)
      const res = await getAttendanceSummary(branchId, weekStartStr, month, year)
      if (res.success && res.data) setItems(res.data.items)
      setFetched(true)
      setLoading(false)
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={handleOpen}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Tổng hợp công theo lớp
      </Button>
      {open && (
        <div className="mt-2">
          {/* useMonthClasses=true → shows month_classes. compact NOT passed — outer owns toggle. (ISSUE-1+round2 fix) */}
          <AttendanceSummaryCards items={items} loading={loading} useMonthClasses />
        </div>
      )}
    </div>
  )
}
