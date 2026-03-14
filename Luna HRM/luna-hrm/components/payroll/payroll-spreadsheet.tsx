'use client'

/**
 * Spreadsheet-style payroll editor.
 * - Teaching staff: grouped per-class rows (sessions/rate editable) + summary row
 * - Office: single row per employee
 * - Editable summary columns: bhxh/bhyt/bhtn, tncn, gross, net, kpi, allowances, etc.
 * - Batch save via batchUpdatePayslips()
 * - Dirty state tracking → disable Re-init / Confirm / Export when unsaved
 * - "Mark all reviewed" shortcut
 * - Read-only mode when period is confirmed
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Save, CheckSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PayrollSpreadsheetRow, SPREADSHEET_COLUMNS } from './payroll-spreadsheet-row'
import { PayrollClassRow } from './payroll-class-row'
import { batchUpdatePayslips, markPayslipsReviewed } from '@/lib/actions/payroll-actions'
import { formatVND } from '@/lib/utils/number-format'
import type { PayslipWithEmployee } from '@/lib/actions/payroll-actions'
import type { EditablePayslipFields, ClassBreakdownEntry } from '@/lib/types/database-payroll-types'

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
  // Set of payslip IDs currently in class-edit mode
  const [editingClasses, setEditingClasses] = useState<Set<string>>(new Set())

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

  /** Toggle class-edit mode for a payslip, initialising the breakdown in edits */
  const handleToggleClassEdit = useCallback((payslipId: string, currentBreakdown: ClassBreakdownEntry[]) => {
    setEditingClasses((prev) => {
      const next = new Set(prev)
      if (next.has(payslipId)) {
        next.delete(payslipId)
      } else {
        next.add(payslipId)
        // Seed edits with a copy of current breakdown so edits are tracked
        setEdits((e) => {
          if (e.get(payslipId)?.class_breakdown) return e
          const n = new Map(e)
          const existing = n.get(payslipId) ?? {}
          n.set(payslipId, { ...existing, class_breakdown: currentBreakdown.map((c) => ({ ...c })) })
          return n
        })
      }
      return next
    })
  }, [])

  /** Edit a single class row field (sessions or rate) */
  const handleClassEntryEdit = useCallback(
    (payslipId: string, classIndex: number, field: 'sessions' | 'rate', value: number) => {
      setEdits((prev) => {
        const next = new Map(prev)
        const existing = next.get(payslipId) ?? {}
        // Require seeded breakdown from handleToggleClassEdit — never fall back to payslips.find() (ISSUE-4 fix)
        const baseBd = existing.class_breakdown
        if (!baseBd) return prev
        const updated = baseBd.map((c, i) => {
          if (i !== classIndex) return c
          const newEntry = { ...c, [field]: value, amount: field === 'sessions' ? value * c.rate : c.sessions * value }
          return newEntry
        })
        // Recalc totals from breakdown
        const totalSessions = updated.reduce((s, c) => s + c.sessions, 0)
        const totalTeachingPay = updated.reduce((s, c) => s + c.amount, 0)
        next.set(payslipId, {
          ...existing,
          class_breakdown: updated,
          sessions_worked: totalSessions,
          teaching_pay: totalTeachingPay,
        })
        return next
      })
      setSaveError(null)
    },
    []
  )

  /** Reset a class entry to defaults */
  const handleClassEntryReset = useCallback((payslipId: string, classIndex: number) => {
    setEdits((prev) => {
      const next = new Map(prev)
      const existing = next.get(payslipId) ?? {}
      // Require seeded breakdown from handleToggleClassEdit — never fall back to payslips.find() (ISSUE-4 fix)
      const baseBd = existing.class_breakdown
      if (!baseBd) return prev
      const updated = baseBd.map((c, i) => {
        if (i !== classIndex) return c
        return { ...c, sessions: c.default_sessions, rate: c.default_rate, amount: c.default_sessions * c.default_rate }
      })
      const totalSessions = updated.reduce((s, c) => s + c.sessions, 0)
      const totalTeachingPay = updated.reduce((s, c) => s + c.amount, 0)
      next.set(payslipId, {
        ...existing,
        class_breakdown: updated,
        sessions_worked: totalSessions,
        teaching_pay: totalTeachingPay,
      })
      return next
    })
  }, [])

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
    setEditingClasses(new Set())
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

  const isTeachingTab = tab === 'teacher' || tab === 'assistant'
  const unreviewedCount = payslips.filter((p) => !p.is_reviewed).length
  // +1 for # col, +1 for Lớp col (teaching tabs), - cols rendered in class row (5: #, name, class, sessions, rate, amount, reset = 7 total rendered)
  // class row renders 7 tds; total cols = 1(#) + 1(Lớp) + visibleColumns.length
  // class row has: 1(#) + 1(name) + 1(class) + 1(sessions) + 1(rate) + 1(amount) + 1(reset) = 7
  // trailing filler = total - 7
  const classRowFillerCols = Math.max(0, 1 + 1 + visibleColumns.length - 7) // 2 fixed + visible - 7 rendered

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
              {isTeachingTab && (
                <th className="px-2 py-2 border-r border-b text-xs text-left text-muted-foreground" style={{ minWidth: 90 }}>Lớp</th>
              )}
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
            {payslips.map((payslip, idx) => {
              const payslipEdits = edits.get(payslip.id) ?? EMPTY_EDITS
              const isEditing = editingClasses.has(payslip.id)
              const breakdown = payslipEdits.class_breakdown ?? payslip.class_breakdown ?? []
              const hasBreakdown = isTeachingTab && breakdown.length > 0

              return (
                <React.Fragment key={payslip.id}>
                  {/* Per-class rows for teaching staff */}
                  {hasBreakdown && breakdown.map((cls, clsIdx) => (
                    <PayrollClassRow
                      key={`${payslip.id}-cls-${clsIdx}`}
                      entry={cls}
                      index={clsIdx}
                      editing={isEditing}
                      isLocked={isLocked}
                      fillerColSpan={classRowFillerCols}
                      onEdit={(field, val) => handleClassEntryEdit(payslip.id, clsIdx, field, val)}
                      onReset={() => handleClassEntryReset(payslip.id, clsIdx)}
                    />
                  ))}

                  {/* Summary row */}
                  <PayrollSpreadsheetRow
                    key={payslip.id}
                    idx={idx}
                    payslip={payslip}
                    tab={tab}
                    edits={payslipEdits}
                    isLocked={isLocked}
                    isTeachingTab={isTeachingTab}
                    isEditingClasses={isEditing}
                    hasBreakdown={hasBreakdown}
                    onFieldChange={handleFieldChange}
                    onToggleClassEdit={() => handleToggleClassEdit(payslip.id, breakdown)}
                  />
                </React.Fragment>
              )
            })}
          </tbody>
          {/* Footer totals */}
          <tfoot className="sticky bottom-0 bg-muted/80">
            <tr className="text-xs font-semibold border-t-2">
              <td className="px-2 py-1.5 border-r text-center">{payslips.length}</td>
              {isTeachingTab && <td className="px-2 py-1.5 border-r" />}
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
