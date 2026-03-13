'use client'

/**
 * KPI evaluation form page — /kpi/[employee]?month=X&year=Y
 * Data logic lives in kpi-eval-form-hooks.ts.
 * Shows Part A mandatory checklist + Part B scored criteria.
 * Pre-fills from previous month if no current evaluation exists.
 */

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { KpiPartAChecklist } from '@/components/kpi/kpi-part-a-checklist'
import { KpiPartBScores } from '@/components/kpi/kpi-part-b-scores'
import { KpiScoreDisplay } from '@/components/kpi/kpi-score-display'
import { KpiHistoryChart } from '@/components/kpi/kpi-history-chart'
import { useKpiEvalForm } from '@/components/kpi/kpi-eval-form-hooks'

export default function KpiEvalPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const employeeId = params.employee as string
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())

  const {
    form, history, loading, saving, error,
    prefilled, saveSuccess, totalScore, basePassed,
    handleFormField, handleChecks, handleSave,
  } = useKpiEvalForm(employeeId, month, year)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 pl-0"
        onClick={() => router.push(`/kpi?month=${month}&year=${year}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách KPI
      </Button>

      {/* Title */}
      <h1 className="text-xl font-bold">
        Đánh giá KPI — Tháng {month}/{year}
      </h1>

      {/* Pre-fill banner */}
      {prefilled && (
        <Alert>
          <Info className="h-4 w-4" />
          <p className="text-sm">
            Dữ liệu sao chép từ tháng trước — vui lòng xem lại trước khi lưu.
          </p>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <p>{error}</p>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="border-green-400 bg-green-50 dark:bg-green-950/20">
          <p className="text-sm text-green-700 dark:text-green-400">
            Đã lưu đánh giá KPI thành công.
          </p>
        </Alert>
      )}

      {/* Score summary */}
      <KpiScoreDisplay totalScore={totalScore} basePassed={basePassed} />

      {/* Part A */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phần A — Điều kiện cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiPartAChecklist checks={form.mandatory_checks} onChange={handleChecks} />
        </CardContent>
      </Card>

      {/* Part B */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phần B — Tiêu chí chấm điểm</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiPartBScores scores={form} onChange={handleFormField} />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-28">
          {saving ? 'Đang lưu...' : 'Lưu đánh giá'}
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lịch sử KPI</CardTitle>
            </CardHeader>
            <CardContent>
              <KpiHistoryChart history={history} currentMonth={month} currentYear={year} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
