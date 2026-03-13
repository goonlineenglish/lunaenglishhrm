'use client'

/**
 * Create payroll period dialog — select month, year, branch.
 * Admin/accountant only. Calls createPayrollPeriod server action.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BranchSelector } from '@/components/shared/branch-selector'
import { createPayrollPeriod } from '@/lib/actions/payroll-actions'

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

interface Props {
  isAdmin: boolean
  /** Pre-selected branch for accountant scoped to one branch */
  defaultBranchId?: string
  onCreated: (periodId: string) => void
}

export function PayrollPeriodForm({ isAdmin, defaultBranchId, onCreated }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [open, setOpen] = useState(false)
  const [branchId, setBranchId] = useState(defaultBranchId ?? '')
  const [month, setMonth] = useState(String(currentMonth))
  const [year, setYear] = useState(String(currentYear))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!branchId) { setError('Vui lòng chọn chi nhánh.'); return }
    if (!month) { setError('Vui lòng chọn tháng.'); return }

    setLoading(true)
    setError(null)

    const result = await createPayrollPeriod(branchId, parseInt(month), parseInt(year))
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Lỗi tạo kỳ lương.')
      return
    }

    setOpen(false)
    if (result.data) onCreated((result.data as { id: string }).id)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tạo kỳ lương
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tạo kỳ lương mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {(isAdmin || !defaultBranchId) && (
            <div className="space-y-1">
              <Label>Chi nhánh</Label>
              <BranchSelector value={branchId} onChange={setBranchId} placeholder="Chọn chi nhánh" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tháng</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Tháng" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Năm</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                  <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                  <SelectItem value={String(currentYear + 1)}>{currentYear + 1}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo kỳ lương'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
