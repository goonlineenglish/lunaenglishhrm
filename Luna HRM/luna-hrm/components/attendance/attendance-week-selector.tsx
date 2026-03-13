'use client'

/**
 * Week selector — navigate between weeks with left/right arrows.
 * Shows "02/03 - 08/03/2026" format + lock indicator.
 */

import { ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatWeekRange } from '@/lib/utils/date-helpers'

interface Props {
  weekStart: Date
  isLocked: boolean
  onWeekChange: (newWeekStart: Date) => void
}

export function AttendanceWeekSelector({ weekStart, isLocked, onWeekChange }: Props) {
  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    onWeekChange(d)
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    onWeekChange(d)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={prevWeek} title="Tuần trước">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background min-w-[200px] justify-center">
        {isLocked ? (
          <Lock className="h-4 w-4 text-destructive" />
        ) : (
          <LockOpen className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{formatWeekRange(weekStart)}</span>
      </div>

      <Button variant="outline" size="icon" onClick={nextWeek} title="Tuần sau">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
