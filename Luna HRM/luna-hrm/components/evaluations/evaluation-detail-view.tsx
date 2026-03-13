'use client'

/**
 * Evaluation detail view — full criterion breakdown, notes, bonus impact.
 * Fetches data by evaluationId on mount.
 */

import { useEffect, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { getEvaluationDetail } from '@/lib/actions/evaluation-actions'
import type { EvaluationDetail } from '@/lib/types/evaluation'

interface Props {
  evaluationId: string
}

export function EvaluationDetailView({ evaluationId }: Props) {
  const [detail, setDetail] = useState<EvaluationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvaluationDetail(evaluationId).then((r) => {
      if (r.success && r.data) setDetail(r.data)
      setLoading(false)
    })
  }, [evaluationId])

  if (loading) return <p className="text-xs text-muted-foreground">Đang tải...</p>
  if (!detail) return <p className="text-xs text-destructive">Không thể tải chi tiết đánh giá.</p>

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>Người đánh giá: <strong className="text-foreground">{detail.evaluator_name}</strong></span>
        <span>Tổng điểm: <strong className="text-primary">{detail.total_score}</strong></span>
      </div>

      <Separator />

      <div className="space-y-1.5">
        {detail.scores.map((s) => (
          <div key={s.id} className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-medium">{s.criterion_name}</p>
              {s.comment && <p className="text-xs text-muted-foreground italic">{s.comment}</p>}
            </div>
            <span className="text-xs font-semibold shrink-0">
              {s.score}/{s.max_score}
            </span>
          </div>
        ))}
      </div>

      {(detail.overall_notes || detail.bonus_impact != null) && (
        <>
          <Separator />
          {detail.overall_notes && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Nhận xét: </span>
              {detail.overall_notes}
            </p>
          )}
          {detail.bonus_impact != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Ảnh hưởng thưởng: </span>
              {detail.bonus_impact.toLocaleString('vi-VN')} ₫
              <span className="text-[10px] ml-1">(thông tin, không tự động tính lương)</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}
