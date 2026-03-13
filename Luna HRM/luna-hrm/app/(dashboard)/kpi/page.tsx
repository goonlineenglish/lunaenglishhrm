'use client'

/**
 * KPI list page — /kpi. Shows all TG for branch/month. Admin uses BranchSelector; BM auto-scoped.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Star, ChevronRight, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BranchSelector } from '@/components/shared/branch-selector'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getAssistantsWithKpiStatus } from '@/lib/actions/kpi-actions'
import { formatVND } from '@/lib/utils/number-format'
import type { AssistantKpiStatus } from '@/lib/types/kpi'

const MONTH_LABELS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

export default function KpiPage() {
  const router = useRouter()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [branchId, setBranchId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [assistants, setAssistants] = useState<AssistantKpiStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detect role on mount
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  const fetchData = useCallback(async () => {
    if (isAdmin && !branchId) {
      setAssistants([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getAssistantsWithKpiStatus(branchId, month, year)
    if (result.success && result.data) {
      setAssistants(result.data)
    } else {
      setError(result.error ?? 'Lỗi tải danh sách KPI.')
    }
    setLoading(false)
  }, [branchId, month, year, isAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  function handleRowClick(empId: string) {
    router.push(`/kpi/${empId}?month=${month}&year=${year}`)
  }

  const yearOptions = [year - 1, year, year + 1]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          <h1 className="text-xl font-bold">KPI Trợ giảng</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year selector */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <BranchSelector
              value={branchId}
              onChange={(id) => { setBranchId(id); setAssistants([]) }}
            />
          )}
        </div>
      </div>

      {/* Branch prompt for admin */}
      {isAdmin && !branchId && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chọn chi nhánh để xem KPI trợ giảng.
        </div>
      )}

      {loading && (isAdmin ? !!branchId : true) && <LoadingSpinner />}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <p>{error}</p>
        </Alert>
      )}

      {!loading && (isAdmin ? !!branchId : true) && !error && assistants.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Không có trợ giảng nào trong tháng này.
        </div>
      )}

      {!loading && assistants.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs">
                    <th className="px-3 py-2 text-left border-b">Mã NV</th>
                    <th className="px-3 py-2 text-left border-b">Họ tên</th>
                    <th className="px-3 py-2 text-left border-b hidden sm:table-cell">Lớp</th>
                    <th className="px-3 py-2 text-center border-b">Điểm</th>
                    <th className="px-3 py-2 text-right border-b hidden sm:table-cell">Thưởng</th>
                    <th className="px-3 py-2 text-center border-b">Trạng thái</th>
                    <th className="px-3 py-2 border-b w-8" />
                  </tr>
                </thead>
                <tbody>
                  {assistants.map((a) => (
                    <tr
                      key={a.employee_id}
                      onClick={() => handleRowClick(a.employee_id)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 border-b text-muted-foreground text-xs">
                        {a.employee_code}
                      </td>
                      <td className="px-3 py-2 border-b font-medium">{a.employee_name}</td>
                      <td className="px-3 py-2 border-b text-muted-foreground hidden sm:table-cell">
                        {a.class_code ?? '—'}
                      </td>
                      <td className="px-3 py-2 border-b text-center font-medium">
                        {a.total_score !== null ? `${a.total_score}/10` : '—'}
                      </td>
                      <td className="px-3 py-2 border-b text-right text-muted-foreground hidden sm:table-cell">
                        {a.bonus_amount !== null ? `${formatVND(a.bonus_amount)} ₫` : '—'}
                      </td>
                      <td className="px-3 py-2 border-b text-center">
                        {a.is_evaluated ? (
                          <Badge variant="outline" className="text-green-700 border-green-400 text-xs">
                            Đã đánh giá
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-400 text-xs">
                            Chưa đánh giá
                          </Badge>
                        )}
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
