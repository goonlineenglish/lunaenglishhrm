'use client'

/**
 * Dialog for bulk importing class schedules from .xlsx file.
 * Shows parse preview with valid/error rows before committing import.
 */

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { parseScheduleExcel, type ParseResult, type ParsedSchedule } from '@/lib/utils/excel-schedule-parser'
import { batchImportClassSchedules } from '@/lib/actions/class-schedule-actions'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: string
  onImported: () => void
}

// ─── Valid rows table ─────────────────────────────────────────────────────────

function ValidTable({ rows }: { rows: ParsedSchedule[] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-auto max-h-48 text-xs border rounded">
      <table className="w-full">
        <thead className="bg-muted sticky top-0">
          <tr>
            {['Mã lớp', 'Tên lớp', 'Ca học', 'Ngày học', 'Mã GV', 'Mã TG'].map((h) => (
              <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-green-100 bg-green-50/40">
              <td className="px-2 py-1 font-mono">{r.class_code}</td>
              <td className="px-2 py-1">{r.class_name}</td>
              <td className="px-2 py-1">{r.shift_time}</td>
              <td className="px-2 py-1">{r.days_of_week.join(', ')}</td>
              <td className="px-2 py-1 font-mono">{r.teacher_code}</td>
              <td className="px-2 py-1 font-mono">{r.assistant_code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MAX_FILE_SIZE_MB = 2
const MAX_ROWS = 500

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function ExcelImportDialog({ open, onOpenChange, branchId, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<{ class_code: string; message: string }[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function reset() {
    setParseResult(null)
    setImportErrors([])
    setSuccessMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose(val: boolean) {
    if (!importing) { reset(); onOpenChange(val) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    reset()

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setImportErrors([{ class_code: '', message: `File vượt quá ${MAX_FILE_SIZE_MB}MB.` }])
      return
    }

    const buf = await file.arrayBuffer()
    const result = parseScheduleExcel(buf)

    if (result.valid.length > MAX_ROWS) {
      setImportErrors([{ class_code: '', message: `Tối đa ${MAX_ROWS} lớp mỗi lần nhập.` }])
      return
    }

    setParseResult(result)
  }

  async function handleImport() {
    if (!parseResult || parseResult.valid.length === 0) return
    setImporting(true)
    setImportErrors([])
    setSuccessMsg(null)

    const result = await batchImportClassSchedules(parseResult.valid, branchId)
    setImporting(false)

    if (result.errors.length > 0) setImportErrors(result.errors)
    if (result.imported_count > 0) {
      setSuccessMsg(`Đã nhập ${result.imported_count} lớp thành công.`)
      onImported()
    }
  }

  const validCount = parseResult?.valid.length ?? 0
  const parseErrors = parseResult?.errors ?? []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Nhập lịch lớp từ Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Cột Excel: <span className="font-mono text-xs">Mã lớp | Tên lớp | Ca học | Ngày học (T2,T4,T6) | Mã GV | Mã TG</span>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground cursor-pointer"
            />
          </div>

          {/* Success */}
          {successMsg && (
            <Alert className="border-green-300 bg-green-50 text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm">{successMsg}</p>
            </Alert>
          )}

          {/* Valid rows preview */}
          {validCount > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-700">{validCount} lớp hợp lệ:</p>
              <ValidTable rows={parseResult!.valid} />
            </div>
          )}

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {parseErrors.length} dòng lỗi định dạng:
              </p>
              <ul className="text-xs text-destructive space-y-0.5 max-h-28 overflow-auto border rounded p-2">
                {parseErrors.map((e, i) => (
                  <li key={i}>Dòng {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Import errors (server-side) */}
          {importErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Lỗi khi nhập:</p>
              <ul className="text-xs text-destructive space-y-0.5 max-h-28 overflow-auto border rounded p-2">
                {importErrors.map((e, i) => (
                  <li key={i}>{e.class_code ? `[${e.class_code}] ` : ''}{e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Hủy
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            <Upload className="h-4 w-4 mr-1" />
            {importing ? 'Đang nhập...' : `Nhập ${validCount} lớp`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
