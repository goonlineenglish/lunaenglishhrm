'use client'

/**
 * Confirmation dialog before re-initializing a payroll period.
 * Warns that auto-calc fields overwritten, all rows reset to is_reviewed=false.
 */

import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { reinitializePayslips } from '@/lib/actions/payroll-actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: string
  onConfirmed: () => void
}

export function ReinitializeConfirmDialog({ open, onOpenChange, periodId, onConfirmed }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await reinitializePayslips(periodId)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Không thể khởi tạo lại.')
      return
    }

    onOpenChange(false)
    onConfirmed()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Khởi tạo lại bảng lương?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left text-sm">
              <p>Thao tác này sẽ:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cập nhật lại số buổi dạy và lương buổi từ dữ liệu chấm công</li>
                <li>Cập nhật lại KPI, phụ cấp từ dữ liệu mới nhất</li>
                <li className="text-destructive font-medium">
                  Reset tất cả phiếu về chưa kiểm tra — kế toán cần nhập lại BHXH/NET
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                Dùng khi dữ liệu chấm công thay đổi sau khi đã khởi tạo.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Khởi tạo lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
