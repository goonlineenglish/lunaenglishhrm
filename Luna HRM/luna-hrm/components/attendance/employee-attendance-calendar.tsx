/**
 * Employee attendance calendar grid component.
 * Renders a monthly calendar with color-coded attendance dots.
 * Read-only. CSS-responsive only.
 */

import { cn } from '@/lib/utils'
import type { MyAttendanceDay } from '@/lib/actions/employee-portal-actions'

interface EmployeeAttendanceCalendarProps {
  days: MyAttendanceDay[]
  month: number
  year: number
}

// Status → color classes
const STATUS_DOT: Record<string, string> = {
  '1': 'bg-green-500',
  '0': 'bg-blue-400',
  'KP': 'bg-red-500',
  '0.5': 'bg-yellow-400',
}

const STATUS_LABEL: Record<string, string> = {
  '1': 'Có mặt',
  '0': 'Vắng phép',
  'KP': 'Vắng KP',
  '0.5': 'Nửa buổi',
}

const DAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function EmployeeAttendanceCalendar({
  days,
  month,
  year,
}: EmployeeAttendanceCalendarProps) {
  // Build lookup map: date → day entry
  const dayMap = new Map<string, MyAttendanceDay>()
  for (const d of days) {
    dayMap.set(d.date, d)
  }

  // Build calendar grid: ISO week starts Monday
  const firstOfMonth = new Date(year, month - 1, 1)
  // ISO day: 1=Mon..7=Sun. getDay(): 0=Sun..6=Sat
  const firstIsoDay = firstOfMonth.getDay() === 0 ? 7 : firstOfMonth.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  // Pad start with nulls to align with Monday
  const calCells: (number | null)[] = [
    ...Array(firstIsoDay - 1).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad end to fill last row
  while (calCells.length % 7 !== 0) calCells.push(null)

  function formatDate(d: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 text-center">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className={cn(
              'text-xs font-semibold py-1',
              i === 6 ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {calCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }
          const dateStr = formatDate(day)
          const entry = dayMap.get(dateStr)
          const dotClass = entry ? STATUS_DOT[entry.status] ?? 'bg-gray-300' : null

          return (
            <div
              key={dateStr}
              className="aspect-square flex flex-col items-center justify-center rounded-md"
              title={entry ? `${STATUS_LABEL[entry.status] ?? entry.status}${entry.class_code ? ` — ${entry.class_code}` : ''}` : undefined}
            >
              <span className="text-xs leading-none mb-0.5">{day}</span>
              {dotClass ? (
                <span className={cn('w-2 h-2 rounded-full', dotClass)} />
              ) : (
                <span className="w-2 h-2" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1 border-t text-xs text-muted-foreground">
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('w-2.5 h-2.5 rounded-full inline-block', STATUS_DOT[status])} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
