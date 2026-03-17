/**
 * Employee self-service: My KPI History.
 * Shows last 6 months of KPI evaluations for assistant employees.
 * Non-assistants see an informational message.
 * URL: /my-kpi
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getMyKpiHistory } from '@/lib/actions/kpi-query-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatVND } from '@/lib/utils/number-format'
import { TrendingUp, Star } from 'lucide-react'

const MONTH_LABELS = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

export default async function MyKpiPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  // Portal accessible to employees (and BM/accountant with employee role)
  if (!user.roles?.includes('employee')) redirect('/dashboard')

  const result = await getMyKpiHistory(6)
  const history = result.data ?? []

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          KPI của tôi
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Lịch sử điểm KPI 6 tháng gần nhất
        </p>
      </div>

      {result.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {history.length === 0 && !result.error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Star className="h-10 w-10 opacity-20" />
            <p className="text-sm">Chưa có dữ liệu KPI</p>
            <p className="text-xs text-center">
              KPI sẽ hiển thị sau khi quản lý nhập điểm hàng tháng
            </p>
          </CardContent>
        </Card>
      )}

      {history.map((kpi) => {
        const scorePercent = kpi.total_score != null
          ? Math.round((kpi.total_score / 10) * 100)
          : null

        return (
          <Card key={`${kpi.year}-${kpi.month}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {MONTH_LABELS[kpi.month] ?? `Tháng ${kpi.month}`} / {kpi.year}
              </CardTitle>
              <Badge variant={kpi.base_pass ? 'default' : 'destructive'}>
                {kpi.base_pass ? 'Đạt chuẩn' : 'Không đạt'}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Điểm KPI</p>
                <p className="font-bold text-lg">
                  {kpi.total_score != null ? kpi.total_score.toFixed(1) : '—'}
                  <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                </p>
                {scorePercent != null && (
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scorePercent >= 80 ? 'bg-green-500' : scorePercent >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Thưởng KPI</p>
                <p className="font-bold text-lg">
                  {kpi.bonus_amount != null ? formatVND(kpi.bonus_amount) : '—'}
                </p>
                {!kpi.base_pass && (
                  <p className="text-xs text-muted-foreground">(0 do không đạt chuẩn)</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
