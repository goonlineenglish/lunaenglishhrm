/**
 * Employee self-service: payslip detail page.
 * Full salary breakdown — mobile-optimized card layout.
 * Employee can only view their own payslip (server-action checks ownership).
 */

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getMyPayslipDetail } from '@/lib/actions/employee-portal-actions'
import type { MyPayslipDetail } from '@/lib/actions/employee-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatVND, formatVNDFull } from '@/lib/utils/number-format'
import { ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { PayslipEmployeeStatus } from '@/lib/types/database-payroll-types'

interface PageProps {
  params: Promise<{ id: string }>
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? 'text-foreground text-base' : ''}`}>{value}</span>
    </div>
  )
}

function EmployeeStatusBadge({ status }: { status: PayslipEmployeeStatus | undefined }) {
  if (!status || status === 'pending_send') return null
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    sent: { label: 'Chờ xác nhận', icon: <Clock className="h-3 w-3" />, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    confirmed: { label: 'Đã xác nhận', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-green-100 text-green-800 border-green-200' },
    disputed: { label: 'Đang khiếu nại', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-800 border-red-200' },
  }
  const c = config[status]
  if (!c) return null
  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${c.className}`}>
      {c.icon}{c.label}
    </Badge>
  )
}

export default async function MyPayslipDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.roles?.includes("employee")) redirect('/dashboard')

  const { id } = await params
  const result = await getMyPayslipDetail(id)

  if (!result.success || !result.data) {
    if (result.error?.includes('không có quyền')) notFound()
    notFound()
  }

  const p = result.data
  const hasInsurance = p.bhxh > 0 || p.bhyt > 0 || p.bhtn > 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empStatus = (p as any).employee_status as PayslipEmployeeStatus | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empFeedback = (p as any).employee_feedback as string | null

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" className="pl-0 -ml-1" asChild>
          <Link href="/my-payslips">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Phiếu lương
          </Link>
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Phiếu lương tháng {p.period_month}/{p.period_year}</CardTitle>
            <EmployeeStatusBadge status={empStatus} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{formatVNDFull(p.net_pay)}</p>
          <p className="text-xs text-muted-foreground mt-1">Thực lãnh</p>
        </CardContent>
      </Card>

      {/* Income section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Thu nhập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          {p.sessions_worked > 0 && (
            <Row
              label={`Lương buổi dạy (${p.sessions_worked} buổi × ${formatVND(p.rate_per_session)} ₫)`}
              value={`${formatVND(p.teaching_pay)} ₫`}
            />
          )}
          {p.substitute_sessions > 0 && (
            <Row
              label={`Dạy thay (${p.substitute_sessions} buổi × ${formatVND(p.substitute_rate)} ₫)`}
              value={`${formatVND(p.substitute_pay)} ₫`}
            />
          )}
          {p.other_pay > 0 && (
            <Row label="Thu nhập khác" value={`${formatVND(p.other_pay)} ₫`} />
          )}
          {p.kpi_bonus > 0 && (
            <Row label="Thưởng KPI" value={`${formatVND(p.kpi_bonus)} ₫`} />
          )}
          {p.allowances > 0 && (
            <Row label="Phụ cấp" value={`${formatVND(p.allowances)} ₫`} />
          )}
          <Separator className="my-2" />
          <Row label="Tổng thu nhập" value={`${formatVND(p.gross_pay)} ₫`} highlight />
        </CardContent>
      </Card>

      {/* Deductions section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Khấu trừ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          {hasInsurance && (
            <>
              {p.bhxh > 0 && (
                <Row label="BHXH (8%)" value={`- ${formatVND(p.bhxh)} ₫`} />
              )}
              {p.bhyt > 0 && (
                <Row label="BHYT (1.5%)" value={`- ${formatVND(p.bhyt)} ₫`} />
              )}
              {p.bhtn > 0 && (
                <Row label="BHTN (1%)" value={`- ${formatVND(p.bhtn)} ₫`} />
              )}
            </>
          )}
          {p.tncn > 0 && (
            <Row label="Thuế TNCN" value={`- ${formatVND(p.tncn)} ₫`} />
          )}
          {p.penalties > 0 && (
            <Row label="Phạt / Khấu trừ" value={`- ${formatVND(p.penalties)} ₫`} />
          )}
          {!hasInsurance && p.tncn === 0 && p.penalties === 0 && (
            <p className="text-sm text-muted-foreground py-1">Không có khấu trừ.</p>
          )}
        </CardContent>
      </Card>

      {/* Net pay summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="flex justify-between items-center py-4">
          <span className="font-semibold text-base">Thực lãnh</span>
          <span className="text-xl font-bold text-primary">{formatVNDFull(p.net_pay)}</span>
        </CardContent>
      </Card>

      {/* Dispute feedback if any */}
      {empStatus === 'disputed' && empFeedback && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 font-medium uppercase tracking-wide">
              Nội dung khiếu nại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-red-800">{empFeedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {p.extra_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Ghi chú
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{p.extra_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
