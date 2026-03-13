'use client'

/**
 * Button to export payroll period data as .xlsx file.
 * Triggers browser download via Blob URL.
 */

import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generatePayrollExcel } from '@/lib/utils/excel-payroll-export'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-payslip-actions'

interface Props {
  payslips: PayslipWithEmployee[]
  periodName: string  // e.g. "T3/2026"
  disabled?: boolean
}

export function ExcelExportButton({ payslips, periodName, disabled }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (payslips.length === 0 || loading) return
    setLoading(true)

    try {
      const buffer = generatePayrollExcel(payslips, periodName)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bang-luong-${periodName.replace('/', '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[ExcelExportButton]', err)
      alert('Lỗi xuất file Excel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={disabled || loading || payslips.length === 0}
    >
      <FileSpreadsheet className="h-4 w-4 mr-1" />
      {loading ? 'Đang xuất...' : 'Xuất Excel'}
    </Button>
  )
}
