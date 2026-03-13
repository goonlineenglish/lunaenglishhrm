'use client'

/**
 * Double-confirm dialog before finalizing a payroll period.
 * Shows employee count, total GROSS, total NET for review.
 */

import { useState } from 'react'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatVNDFull } from '@/lib/utils/number-format'
import { confirmPayrollPeriod } from '@/lib/actions/payroll-actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: string
  employeeCount: number
  totalGross: number
  totalNet: number
  onConfirmed: () => void
}

export function ConfirmPayrollDialog({
  open,
  onOpenChange,
  periodId,
  employeeCount,
  totalGross,
  totalNet,
  onConfirmed,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await confirmPayrollPeriod(periodId)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Lỗi xác nhận kỳ lương.')
      return
    }
    onOpenChange(false)
    onConfirmed()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xác nhận bảng lương</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Sau khi xác nhận, bảng lương sẽ bị khoá và không thể chỉnh sửa
            (có thể hoàn tác trong vòng 24 giờ).
          </p>

          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số nhân viên</span>
              <span className="font-medium">{employeeCount} người</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng GROSS</span>
              <span className="font-medium">{formatVNDFull(totalGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng NET</span>
              <span className="font-bold text-base">{formatVNDFull(totalNet)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Huỷ
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <Check className="h-4 w-4 mr-1" />
            {loading ? 'Đang xác nhận...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
