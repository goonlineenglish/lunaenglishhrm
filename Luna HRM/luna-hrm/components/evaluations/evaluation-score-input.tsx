'use client'

/**
 * Single criterion score input — name, description tooltip, score slider/input, comment.
 */

import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface Props {
  criterionId: string
  name: string
  description?: string | null
  maxScore: number
  score: number
  comment: string
  onScoreChange: (id: string, value: number) => void
  onCommentChange: (id: string, value: string) => void
}

export function EvaluationScoreInput({
  criterionId,
  name,
  description,
  maxScore,
  score,
  comment,
  onScoreChange,
  onCommentChange,
}: Props) {
  function clamp(v: number) {
    return Math.min(maxScore, Math.max(0, v))
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-muted/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{name}</span>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            min={0}
            max={maxScore}
            step={0.5}
            value={score}
            onChange={(e) => onScoreChange(criterionId, clamp(Number(e.target.value)))}
            className="w-16 h-7 text-center text-sm"
          />
          <span className="text-xs text-muted-foreground">/{maxScore}</span>
        </div>
      </div>
      <Input
        placeholder="Nhận xét (tuỳ chọn)"
        value={comment}
        onChange={(e) => onCommentChange(criterionId, e.target.value)}
        className="h-7 text-xs"
      />
    </div>
  )
}
