'use client'

/**
 * @deprecated Superseded by PayrollSpreadsheet (inline batch editing). Not imported anywhere.
 * Payslip detail slide-out panel (Sheet from right).
 * Shows full payslip breakdown: income, deductions, net pay.
 * Allows editing manual fields (other_pay, penalties, extra_notes) if period is draft.
 */

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert } from '@/components/ui/alert'
import { formatVND, formatVNDFull } from '@/lib/utils/number-format'
import { updatePayslipManualFields } from '@/lib/actions/payroll-actions'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-actions'
import type { PayrollStatus } from '@/lib/types/database'

interface Props {
  payslip: PayslipWithEmployee | null
  periodStatus: PayrollStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{formatVND(value)} ₫</span>
    </div>
  )
}

export function PayslipDetailPanel({ payslip, periodStatus, open, onOpenChange, onSaved }: Props) {
  const [otherPay, setOtherPay] = useState<string>('')
  const [penalties, setPenalties] = useState<string>('')
  const [extraNotes, setExtraNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDraft = periodStatus === 'draft'
  const isAssistant = payslip?.employee_position === 'assistant'
  const totalInsurance = (payslip?.bhxh ?? 0) + (payslip?.bhyt ?? 0) + (payslip?.bhtn ?? 0)

  function initEditFields() {
    setOtherPay(String(payslip?.other_pay ?? 0))
    setPenalties(String(payslip?.penalties ?? 0))
    setExtraNotes(payslip?.extra_notes ?? '')
  }

  async function handleSave() {
    if (!payslip) return
    setSaving(true)
    setError(null)
    const result = await updatePayslipManualFields(payslip.id, {
      other_pay: Math.round(parseFloat(otherPay) || 0),
      penalties: Math.round(parseFloat(penalties) || 0),
      extra_notes: extraNotes,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Lỗi cập nhật phiếu lương.')
      return
    }
    onSaved()
  }

  if (!payslip) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (v) initEditFields() }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{payslip.employee_name}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {payslip.employee_code} — {payslip.employee_position === 'assistant' ? 'Trợ giảng' :
              payslip.employee_position === 'teacher' ? 'Giáo viên' : 'Văn phòng'}
          </p>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          {/* Income section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Thu nhập</p>
            <Row label="Lương buổi dạy" value={payslip.teaching_pay} />
            <Row label="Dạy thay" value={payslip.substitute_pay} />
            {isAssistant && <Row label="Thưởng KPI" value={payslip.kpi_bonus} />}
            <Row label="Phụ cấp định kỳ" value={payslip.allowances} />
            <Row label="Thu nhập khác" value={payslip.other_pay} />
            <Separator />
            <Row label="GROSS" value={payslip.gross_pay} bold />
          </div>

          {/* Deductions section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Khấu trừ</p>
            {payslip.bhxh > 0 && <Row label="BHXH (8%)" value={payslip.bhxh} />}
            {payslip.bhyt > 0 && <Row label="BHYT (1.5%)" value={payslip.bhyt} />}
            {payslip.bhtn > 0 && <Row label="BHTN (1%)" value={payslip.bhtn} />}
            {payslip.tncn > 0 && <Row label="Thuế TNCN" value={payslip.tncn} />}
            {payslip.penalties > 0 && <Row label="Phạt" value={payslip.penalties} />}
            {(payslip.deductions ?? 0) > 0 && <Row label="Khấu trừ định kỳ" value={payslip.deductions ?? 0} />}
            <Separator />
            <Row label="Tổng khấu trừ" value={totalInsurance + payslip.tncn + (payslip.deductions ?? 0) + payslip.penalties} bold />
          </div>

          {/* Net pay */}
          <div className="rounded-md bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Thực lãnh</p>
            <p className="text-2xl font-bold text-primary">{formatVNDFull(payslip.net_pay)}</p>
          </div>

          {/* Edit manual fields (draft only) */}
          {isDraft && (
            <div className="space-y-3 pt-1">
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Điều chỉnh thủ công</p>

              <div className="space-y-1">
                <Label className="text-xs">Thu nhập khác (₫)</Label>
                <Input
                  type="number"
                  value={otherPay}
                  onChange={(e) => setOtherPay(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phạt (₫)</Label>
                <Input
                  type="number"
                  value={penalties}
                  onChange={(e) => setPenalties(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ghi chú</Label>
                <Textarea
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  rows={2}
                />
              </div>

              {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </Button>
            </div>
          )}

          {payslip.extra_notes && !isDraft && (
            <div className="text-sm text-muted-foreground border rounded p-2">
              <p className="font-medium text-xs mb-1">Ghi chú:</p>
              <p>{payslip.extra_notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
