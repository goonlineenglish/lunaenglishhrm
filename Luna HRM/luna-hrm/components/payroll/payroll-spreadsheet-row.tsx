'use client'

/**
 * Single row of the payroll spreadsheet.
 * Read-only cells: bg-muted, formatted number.
 * Editable cells: white bg, number input, dirty = amber left border.
 * Notes column: icon button → inline popover.
 */

import React, { memo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatVND } from '@/lib/utils/number-format'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-actions'
import type { EditablePayslipFields } from '@/lib/types/database-payroll-types'

export interface SpreadsheetColumn {
  key: keyof PayslipWithEmployee | 'extra_notes'
  label: string
  editable: boolean
  numeric: boolean
  minWidth?: number
  showFor?: ('assistant' | 'teacher' | 'office')[] // undefined = always show
}

export const SPREADSHEET_COLUMNS: SpreadsheetColumn[] = [
  { key: 'employee_code',       label: 'Mã NV',       editable: false, numeric: false, minWidth: 80 },
  { key: 'employee_name',       label: 'Họ tên',       editable: false, numeric: false, minWidth: 130 },
  { key: 'sessions_worked',     label: 'Buổi',         editable: false, numeric: true,  minWidth: 60 },
  { key: 'rate_per_session',    label: 'Đơn giá',      editable: false, numeric: true,  minWidth: 90 },
  { key: 'teaching_pay',        label: 'Lương buổi',   editable: false, numeric: true,  minWidth: 100 },
  { key: 'substitute_sessions', label: 'Buổi thay',    editable: false, numeric: true,  minWidth: 80 },
  { key: 'substitute_pay',      label: 'Tiền thay',    editable: false, numeric: true,  minWidth: 90 },
  { key: 'kpi_bonus',           label: 'KPI',          editable: true,  numeric: true,  minWidth: 90, showFor: ['assistant'] },
  { key: 'allowances',          label: 'Phụ cấp',      editable: true,  numeric: true,  minWidth: 90 },
  { key: 'other_pay',           label: 'Khác (+)',     editable: true,  numeric: true,  minWidth: 90 },
  { key: 'deductions',          label: 'Khấu trừ',     editable: true,  numeric: true,  minWidth: 90 },
  { key: 'penalties',           label: 'Phạt',         editable: true,  numeric: true,  minWidth: 80 },
  { key: 'bhxh',                label: 'BHXH',         editable: true,  numeric: true,  minWidth: 90 },
  { key: 'bhyt',                label: 'BHYT',         editable: true,  numeric: true,  minWidth: 80 },
  { key: 'bhtn',                label: 'BHTN',         editable: true,  numeric: true,  minWidth: 80 },
  { key: 'tncn',                label: 'TNCN',         editable: true,  numeric: true,  minWidth: 90 },
  { key: 'gross_pay',           label: 'GROSS',        editable: true,  numeric: true,  minWidth: 110 },
  { key: 'net_pay',             label: 'NET',          editable: true,  numeric: true,  minWidth: 110 },
  { key: 'extra_notes',         label: 'Ghi chú',      editable: true,  numeric: false, minWidth: 70 },
]

interface Props {
  idx: number
  payslip: PayslipWithEmployee
  tab: 'assistant' | 'teacher' | 'office'
  edits: Partial<EditablePayslipFields>
  isLocked: boolean
  onFieldChange: (payslipId: string, field: keyof EditablePayslipFields, value: number | string | null) => void
}

function PayrollSpreadsheetRowInner({ idx, payslip, tab, edits, isLocked, onFieldChange }: Props) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  const visibleColumns = SPREADSHEET_COLUMNS.filter(
    (col) => !col.showFor || col.showFor.includes(tab)
  )

  function currentValue(col: SpreadsheetColumn): number | string | null {
    if (col.key in edits) return (edits as Record<string, unknown>)[col.key] as number | string | null
    return (payslip as unknown as Record<string, unknown>)[col.key] as number | string | null
  }

  function isDirty(col: SpreadsheetColumn) {
    return col.editable && col.key in edits
  }

  return (
    <tr className="border-b hover:bg-muted/20 transition-colors">
      {/* Row number */}
      <td className="px-2 py-1 text-center text-xs text-muted-foreground border-r w-8 shrink-0">{idx + 1}</td>

      {visibleColumns.map((col) => {
        const val = currentValue(col)
        const dirty = isDirty(col)

        // Notes column — icon button opens dialog
        if (col.key === 'extra_notes') {
          const noteVal = (val as string | null) ?? ''
          return (
            <td key={col.key} className="px-1 py-1 border-r text-center" style={{ minWidth: col.minWidth }}>
              <Button
                size="icon"
                variant={noteVal ? 'default' : 'ghost'}
                className={cn('h-6 w-6', dirty && 'ring-1 ring-amber-400')}
                disabled={isLocked}
                title={noteVal || 'Thêm ghi chú'}
                onClick={() => { setNotesValue(noteVal); setNotesOpen(true) }}
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Ghi chú — {payslip.employee_name}</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    className="text-sm min-h-[100px] resize-none"
                    placeholder="Ghi chú..."
                    value={notesValue}
                    disabled={isLocked}
                    onChange={(e) => setNotesValue(e.target.value)}
                  />
                  {!isLocked && (
                    <Button size="sm" onClick={() => {
                      onFieldChange(payslip.id, 'extra_notes', notesValue || null)
                      setNotesOpen(false)
                    }}>Lưu ghi chú</Button>
                  )}
                </DialogContent>
              </Dialog>
            </td>
          )
        }

        // Read-only cell
        if (!col.editable) {
          return (
            <td
              key={col.key}
              className="px-2 py-1 border-r bg-muted/30 text-right text-xs text-muted-foreground"
              style={{ minWidth: col.minWidth }}
            >
              {col.numeric ? formatVND(Number(val ?? 0)) : String(val ?? '')}
            </td>
          )
        }

        // Editable numeric cell
        return (
          <td
            key={col.key}
            className={cn('px-1 py-1 border-r', dirty && 'border-l-2 border-l-amber-400')}
            style={{ minWidth: col.minWidth }}
          >
            <Input
              type="number"
              step="any"
              min={0}
              className="h-7 text-xs text-right px-1 border-0 shadow-none focus-visible:ring-1"
              value={String(val ?? 0)}
              disabled={isLocked}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value)
                onFieldChange(payslip.id, col.key as keyof EditablePayslipFields, isNaN(parsed) ? 0 : parsed)
              }}
            />
          </td>
        )
      })}
    </tr>
  )
}

export const PayrollSpreadsheetRow = memo(PayrollSpreadsheetRowInner)
