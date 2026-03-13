'use client'

/**
 * Evaluation form — select template + period, score each criterion, save.
 * BM/admin only. Auto-calculates total.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { EvaluationScoreInput } from '@/components/evaluations/evaluation-score-input'
import { getEmployeeById } from '@/lib/actions/employee-actions'
import { getEvaluationTemplates, getEvaluationTemplate } from '@/lib/actions/evaluation-template-actions'
import { getEvaluationPeriods } from '@/lib/actions/evaluation-period-actions'
import { createEvaluation } from '@/lib/actions/evaluation-save-actions'
import type { EvaluationTemplateWithCount, EvaluationPeriod, CriterionRow } from '@/lib/types/evaluation'

interface Props {
  employeeId: string
  onSuccess: () => void
  onCancel?: () => void
}

interface ScoreMap {
  [criterionId: string]: { score: number; comment: string }
}

export function EvaluationForm({ employeeId, onSuccess, onCancel }: Props) {
  const [templates, setTemplates] = useState<EvaluationTemplateWithCount[]>([])
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([])
  const [criteria, setCriteria] = useState<CriterionRow[]>([])
  const [templateId, setTemplateId] = useState('')
  const [periodId, setPeriodId] = useState('ad_hoc')
  const [scores, setScores] = useState<ScoreMap>({})
  const [overallNotes, setOverallNotes] = useState('')
  const [bonusImpact, setBonusImpact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const [t, p, empResult] = await Promise.all([
        getEvaluationTemplates(),
        getEvaluationPeriods(),
        getEmployeeById(employeeId),
      ])
      const empPosition = empResult.success && empResult.data ? empResult.data.position : null
      if (t.success && t.data) {
        // Filter: only active templates matching employee position (P1-1, P1-4)
        setTemplates(t.data.filter((tmpl) =>
          tmpl.is_active && (tmpl.applies_to === 'all' || tmpl.applies_to === empPosition)
        ))
      }
      if (p.success && p.data) setPeriods(p.data.filter((x) => x.status === 'open'))
    }
    init()
  }, [employeeId])

  const loadCriteria = useCallback(async (id: string) => {
    if (!id) return
    const result = await getEvaluationTemplate(id)
    if (result.success && result.data) {
      setCriteria(result.data.criteria)
      // Init scores map
      const init: ScoreMap = {}
      result.data.criteria.forEach((c) => { init[c.id] = { score: 0, comment: '' } })
      setScores(init)
    }
  }, [])

  useEffect(() => { loadCriteria(templateId) }, [templateId, loadCriteria])

  const totalScore = criteria.reduce((sum, c) => {
    const s = scores[c.id]?.score ?? 0
    return sum + s * (c.weight ?? 1)
  }, 0)

  function handleScore(id: string, value: number) {
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], score: value } }))
  }

  function handleComment(id: string, value: string) {
    setScores((prev) => ({ ...prev, [id]: { ...prev[id], comment: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!templateId) return setError('Vui lòng chọn mẫu đánh giá.')

    setLoading(true)
    try {
      const scoreInputs = Object.entries(scores).map(([criterion_id, v]) => ({
        criterion_id,
        score: v.score,
        comment: v.comment || null,
      }))

      const result = await createEvaluation({
        employee_id: employeeId,
        template_id: templateId,
        period_id: periodId === 'ad_hoc' ? null : periodId,
        eval_type: periodId === 'ad_hoc' ? 'ad_hoc' : 'periodic',
        overall_notes: overallNotes || null,
        bonus_impact: bonusImpact ? Number(bonusImpact) : null,
        scores: scoreInputs,
      })

      if (!result.success) return setError(result.error ?? 'Lỗi lưu đánh giá.')
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Thiết lập đánh giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mẫu đánh giá *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mẫu..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Kỳ đánh giá</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad_hoc">Đột xuất (không có kỳ)</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {criteria.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chấm điểm</CardTitle>
              <span className="text-sm font-semibold text-primary">Tổng: {totalScore}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {criteria.map((c) => (
              <EvaluationScoreInput
                key={c.id}
                criterionId={c.id}
                name={c.name}
                description={c.description}
                maxScore={c.max_score}
                score={scores[c.id]?.score ?? 0}
                comment={scores[c.id]?.comment ?? ''}
                onScoreChange={handleScore}
                onCommentChange={handleComment}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="overall_notes">Nhận xét chung</Label>
          <Input
            id="overall_notes"
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="Nhận xét tổng thể về nhân viên..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bonus_impact">Ảnh hưởng thưởng (VND, tuỳ chọn)</Label>
          <Input
            id="bonus_impact"
            type="number"
            min="0"
            value={bonusImpact}
            onChange={(e) => setBonusImpact(e.target.value)}
            placeholder="Thông tin, không tự động tính lương"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading || !templateId}>
          {loading ? 'Đang lưu...' : 'Lưu đánh giá'}
        </Button>
      </div>
    </form>
  )
}
