'use client'

/**
 * Evaluation periods page — admin only. List periods, create new, close open ones.
 * /evaluation-periods
 */

import { useState, useEffect, useCallback } from 'react'
import { CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EvaluationPeriodTable } from '@/components/evaluations/evaluation-period-table'
import { EvaluationPeriodForm } from '@/components/evaluations/evaluation-period-form'
import { getEvaluationPeriods, closeEvaluationPeriod } from '@/lib/actions/evaluation-period-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { EvaluationPeriod } from '@/lib/types/evaluation'

export default function EvaluationPeriodsPage() {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  const fetchPeriods = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getEvaluationPeriods()
    if (result.success && result.data) setPeriods(result.data)
    else setError(result.error ?? 'Lỗi tải danh sách kỳ đánh giá.')
    setLoading(false)
  }, [])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  async function handleClose(id: string) {
    const result = await closeEvaluationPeriod(id)
    if (!result.success) setError(result.error ?? 'Lỗi đóng kỳ đánh giá.')
    else fetchPeriods()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5" />
          <h1 className="text-xl font-bold">Kỳ đánh giá</h1>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            + Tạo kỳ
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>
      )}

      <EvaluationPeriodTable
        periods={periods}
        onClose={isAdmin ? handleClose : undefined}
        loading={loading}
      />

      <EvaluationPeriodForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchPeriods}
      />
    </div>
  )
}
