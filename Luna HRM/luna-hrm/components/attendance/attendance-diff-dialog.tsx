'use client'

/**
 * Diff dialog — shows changed cells before save.
 * Format: "E02 T3: 1→KP", "E04 T5: 1→0"
 */

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { getDayName } from '@/lib/utils/date-helpers'
import type { AttendanceStatus } from '@/lib/types/database'

export interface DiffItem {
  employeeCode: string
  employeeName: string
  day: number
  oldStatus: AttendanceStatus | null
  newStatus: AttendanceStatus
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  diffs: DiffItem[]
  saving: boolean
  onConfirm: () => void
}

export function AttendanceDiffDialog({ open, onOpenChange, diffs, saving, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận thay đổi ({diffs.length})</DialogTitle>
        </DialogHeader>
        <div className="max-h-60 overflow-auto space-y-1 py-2">
          {diffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có thay đổi nào.</p>
          ) : (
            diffs.map((d, i) => (
              <div key={i} className="text-sm flex justify-between px-2 py-1 rounded hover:bg-muted">
                <span className="font-medium">{d.employeeCode} — {getDayName(d.day)}</span>
                <span>
                  <span className="text-muted-foreground">{d.oldStatus ?? '—'}</span>
                  <span className="mx-1">→</span>
                  <span className="font-medium">{d.newStatus}</span>
                </span>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Hủy</Button>
          <Button onClick={onConfirm} disabled={saving || diffs.length === 0}>
            {saving ? 'Đang lưu...' : `Lưu ${diffs.length} thay đổi`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
