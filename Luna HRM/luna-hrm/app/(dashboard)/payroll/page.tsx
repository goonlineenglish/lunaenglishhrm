'use client'

/**
 * Payroll periods list page — /payroll
 * Lists all periods by branch, allows creating new periods.
 * Admin/accountant access. Admin uses BranchSelector; accountant auto-scoped.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, ChevronRight, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BranchSelector } from '@/components/shared/branch-selector'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PayrollStatusBadge } from '@/components/payroll/payroll-status-badge'
import { PayrollPeriodForm } from '@/components/payroll/payroll-period-form'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getPayrollPeriods } from '@/lib/actions/payroll-actions'
import { formatVND } from '@/lib/utils/number-format'
import type { PayrollPeriodWithCount } from '@/lib/actions/payroll-actions'

export default function PayrollPage() {
  const router = useRouter()
  const [branchId, setBranchId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [periods, setPeriods] = useState<PayrollPeriodWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  const fetchPeriods = useCallback(async () => {
    if (!branchId) {
      setPeriods([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getPayrollPeriods(branchId)
    if (result.success && result.data) {
      setPeriods(result.data)
    } else {
      setError(result.error ?? 'Lỗi tải danh sách kỳ lương.')
    }
    setLoading(false)
  }, [branchId])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  function handleCreated(periodId: string) {
    router.push(`/payroll/${periodId}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <h1 className="text-xl font-bold">Tính lương</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BranchSelector value={branchId} onChange={(id) => { setBranchId(id); setPeriods([]) }} />
          {branchId && (
            <PayrollPeriodForm
              isAdmin={isAdmin}
              defaultBranchId={branchId}
              onCreated={handleCreated}
            />
          )}
        </div>
      </div>

      {!branchId && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chọn chi nhánh để xem kỳ lương.
        </div>
      )}

      {loading && branchId && <LoadingSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <p>{error}</p>
        </Alert>
      )}

      {!loading && branchId && periods.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chưa có kỳ lương nào. Nhấn &quot;Tạo kỳ lương&quot; để bắt đầu.
        </div>
      )}

      {!loading && periods.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs">
                    <th className="px-3 py-2 text-left border-b">Kỳ lương</th>
                    <th className="px-3 py-2 text-left border-b">Trạng thái</th>
                    <th className="px-3 py-2 text-right border-b">Tổng GROSS</th>
                    <th className="px-3 py-2 text-right border-b">Tổng NET</th>
                    <th className="px-3 py-2 text-center border-b">Số NV</th>
                    <th className="px-3 py-2 text-center border-b"></th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr
                      key={period.id}
                      onClick={() => router.push(`/payroll/${period.id}`)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 border-b font-medium">
                        T{period.month}/{period.year}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <PayrollStatusBadge status={period.status} />
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        {formatVND(period.total_gross)} ₫
                      </td>
                      <td className="px-3 py-2 border-b text-right font-medium">
                        {formatVND(period.total_net)} ₫
                      </td>
                      <td className="px-3 py-2 border-b text-center text-muted-foreground">
                        {period.payslip_count}
                      </td>
                      <td className="px-3 py-2 border-b text-center">
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
