'use client'

/**
 * Evaluation period form dialog — create a new evaluation period.
 * Admin only.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { createEvaluationPeriod } from '@/lib/actions/evaluation-period-actions'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

export function EvaluationPeriodForm({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Tên kỳ không được để trống.')
    if (!startDate || !endDate) return setError('Vui lòng nhập ngày bắt đầu và kết thúc.')
    if (startDate >= endDate) return setError('Ngày kết thúc phải sau ngày bắt đầu.')

    setLoading(true)
    try {
      const result = await createEvaluationPeriod({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      if (!result.success) return setError(result.error ?? 'Lỗi tạo kỳ đánh giá.')
      onSuccess()
      onOpenChange(false)
      setName('')
      setStartDate('')
      setEndDate('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tạo kỳ đánh giá</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

          <div className="space-y-1">
            <Label htmlFor="pname">Tên kỳ *</Label>
            <Input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Kỳ đánh giá T6/2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pstart">Từ ngày *</Label>
              <Input id="pstart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pend">Đến ngày *</Label>
              <Input id="pend" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Tạo kỳ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
