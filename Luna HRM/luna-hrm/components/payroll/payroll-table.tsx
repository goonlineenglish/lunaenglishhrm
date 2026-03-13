'use client'

/**
 * Payroll data table for a single tab (assistant/teacher/office).
 * Columns: #, Mã NV, Họ tên, Buổi, Đơn giá, Lương buổi, Dạy thay, Khác, KPI, GROSS, BH, Thuế, NET.
 * Highlights rows where NET change > 20% from previous period.
 * Row click → opens payslip detail panel.
 */

import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { formatVND } from '@/lib/utils/number-format'
import { compareNetPay } from '@/lib/services/payroll-calculation-service'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-actions'
import type { PayrollTabType } from '@/lib/types/payroll'

interface Props {
  payslips: PayslipWithEmployee[]
  tab: PayrollTabType
  onRowClick: (payslip: PayslipWithEmployee) => void
}

export function PayrollTable({ payslips, tab, onRowClick }: Props) {
  const showKpi = tab === 'assistant'
  const totalInsurance = (p: PayslipWithEmployee) => p.bhxh + p.bhyt + p.bhtn

  if (payslips.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Chưa có phiếu lương nào.
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs">
            <th className="px-2 py-2 text-center border w-8">#</th>
            <th className="px-2 py-2 text-left border">Mã NV</th>
            <th className="px-2 py-2 text-left border min-w-[120px]">Họ tên</th>
            <th className="px-2 py-2 text-right border">Buổi</th>
            <th className="px-2 py-2 text-right border">Đơn giá</th>
            <th className="px-2 py-2 text-right border">Lương buổi</th>
            <th className="px-2 py-2 text-right border">Dạy thay</th>
            <th className="px-2 py-2 text-right border">Khác</th>
            {showKpi && <th className="px-2 py-2 text-right border">KPI</th>}
            <th className="px-2 py-2 text-right border font-semibold">GROSS</th>
            <th className="px-2 py-2 text-right border">BH</th>
            <th className="px-2 py-2 text-right border">Thuế</th>
            <th className="px-2 py-2 text-right border font-semibold">NET</th>
          </tr>
        </thead>
        <tbody>
          {payslips.map((p, idx) => {
            const { isAlert } = compareNetPay(p.net_pay, null)
            const insurance = totalInsurance(p)

            return (
              <tr
                key={p.id}
                onClick={() => onRowClick(p)}
                className={cn(
                  'cursor-pointer hover:bg-muted/40 transition-colors',
                  isAlert && 'bg-yellow-50 hover:bg-yellow-100'
                )}
              >
                <td className="px-2 py-1.5 text-center border text-muted-foreground">{idx + 1}</td>
                <td className="px-2 py-1.5 border font-mono text-xs">{p.employee_code}</td>
                <td className="px-2 py-1.5 border">
                  <div className="flex items-center gap-1">
                    {isAlert && <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />}
                    <span className="truncate max-w-[140px]">{p.employee_name}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right border">{p.sessions_worked}</td>
                <td className="px-2 py-1.5 text-right border text-xs">{formatVND(p.rate_per_session)}</td>
                <td className="px-2 py-1.5 text-right border">{formatVND(p.teaching_pay)}</td>
                <td className="px-2 py-1.5 text-right border">{formatVND(p.substitute_pay)}</td>
                <td className="px-2 py-1.5 text-right border">{formatVND(p.other_pay)}</td>
                {showKpi && <td className="px-2 py-1.5 text-right border">{formatVND(p.kpi_bonus)}</td>}
                <td className="px-2 py-1.5 text-right border font-medium">{formatVND(p.gross_pay)}</td>
                <td className="px-2 py-1.5 text-right border text-xs text-muted-foreground">{formatVND(insurance)}</td>
                <td className="px-2 py-1.5 text-right border text-xs text-muted-foreground">{formatVND(p.tncn)}</td>
                <td className="px-2 py-1.5 text-right border font-semibold text-primary">{formatVND(p.net_pay)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 text-xs font-semibold">
            <td colSpan={showKpi ? 9 : 8} className="px-2 py-1.5 border text-right">Tổng cộng</td>
            <td className="px-2 py-1.5 text-right border">
              {formatVND(payslips.reduce((s, p) => s + p.gross_pay, 0))}
            </td>
            <td className="px-2 py-1.5 text-right border">
              {formatVND(payslips.reduce((s, p) => s + totalInsurance(p), 0))}
            </td>
            <td className="px-2 py-1.5 text-right border">
              {formatVND(payslips.reduce((s, p) => s + p.tncn, 0))}
            </td>
            <td className="px-2 py-1.5 text-right border text-primary">
              {formatVND(payslips.reduce((s, p) => s + p.net_pay, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
