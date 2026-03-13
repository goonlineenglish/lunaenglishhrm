'use client'

/**
 * Evaluation history list — card list of past evaluations, expandable for details.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EvaluationDetailView } from '@/components/evaluations/evaluation-detail-view'
import type { EvaluationListRow } from '@/lib/types/evaluation'

interface Props {
  evaluations: EvaluationListRow[]
  loading?: boolean
}

const EVAL_TYPE_LABELS: Record<string, string> = {
  periodic: 'Định kỳ',
  ad_hoc: 'Đột xuất',
}

export function EvaluationHistoryList({ evaluations, loading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md text-sm">
        Chưa có đánh giá nào.
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN')
  }

  return (
    <div className="space-y-2">
      {evaluations.map((ev) => (
        <Card key={ev.id} className="overflow-hidden">
          <CardContent className="p-0">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ev.template_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(ev.created_at)} · {ev.evaluator_name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {EVAL_TYPE_LABELS[ev.eval_type] ?? ev.eval_type}
                </Badge>
                <span className="text-sm font-semibold text-primary">{ev.total_score} điểm</span>
                {expandedId === ev.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedId === ev.id && (
              <div className="border-t bg-muted/10 px-4 py-3">
                <EvaluationDetailView evaluationId={ev.id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
