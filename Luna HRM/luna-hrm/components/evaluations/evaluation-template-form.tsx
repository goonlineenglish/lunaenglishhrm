'use client'

/**
 * Evaluation template form dialog — create template + dynamic criteria list.
 * Admin only.
 */

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { createEvaluationTemplate } from '@/lib/actions/evaluation-template-actions'

interface CriterionDraft {
  name: string
  description: string
  max_score: string
  weight: string
}

const EMPTY_CRITERION: CriterionDraft = { name: '', description: '', max_score: '10', weight: '1' }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

export function EvaluationTemplateForm({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [appliesTo, setAppliesTo] = useState('all')
  const [criteria, setCriteria] = useState<CriterionDraft[]>([{ ...EMPTY_CRITERION }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addCriterion() {
    setCriteria((prev) => [...prev, { ...EMPTY_CRITERION }])
  }

  function removeCriterion(idx: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateCriterion(idx: number, field: keyof CriterionDraft, value: string) {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Tên mẫu không được để trống.')
    if (criteria.length === 0) return setError('Cần ít nhất 1 tiêu chí.')
    const invalid = criteria.find((c) => !c.name.trim())
    if (invalid) return setError('Tên tiêu chí không được để trống.')

    setLoading(true)
    try {
      const maxTotal = criteria.reduce((sum, c) => sum + Number(c.max_score || 0), 0)
      const result = await createEvaluationTemplate(
        { name: name.trim(), applies_to: appliesTo, max_total_score: maxTotal },
        criteria.map((c, i) => ({
          name: c.name.trim(),
          description: c.description || null,
          max_score: Number(c.max_score),
          weight: Number(c.weight) || 1,
          sort_order: i,
        }))
      )
      if (!result.success) return setError(result.error ?? 'Lỗi tạo mẫu.')
      onSuccess()
      onOpenChange(false)
      setName('')
      setAppliesTo('all')
      setCriteria([{ ...EMPTY_CRITERION }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo mẫu đánh giá</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="tname">Tên mẫu *</Label>
              <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Đánh giá T6/2026" />
            </div>
            <div className="space-y-1">
              <Label>Áp dụng cho *</Label>
              <Select value={appliesTo} onValueChange={setAppliesTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="assistant">Trợ giảng</SelectItem>
                  <SelectItem value="office">Văn phòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tiêu chí ({criteria.length})</p>
            <Button type="button" size="sm" variant="outline" onClick={addCriterion}>
              <Plus className="h-3 w-3 mr-1" /> Thêm tiêu chí
            </Button>
          </div>

          <div className="space-y-3">
            {criteria.map((c, idx) => (
              <div key={idx} className="border rounded p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Tiêu chí {idx + 1}</span>
                  {criteria.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeCriterion(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Tên tiêu chí *" value={c.name} onChange={(e) => updateCriterion(idx, 'name', e.target.value)} />
                <Input placeholder="Mô tả (tuỳ chọn)" value={c.description} onChange={(e) => updateCriterion(idx, 'description', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Điểm tối đa</Label>
                    <Input type="number" min="1" value={c.max_score} onChange={(e) => updateCriterion(idx, 'max_score', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hệ số</Label>
                    <Input type="number" min="0.1" step="0.1" value={c.weight} onChange={(e) => updateCriterion(idx, 'weight', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Tạo mẫu'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
