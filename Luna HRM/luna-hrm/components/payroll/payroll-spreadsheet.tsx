'use client'

/**
 * Spreadsheet-style payroll editor.
 * - Read-only columns: auto-calculated (sessions, rate, teaching_pay, etc.)
 * - Editable columns: bhxh/bhyt/bhtn, tncn, gross, net, kpi, allowances, etc.
 * - Batch save via batchUpdatePayslips()
 * - Dirty state tracking → disable Re-init / Confirm / Export when unsaved
 * - "Mark all reviewed" shortcut
 * - Read-only mode when period is confirmed
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Save, CheckSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PayrollSpreadsheetRow, SPREADSHEET_COLUMNS } from './payroll-spreadsheet-row'
import { batchUpdatePayslips, markPayslipsReviewed } from '@/lib/actions/payroll-actions'
import { formatVND } from '@/lib/utils/number-format'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-actions'
import type { EditablePayslipFields } from '@/lib/types/database-payroll-types'

type TabType = 'assistant' | 'teacher' | 'office'

/** Stable reference to avoid memo defeat on rows with no edits (ISSUE-7) */
const EMPTY_EDITS: Partial<EditablePayslipFields> = {}

interface Props {
  payslips: PayslipWithEmployee[]
  tab: TabType
  periodId: string
  periodStatus: string
  onSaved: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export function PayrollSpreadsheet({ payslips, tab, periodId, periodStatus, onSaved, onDirtyChange }: Props) {
  // Map<payslipId, {field: value}> — only stores changed fields
  const [edits, setEdits] = useState<Map<string, Partial<EditablePayslipFields>>>(new Map())
  const [saving, setSaving] = useState(false)
  const [markingReviewed, setMarkingReviewed] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const isLocked = periodStatus !== 'draft'
  const isDirty = edits.size > 0

  // Stable ref for onDirtyChange to avoid infinite-loop hazard (ISSUE-10)
  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange

  // Notify parent about dirty state changes
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty)
  }, [isDirty])

  const handleFieldChange = useCallback(
    (payslipId: string, field: keyof EditablePayslipFields, value: number | string | null) => {
      setEdits((prev) => {
        const next = new Map(prev)
        const existing = next.get(payslipId) ?? {}
        next.set(payslipId, { ...existing, [field]: value })
        return next
      })
      setSaveError(null)
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (edits.size === 0) return
    setSaving(true)
    setSaveError(null)

    const items = Array.from(edits.entries()).map(([payslip_id, fields]) => ({ payslip_id, fields }))
    const result = await batchUpdatePayslips(periodId, items)

    setSaving(false)
    if (!result.success) {
      setSaveError(result.error ?? 'Không thể lưu.')
      return
    }

    setEdits(new Map())
    setLastSaved(new Date().toLocaleTimeString('vi-VN'))
    onSaved()
  }, [edits, periodId, onSaved])

  const handleMarkAllReviewed = useCallback(async () => {
    const unreviewed = payslips.filter((p) => !p.is_reviewed).map((p) => p.id)
    if (unreviewed.length === 0) return
    setMarkingReviewed(true)
    const result = await markPayslipsReviewed(periodId, unreviewed)
    setMarkingReviewed(false)
    if (result.success) onSaved()
  }, [payslips, periodId, onSaved])

  const visibleColumns = SPREADSHEET_COLUMNS.filter(
    (col) => !col.showFor || col.showFor.includes(tab)
  )

  const unreviewedCount = payslips.filter((p) => !p.is_reviewed).length
  // Footer totals: merge unsaved edits into sum (ISSUE-9)
  const totalGross = payslips.reduce((s, p) => {
    const edit = edits.get(p.id)
    return s + (edit?.gross_pay ?? p.gross_pay ?? 0)
  }, 0)
  const totalNet = payslips.reduce((s, p) => {
    const edit = edits.get(p.id)
    return s + (edit?.net_pay ?? p.net_pay ?? 0)
  }, 0)

  if (payslips.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-md text-sm">
        Chưa có phiếu lương. Bấm <strong>Khởi tạo lương</strong> để tạo.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!isLocked && (
        <div className="flex items-center gap-2 flex-wrap">
          {isDirty && (
            <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">
              {edits.size} hàng chưa lưu
            </Badge>
          )}
          {lastSaved && !isDirty && (
            <span className="text-xs text-muted-foreground">Đã lưu lúc {lastSaved}</span>
          )}
          {saveError && <span className="text-xs text-destructive">{saveError}</span>}

          <div className="ml-auto flex items-center gap-2">
            {unreviewedCount > 0 && !isDirty && (
              <Button size="sm" variant="outline" onClick={handleMarkAllReviewed} disabled={markingReviewed} className="h-7 text-xs">
                {markingReviewed ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
                Duyệt tất cả ({unreviewedCount})
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="h-7 text-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      {/* Spreadsheet table */}
      <div className="overflow-auto rounded-md border max-h-[calc(100vh-320px)]">
        <table className="text-sm border-collapse" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="px-2 py-2 border-r border-b text-center text-xs w-8">#</th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 border-r border-b text-xs font-semibold whitespace-nowrap ${
                    col.editable ? 'text-right' : col.numeric ? 'text-right text-muted-foreground' : 'text-left text-muted-foreground'
                  }`}
                  style={{ minWidth: col.minWidth }}
                >
                  {col.label}
                  {col.editable && !isLocked && (
                    <span className="ml-0.5 text-amber-500 text-[9px]">✎</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payslips.map((payslip, idx) => (
              <PayrollSpreadsheetRow
                key={payslip.id}
                idx={idx}
                payslip={payslip}
                tab={tab}
                edits={edits.get(payslip.id) ?? EMPTY_EDITS}
                isLocked={isLocked}
                onFieldChange={handleFieldChange}
              />
            ))}
          </tbody>
          {/* Footer totals */}
          <tfoot className="sticky bottom-0 bg-muted/80">
            <tr className="text-xs font-semibold border-t-2">
              <td className="px-2 py-1.5 border-r text-center">{payslips.length}</td>
              {visibleColumns.map((col) => {
                if (col.key === 'employee_code') return (
                  <td key={col.key} className="px-2 py-1.5 border-r" colSpan={2}>Tổng cộng</td>
                )
                if (col.key === 'employee_name') return null
                if (col.key === 'gross_pay') return (
                  <td key={col.key} className="px-2 py-1.5 border-r text-right">{formatVND(totalGross)}</td>
                )
                if (col.key === 'net_pay') return (
                  <td key={col.key} className="px-2 py-1.5 border-r text-right text-primary">{formatVND(totalNet)}</td>
                )
                return <td key={col.key} className="px-2 py-1.5 border-r" />
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Review progress */}
      {!isLocked && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className={unreviewedCount === 0 ? 'text-green-600 font-medium' : ''}>
            {unreviewedCount === 0 ? '✓ Tất cả đã kiểm tra' : `${payslips.length - unreviewedCount}/${payslips.length} đã kiểm tra`}
          </span>
          {unreviewedCount > 0 && (
            <span>— Cần kiểm tra hết mới có thể Duyệt kỳ lương</span>
          )}
        </div>
      )}
    </div>
  )
}
