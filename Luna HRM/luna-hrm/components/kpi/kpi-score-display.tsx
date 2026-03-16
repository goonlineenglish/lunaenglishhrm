'use client'

/**
 * KPI score summary — shows total score, attendance ratio, and bonus amount.
 * New formula: bonus = ROUND(40,000 × (total/10) × attendance_ratio)
 * Uses shared calculateKpiBonus() so preview is always identical to server calculation.
 * If base_pass=false, shows red zero-bonus warning instead.
 */

import { formatVND } from '@/lib/utils/number-format'
import { calculateKpiBonus } from '@/lib/services/kpi-calculation-service'
import type { AttendanceSessions } from '@/components/kpi/kpi-eval-form-hooks'

interface Props {
  totalScore: number
  basePassed: boolean
  attendance: AttendanceSessions
}

const MAX_SCORE = 100

export function KpiScoreDisplay({ totalScore, basePassed, attendance }: Props) {
  const { sessionsWorked, substituteSessions, totalScheduled } = attendance
  // Clamp ratio to [0,1] — same logic as server: Math.max(0, Math.min(1, ...))
  const ratio = totalScheduled > 0
    ? Math.max(0, Math.min(1, (sessionsWorked + substituteSessions) / totalScheduled))
    : 0
  // Use shared service function to guarantee preview === saved value
  const bonus = calculateKpiBonus(totalScore, basePassed, sessionsWorked, substituteSessions, totalScheduled)
  const ratioPercent = Math.round(ratio * 100)

  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-1.5">
      {/* Total score row */}
      <div className="flex items-baseline gap-1">
        <span className="text-sm text-muted-foreground">Tổng KPI:</span>
        <span className="text-lg font-bold">
          {totalScore}/{MAX_SCORE}
        </span>
      </div>

      {/* Attendance ratio row */}
      <div className="flex items-baseline gap-1 text-sm text-muted-foreground">
        <span>Tỉ lệ công:</span>
        <span className="font-medium text-foreground">
          {sessionsWorked + substituteSessions}/{totalScheduled} buổi ({ratioPercent}%)
        </span>
        {substituteSessions > 0 && (
          <span className="text-xs">(incl. {substituteSessions} thay)</span>
        )}
      </div>

      {/* Bonus row */}
      {basePassed ? (
        <div className="flex items-baseline gap-1 text-sm">
          <span className="text-muted-foreground">Thưởng:</span>
          <span className="font-medium text-green-700 dark:text-green-400">
            {formatVND(40_000)} × {totalScore}/10 × {ratioPercent}% = {formatVND(bonus)} ₫
          </span>
        </div>
      ) : (
        <div className="text-sm text-destructive font-medium">
          Không đạt điều kiện cơ bản — Thưởng: 0 ₫
        </div>
      )}
      {totalScheduled === 0 && basePassed && (
        <div className="text-xs text-muted-foreground">
          ⚠️ Chưa có dữ liệu điểm danh — thưởng sẽ tính sau khi có TKB.
        </div>
      )}
    </div>
  )
}
