'use client'

/**
 * KPI Part B: 5 scored criteria with score select + optional comment textarea.
 * Each criterion label, description, and maxScore come from KPI_CRITERIA constant.
 * Scores are integers from 0 to maxScore.
 */

import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KPI_CRITERIA } from '@/lib/types/kpi'
import type { KpiCriterionKey } from '@/lib/types/kpi'

// Keys that belong to Part B (scores + comments only)
export type PartBKey =
  | 'tsi_score' | 'tsi_comment'
  | 'funtime_score' | 'funtime_comment'
  | 'parent_score' | 'parent_comment'
  | 'student_score' | 'student_comment'
  | 'demeanor_score' | 'demeanor_comment'

export type PartBScores = Record<PartBKey, number | string>

interface Props {
  scores: PartBScores
  onChange: (field: PartBKey, value: number | string) => void
}

// Build score options array for a criterion (0 to maxScore inclusive)
function scoreOptions(maxScore: number): number[] {
  return Array.from({ length: maxScore + 1 }, (_, i) => i)
}

export function KpiPartBScores({ scores, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Chấm điểm từng tiêu chí. Tổng tối đa 100 điểm.
      </p>

      {KPI_CRITERIA.map((criterion) => {
        const key = criterion.key as KpiCriterionKey
        const scoreKey = `${key}_score` as PartBKey
        const commentKey = `${key}_comment` as PartBKey
        const currentScore = scores[scoreKey] as number

        return (
          <div key={key} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{criterion.label}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {criterion.description}
                </p>
              </div>
              <div className="shrink-0">
                <Select
                  value={String(currentScore)}
                  onValueChange={(v) => onChange(scoreKey, Number(v))}
                >
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scoreOptions(criterion.maxScore).map((score) => (
                      <SelectItem key={score} value={String(score)}>
                        {score}/{criterion.maxScore}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              placeholder="Nhận xét (tùy chọn)..."
              value={scores[commentKey] as string}
              onChange={(e) => onChange(commentKey, e.target.value)}
              className="text-xs min-h-[56px] resize-none"
            />
          </div>
        )
      })}
    </div>
  )
}
