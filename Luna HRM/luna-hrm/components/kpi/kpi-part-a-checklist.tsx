'use client'

/**
 * KPI Part A: 4 mandatory pass/fail checklist.
 * All must pass for base_pass=true.
 * If any fail, shows a warning banner.
 */

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MANDATORY_CRITERIA } from '@/lib/types/kpi'

interface Props {
  checks: boolean[]
  onChange: (checks: boolean[]) => void
}

export function KpiPartAChecklist({ checks, onChange }: Props) {
  const allPass = checks.every(Boolean)

  function toggle(index: number, value: boolean) {
    const next = [...checks]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tất cả 4 điều kiện phải đạt — nếu thiếu, thưởng KPI = 0.
      </p>

      {MANDATORY_CRITERIA.map((label, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
        >
          <span className="flex-1 leading-snug">{label}</span>
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={checks[i] === true ? 'default' : 'outline'}
              className="h-7 px-3 text-xs"
              onClick={() => toggle(i, true)}
            >
              Đạt
            </Button>
            <Button
              type="button"
              size="sm"
              variant={checks[i] === false ? 'destructive' : 'outline'}
              className="h-7 px-3 text-xs"
              onClick={() => toggle(i, false)}
            >
              Không đạt
            </Button>
          </div>
        </div>
      ))}

      {!allPass && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Nhân viên không đạt điều kiện cơ bản — thưởng KPI = 0</span>
        </div>
      )}
    </div>
  )
}
