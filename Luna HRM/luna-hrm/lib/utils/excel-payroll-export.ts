/**
 * Generate .xlsx file from payslip data for a payroll period.
 * Creates 3 sheets: Trợ giảng | Giáo viên | Văn phòng
 * with summary totals row at the bottom.
 */

import * as XLSX from 'xlsx'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-payslip-actions'

// ─── Column headers ───────────────────────────────────────────────────────────

const HEADERS = [
  'STT', 'Mã NV', 'Họ tên',
  'Số buổi', 'Đơn giá', 'Lương buổi',
  'Dạy thay', 'KPI', 'Phụ cấp', 'Khác (+)',
  'GROSS', 'BHXH', 'BHYT', 'BHTN', 'TNCN',
  'Phạt', 'Khấu trừ', 'NET',
]

// ─── Sheet data builder ───────────────────────────────────────────────────────

function buildSheetData(payslips: PayslipWithEmployee[]): (string | number)[][] {
  const rows: (string | number)[][] = [HEADERS]

  let totSessions = 0, totTeachingPay = 0, totSubPay = 0
  let totKpi = 0, totAllowances = 0, totOtherPay = 0, totGross = 0
  let totBhxh = 0, totBhyt = 0, totBhtn = 0, totTncn = 0
  let totPenalties = 0, totDeductions = 0, totNet = 0

  payslips.forEach((p, idx) => {
    rows.push([
      idx + 1,
      p.employee_code,
      p.employee_name,
      p.sessions_worked,
      p.rate_per_session,
      p.teaching_pay,
      p.substitute_pay,
      p.kpi_bonus,
      p.allowances,
      p.other_pay,
      p.gross_pay,
      p.bhxh,
      p.bhyt,
      p.bhtn,
      p.tncn,
      p.penalties,
      p.deductions,
      p.net_pay,
    ])

    totSessions += p.sessions_worked
    totTeachingPay += p.teaching_pay
    totSubPay += p.substitute_pay
    totKpi += p.kpi_bonus
    totAllowances += p.allowances
    totOtherPay += p.other_pay
    totGross += p.gross_pay
    totBhxh += p.bhxh
    totBhyt += p.bhyt
    totBhtn += p.bhtn
    totTncn += p.tncn
    totPenalties += p.penalties
    totDeductions += p.deductions
    totNet += p.net_pay
  })

  // Summary row
  rows.push([
    'TỔNG', '', '',
    totSessions, '', totTeachingPay,
    totSubPay, totKpi, totAllowances, totOtherPay,
    totGross, totBhxh, totBhyt, totBhtn, totTncn,
    totPenalties, totDeductions, totNet,
  ])

  return rows
}

// ─── Column widths ────────────────────────────────────────────────────────────

const COL_WIDTHS = [
  { wch: 5 },  // STT
  { wch: 10 }, // Mã NV
  { wch: 22 }, // Họ tên
  { wch: 9 },  // Số buổi
  { wch: 10 }, // Đơn giá
  { wch: 12 }, // Lương buổi
  { wch: 10 }, // Dạy thay
  { wch: 10 }, // KPI
  { wch: 10 }, // Phụ cấp
  { wch: 10 }, // Khác (+)
  { wch: 13 }, // GROSS
  { wch: 11 }, // BHXH
  { wch: 11 }, // BHYT
  { wch: 11 }, // BHTN
  { wch: 11 }, // TNCN
  { wch: 10 }, // Phạt
  { wch: 11 }, // Khấu trừ
  { wch: 13 }, // NET
]

// ─── Public generator ─────────────────────────────────────────────────────────

const POSITION_GROUPS: { key: string[]; label: string }[] = [
  { key: ['assistant'], label: 'Trợ giảng' },
  { key: ['teacher'], label: 'Giáo viên' },
  { key: ['office', 'admin'], label: 'Văn phòng' },
]

/**
 * Generate payroll Excel workbook as ArrayBuffer.
 * @param payslips - All payslips for the period
 * @param periodName - Used in file name suggestion (not embedded in file)
 */
export function generatePayrollExcel(
  payslips: PayslipWithEmployee[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _periodName: string
): ArrayBuffer {
  const workbook = XLSX.utils.book_new()

  for (const group of POSITION_GROUPS) {
    const filtered = payslips
      .filter((p) => group.key.includes(p.employee_position))
      .sort((a, b) => a.employee_code.localeCompare(b.employee_code))

    const data = buildSheetData(filtered)
    const sheet = XLSX.utils.aoa_to_sheet(data)
    sheet['!cols'] = COL_WIDTHS

    XLSX.utils.book_append_sheet(workbook, sheet, group.label)
  }

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
