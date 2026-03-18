/**
 * Schedule conflict warning banner for class-schedules page.
 * Shows employees assigned to 2+ classes at the same shift/day.
 * Warning-only (amber) — conflicts are informational, don't block workflow.
 * Also surfaces conflict-query errors so users know detection failed.
 */

import { AlertTriangle } from 'lucide-react'
import type { ScheduleConflict } from '@/lib/services/attendance-grid-helpers'
import { getDayName } from '@/lib/utils/date-helpers'

interface ScheduleConflictBannerProps {
  conflicts: ScheduleConflict[]
  /** True when conflict detection query failed */
  hasError?: boolean
}

export function ScheduleConflictBanner({ conflicts, hasError }: ScheduleConflictBannerProps) {
  if (conflicts.length === 0 && !hasError) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          {hasError && conflicts.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Không thể kiểm tra xung đột lịch. Vui lòng tải lại trang.
            </p>
          ) : (
            <>
              <p className="font-medium text-sm text-amber-800 dark:text-amber-300">
                Xung đột lịch ({conflicts.length})
              </p>
              <ul className="text-xs mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
                {conflicts.slice(0, 5).map((c, i) => (
                  <li key={i}>
                    {c.employeeCode} ({c.employeeName}) — {getDayName(c.day)} ca {c.shiftTime}: {c.classes.join(' & ')}
                  </li>
                ))}
                {conflicts.length > 5 && (
                  <li className="italic">... và {conflicts.length - 5} xung đột khác</li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
