'use client'

/**
 * Payroll period detail — /payroll/[period]
 * Spreadsheet-style UI: inline editable rows, batch save, re-initialize, confirm.
 * 3-tab view: Trợ giảng | Giáo viên | Văn phòng
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DollarSign, Calculator, RefreshCw, Check, Undo2, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PayrollStatusBadge } from '@/components/payroll/payroll-status-badge'
import { PayrollSpreadsheet } from '@/components/payroll/payroll-spreadsheet'
import { ConfirmPayrollDialog } from '@/components/payroll/confirm-payroll-dialog'
import { ReinitializeConfirmDialog } from '@/components/payroll/reinitialize-confirm-dialog'
import { ExcelExportButton } from '@/components/payroll/excel-export-button'
import { PayrollAttendanceSummary } from '@/components/payroll/payroll-attendance-summary'
import { getPayrollPeriod, getPayslipsByPeriod, initializePayslips, undoPayrollPeriod } from '@/lib/actions/payroll-actions'
import { formatVND } from '@/lib/utils/number-format'
import type { PayrollPeriodWithCount, PayslipWithEmployee } from '@/lib/actions/payroll-actions'

type TabType = 'assistant' | 'teacher' | 'office'

const TABS: { key: TabType; label: string; positions: string[] }[] = [
  { key: 'assistant', label: 'Trợ giảng', positions: ['assistant'] },
  { key: 'teacher',   label: 'Giáo viên', positions: ['teacher'] },
  { key: 'office',    label: 'Văn phòng', positions: ['office', 'admin'] },
]

export default function PayrollPeriodPage() {
  const { period: periodId } = useParams<{ period: string }>()
  const router = useRouter()

  const [period, setPeriod] = useState<PayrollPeriodWithCount | null>(null)
  const [payslips, setPayslips] = useState<PayslipWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [dirtyTabs, setDirtyTabs] = useState<Record<TabType, boolean>>({ assistant: false, teacher: false, office: false })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reinitOpen, setReinitOpen] = useState(false)

  const isDirty = dirtyTabs.assistant || dirtyTabs.teacher || dirtyTabs.office

  /** Per-tab dirty callback factory — stable reference per tab key */
  const makeDirtyHandler = useCallback(
    (tabKey: TabType) => (dirty: boolean) => {
      setDirtyTabs((prev) => (prev[tabKey] === dirty ? prev : { ...prev, [tabKey]: dirty }))
    },
    []
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [pRes, slipRes] = await Promise.all([
      getPayrollPeriod(periodId),
      getPayslipsByPeriod(periodId),
    ])
    if (pRes.success && pRes.data) setPeriod(pRes.data as PayrollPeriodWithCount)
    else setError(pRes.error ?? 'Lỗi tải kỳ lương.')
    if (slipRes.success && slipRes.data) setPayslips(slipRes.data)
    setLoading(false)
  }, [periodId])

  useEffect(() => { fetchData() }, [fetchData])

  // Warn on tab close when unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function handleInitialize() {
    setActionLoading(true); setError(null)
    const r = await initializePayslips(periodId)
    setActionLoading(false)
    if (!r.success) { setError(r.error ?? 'Lỗi khởi tạo lương.'); return }
    fetchData()
  }

  const canUndo = () => {
    if (!period?.confirmed_at || period.status !== 'confirmed') return false
    return (Date.now() - new Date(period.confirmed_at).getTime()) / 3_600_000 <= 24
  }

  const isDraft = period?.status === 'draft'
  const hasPayslips = payslips.length > 0

  if (loading) return <LoadingSpinner />

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => {
              if (isDirty && !confirm('Bạn có thay đổi chưa lưu. Rời đi?')) return
              router.push('/payroll')
            }} className="text-muted-foreground hover:text-foreground">
              <DollarSign className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">
              Tháng {period?.month}/{period?.year}
            </h1>
            {period && <PayrollStatusBadge status={period.status} />}
            {hasPayslips && (
              <span className="text-xs text-muted-foreground">
                {payslips.length} NV · GROSS {formatVND(period?.total_gross ?? 0)} · NET {formatVND(period?.total_net ?? 0)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Excel export — disabled when dirty */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ExcelExportButton
                    payslips={payslips}
                    periodName={period ? `T${period.month}/${period.year}` : ''}
                    disabled={actionLoading || !hasPayslips || isDirty}
                  />
                </span>
              </TooltipTrigger>
              {isDirty && <TooltipContent>Lưu thay đổi trước khi xuất Excel</TooltipContent>}
            </Tooltip>

            {isDraft && (
              <>
                {/* Initialize (when no payslips) */}
                {!hasPayslips && (
                  <Button size="sm" variant="outline" onClick={handleInitialize} disabled={actionLoading}>
                    <Calculator className="h-4 w-4 mr-1" />Khởi tạo lương
                  </Button>
                )}

                {/* Re-initialize (when payslips exist) — disabled when dirty */}
                {hasPayslips && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReinitOpen(true)}
                          disabled={actionLoading || isDirty}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />Khởi tạo lại
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isDirty && <TooltipContent>Lưu thay đổi trước khi khởi tạo lại</TooltipContent>}
                  </Tooltip>
                )}

                {/* Confirm — disabled when dirty */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                        disabled={actionLoading || !hasPayslips || isDirty}
                      >
                        <Check className="h-4 w-4 mr-1" />Duyệt lương
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isDirty && <TooltipContent>Lưu thay đổi trước khi duyệt</TooltipContent>}
                </Tooltip>
              </>
            )}

            {/* Undo confirm */}
            {canUndo() && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={async () => {
                  if (!confirm('Hoàn tác xác nhận bảng lương?')) return
                  setActionLoading(true)
                  const r = await undoPayrollPeriod(periodId)
                  setActionLoading(false)
                  if (!r.success) setError(r.error ?? 'Lỗi hoàn tác.')
                  else fetchData()
                }}
              >
                <Undo2 className="h-4 w-4 mr-1" />Hoàn tác
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <p>{error}</p>
          </Alert>
        )}

        {/* Attendance summary panel — collapsible, lazy-fetches on first open */}
        {period && (
          <PayrollAttendanceSummary
            branchId={period.branch_id}
            month={period.month}
            year={period.year}
          />
        )}

        {/* 3-tab spreadsheet — forceMount keeps edit state across tabs */}
        <Tabs defaultValue="assistant">
          <TabsList>
            {TABS.map((tab) => {
              const count = payslips.filter((p) => tab.positions.includes(p.employee_position)).length
              return (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>

          {TABS.map((tab) => {
            const tabPayslips = payslips
              .filter((p) => tab.positions.includes(p.employee_position))
              .sort((a, b) => a.employee_code.localeCompare(b.employee_code))

            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-3" forceMount>
                <PayrollSpreadsheet
                  payslips={tabPayslips}
                  tab={tab.key}
                  periodId={periodId}
                  periodStatus={period?.status ?? 'draft'}
                  onSaved={fetchData}
                  onDirtyChange={makeDirtyHandler(tab.key)}
                />
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Confirm dialog */}
        {period && (
          <ConfirmPayrollDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            periodId={period.id}
            employeeCount={payslips.length}
            totalGross={period.total_gross}
            totalNet={period.total_net}
            onConfirmed={fetchData}
          />
        )}

        {/* Re-initialize dialog */}
        <ReinitializeConfirmDialog
          open={reinitOpen}
          onOpenChange={setReinitOpen}
          periodId={periodId}
          onConfirmed={fetchData}
        />
      </div>
    </TooltipProvider>
  )
}
