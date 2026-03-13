'use client'

/**
 * Renders per-employee attendance summary cards with class breakdown.
 * Teaching staff: shows each class + sessions. Office staff: totals only.
 * compact=true: wrapped in a toggle button (for payroll page panel).
 */

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AttendanceSummaryItem } from '@/lib/types/attendance-summary-types'

const POSITION_LABELS: Record<string, string> = {
  teacher: 'Giáo viên',
  assistant: 'Trợ giảng',
  office: 'Văn phòng',
  admin: 'Quản lý',
}

interface AttendanceSummaryCardsProps {
  items?: AttendanceSummaryItem[]
  loading?: boolean
  /** compact=true wraps in an internal collapsible toggle — do NOT use when parent owns expand/collapse */
  compact?: boolean
  /** useMonthClasses=true renders month_classes instead of weekly classes (payroll/my-attendance) */
  useMonthClasses?: boolean
}

function CardSkeleton() {
  return (
    <div className="space-y-2 p-3 border rounded-md">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

function SummaryContent({ items, useMonthClasses }: { items: AttendanceSummaryItem[]; useMonthClasses?: boolean }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Chưa có dữ liệu chấm công.
      </p>
    )
  }

  // Branch footer totals
  const teachingWeek = items
    .filter((e) => e.position === 'teacher' || e.position === 'assistant')
    .reduce((s, e) => s + e.total_week, 0)
  const officeWeek = items
    .filter((e) => e.position === 'office' || e.position === 'admin')
    .reduce((s, e) => s + e.total_week, 0)
  const totalWeek = teachingWeek + officeWeek

  return (
    <div className="space-y-2">
      {items.map((emp) => {
        // ISSUE-1 fix: payroll/month surfaces use month_classes; attendance tab uses weekly classes
        const displayClasses = useMonthClasses ? emp.month_classes : emp.classes
        return (
          <Card key={emp.employee_id} className="shadow-none border">
            <CardHeader className="py-2 px-3 pb-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium">
                  {emp.full_name}{' '}
                  <span className="text-muted-foreground font-normal">({emp.employee_code})</span>
                </CardTitle>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {POSITION_LABELS[emp.position] ?? emp.position}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-1">
              {displayClasses.length > 0 && (
                <ul className="text-sm space-y-0.5 mb-1">
                  {displayClasses.map((cls) => (
                    <li key={cls.class_code} className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-foreground/60">├─</span>
                      <span>
                        {cls.class_code} ({cls.class_name}):{' '}
                        <span className="font-medium text-foreground">{cls.sessions} công</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground border-t pt-1 mt-1">
                Tuần:{' '}
                <span className="font-semibold text-foreground">{emp.total_week}</span>
                {'  |  '}
                Tháng:{' '}
                <span className="font-semibold text-foreground">{emp.total_month}</span>
              </p>
            </CardContent>
          </Card>
        )
      })}

      {/* Branch totals footer */}
      <div className="text-xs text-muted-foreground border-t pt-2 flex gap-3 flex-wrap">
        <span>
          Tổng chi nhánh (tuần) — GV:{' '}
          <span className="font-semibold text-foreground">{teachingWeek}</span>
          {'  │  '}VP:{' '}
          <span className="font-semibold text-foreground">{officeWeek}</span>
          {'  │  '}Tổng:{' '}
          <span className="font-semibold text-foreground">{totalWeek}</span>
        </span>
      </div>
    </div>
  )
}

export function AttendanceSummaryCards({ items, loading, compact, useMonthClasses }: AttendanceSummaryCardsProps) {
  const [open, setOpen] = useState(false)

  const inner = loading ? (
    <div className="space-y-2">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ) : (
    // compact=true (payroll) → use month_classes; normal tab → use weekly classes (ISSUE-1 fix)
    <SummaryContent items={items ?? []} useMonthClasses={useMonthClasses ?? compact} />
  )

  if (!compact) {
    return inner
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Tổng hợp công theo lớp
      </Button>
      {open && <div className="mt-2">{inner}</div>}
    </div>
  )
}
