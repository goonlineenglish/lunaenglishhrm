'use client'

/**
 * KPI 6-month history chart — CSS-based bar chart, no external library.
 * Bars are colored by score: green (8-10), yellow (5-7), red (0-4).
 * Each bar shows month label + bonus amount below.
 * Gray placeholder bar for months with no data.
 */

import { formatVND } from '@/lib/utils/number-format'
import type { KpiEvaluation } from '@/lib/types/database'

interface Props {
  /** Most recent first (month desc). Array may have < 6 items. */
  history: KpiEvaluation[]
  /** Current month being viewed (1-12) */
  currentMonth: number
  /** Current year */
  currentYear: number
}

const MAX_SCORE = 100
const MONTHS_TO_SHOW = 6

/** Build the last N month/year pairs ending at current, oldest-first */
function buildMonthRange(
  month: number,
  year: number,
  count: number
): { month: number; year: number; label: string }[] {
  const result = []
  let m = month
  let y = year
  for (let i = 0; i < count; i++) {
    result.unshift({ month: m, year: y, label: `T${m}` })
    m -= 1
    if (m < 1) { m = 12; y -= 1 }
  }
  return result
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

export function KpiHistoryChart({ history, currentMonth, currentYear }: Props) {
  const range = buildMonthRange(currentMonth, currentYear, MONTHS_TO_SHOW)

  // Map data by month/year key
  const dataMap = new Map<string, KpiEvaluation>()
  for (const row of history) {
    dataMap.set(`${row.year}-${row.month}`, row)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">6 tháng gần nhất</p>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-28">
        {range.map(({ month, year, label }) => {
          const key = `${year}-${month}`
          const row = dataMap.get(key)
          const hasData = !!row
          const score = row?.total_score ?? 0
          // Height as percentage of container (min 4px for visibility)
          const heightPct = hasData ? Math.max(4, (score / MAX_SCORE) * 100) : 0

          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-1">
              {/* Score label above bar */}
              <span className="text-xs font-medium h-4 text-center">
                {hasData ? score : ''}
              </span>

              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: '72px' }}>
                {hasData ? (
                  <div
                    className={`w-full rounded-sm ${barColor(score)} transition-all`}
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className="w-full rounded-sm bg-muted" style={{ height: '8px' }} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels + bonus */}
      <div className="flex gap-2">
        {range.map(({ month, year, label }) => {
          const key = `${year}-${month}`
          const row = dataMap.get(key)
          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              {row && (
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {formatVND(row.bonus_amount)}₫
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
