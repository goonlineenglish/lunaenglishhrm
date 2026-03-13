'use client'

/**
 * KPI score summary — shows total score and bonus amount.
 * If base_pass=false, shows red zero-bonus warning instead.
 */

import { formatVND } from '@/lib/utils/number-format'
import { KPI_BONUS_PER_POINT } from '@/lib/services/kpi-calculation-service'

interface Props {
  totalScore: number
  basePassed: boolean
}

const MAX_SCORE = 10

export function KpiScoreDisplay({ totalScore, basePassed }: Props) {
  const bonus = basePassed ? totalScore * KPI_BONUS_PER_POINT : 0

  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1">
      <div className="flex items-baseline gap-1">
        <span className="text-sm text-muted-foreground">Tổng KPI:</span>
        <span className="text-lg font-bold">
          {totalScore}/{MAX_SCORE}
        </span>
      </div>

      {basePassed ? (
        <div className="flex items-baseline gap-1 text-sm">
          <span className="text-muted-foreground">Thưởng:</span>
          <span className="font-medium text-green-700 dark:text-green-400">
            {totalScore} × {formatVND(KPI_BONUS_PER_POINT)} = {formatVND(bonus)} ₫
          </span>
        </div>
      ) : (
        <div className="text-sm text-destructive font-medium">
          Không đạt điều kiện cơ bản — Thưởng: 0 ₫
        </div>
      )}
    </div>
  )
}
