'use client'

/**
 * Single class row in the payroll spreadsheet.
 * Shows class_code, sessions, rate (editable when editing), amount.
 */

import React, { memo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatVND } from '@/lib/utils/number-format'
import type { ClassBreakdownEntry } from '@/lib/types/database-payroll-types'

interface Props {
  entry: ClassBreakdownEntry
  index: number
  editing: boolean
  isLocked: boolean
  /** Number of trailing filler cols to align with spreadsheet header */
  fillerColSpan: number
  onEdit: (field: 'sessions' | 'rate', value: number) => void
  onReset: () => void
}

function PayrollClassRowInner({ entry, index, editing, isLocked, fillerColSpan, onEdit, onReset }: Props) {
  const canEdit = editing && !isLocked
  const amount = entry.sessions * entry.rate

  return (
    <tr className="border-b bg-muted/5 hover:bg-muted/10 text-xs">
      {/* # */}
      <td className="px-2 py-1 text-center text-muted-foreground border-r w-8">{index + 1}</td>
      {/* Empty — aligns with "Lớp" toggle column */}
      <td className="px-2 py-1 border-r" />
      {/* Class code + name: colSpan=2 to span "Mã NV" + "Họ tên" columns,
          so Sessions aligns under "Buổi" and Rate aligns under "Đơn giá" */}
      <td colSpan={2} className="px-2 py-1 border-r text-muted-foreground whitespace-nowrap">
        {entry.class_code}
        <span className="ml-1 text-muted-foreground/60">({entry.class_name})</span>
      </td>
      {/* Sessions */}
      <td className="px-1 py-1 border-r text-right" style={{ minWidth: 70 }}>
        {canEdit ? (
          <Input
            type="number"
            step="0.5"
            min={0}
            className="h-6 w-16 text-xs text-right px-1 border-0 shadow-none focus-visible:ring-1 ml-auto"
            value={entry.sessions}
            onChange={(e) => { const v = parseFloat(e.target.value); onEdit('sessions', isNaN(v) ? 0 : v) }}
          />
        ) : (
          entry.sessions
        )}
      </td>
      {/* Rate */}
      <td className="px-1 py-1 border-r text-right" style={{ minWidth: 90 }}>
        {canEdit ? (
          <Input
            type="number"
            step="1000"
            min={0}
            className="h-6 w-24 text-xs text-right px-1 border-0 shadow-none focus-visible:ring-1 ml-auto"
            value={entry.rate}
            onChange={(e) => { const v = parseFloat(e.target.value); onEdit('rate', isNaN(v) ? 0 : v) }}
          />
        ) : (
          formatVND(entry.rate)
        )}
      </td>
      {/* Amount */}
      <td className="px-2 py-1 border-r text-right font-medium">{formatVND(amount)}</td>
      {/* Reset button — always render td to keep column count stable (ISSUE-3 fix) */}
      <td className="px-1 py-1 border-r text-center">
        {canEdit && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            title="Đặt lại mặc định"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </td>
      {/* Trailing filler to align with spreadsheet header columns (ISSUE-2 fix) */}
      {fillerColSpan > 0 && <td colSpan={fillerColSpan} className="border-r" />}
    </tr>
  )
}

export const PayrollClassRow = memo(PayrollClassRowInner)
